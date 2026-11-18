import {
	USER_AVATAR_IMAGE_SIZE,
	USER_AVATAR_MAX_FILE_SIZE_BYTES,
	type AvatarUpdateRequestDto,
	type UserAvatarBackground,
	type UserAvatarMimeType,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import {
	PersonRepository,
	type StoredUserAvatarImage,
	type User,
	type UserAvatarRecord,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { UserAvatarStore } from './user-avatar-store';
import {
	defaultBackgroundFor,
	imageDimensions,
	isAllowedAvatarMimeType,
	isAnimatedImage,
	storedAvatarImages,
} from './user-avatar.utils';

const SSO_PICTURE_TIMEOUT_MS = 5_000;
/**
 * Identity providers serve pictures at a size of their choosing, mostly small
 * thumbnails, so they get more room than uploads; this only keeps out the
 * absurd, which the byte cap alone cannot.
 */
const SSO_PICTURE_MAX_IMAGE_SIZE = 2048;

type AvatarUser = Pick<User, 'id' | 'avatar'>;

/**
 * Keeps `user.avatar` and the stored picture bytes in step. Every mutation
 * returns the new record so callers can hand the updated user back to the
 * client without a second read.
 */
@Service()
export class UserAvatarService {
	constructor(
		private readonly store: UserAvatarStore,
		private readonly personRepository: PersonRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	get uploadsEnabled() {
		return !this.globalConfig.userManagement.avatarUploadsDisabled;
	}

	/**
	 * Replaces the user's uploaded picture and makes it the shown one. The
	 * declared content type is ignored; the bytes decide.
	 */
	async upload(
		user: AvatarUser,
		data: Buffer,
		background?: UserAvatarBackground,
	): Promise<UserAvatarRecord> {
		if (!this.uploadsEnabled) {
			throw new ForbiddenError('Custom profile pictures are disabled on this instance');
		}

		const mimeType = await this.sniffImage(data, USER_AVATAR_IMAGE_SIZE);
		const image = await this.store.write(user.id, 'upload', data, mimeType);
		const previous = user.avatar?.upload;

		const current = this.recordFor(user);
		const record = await this.save(user, {
			...current,
			source: 'upload',
			upload: image,
			background: background ?? current.background,
		});

		if (previous) await this.deleteQuietly([previous]);
		return record;
	}

	/** Switches the shown picture, saves a generated avatar, or changes the backdrop. */
	async update(user: AvatarUser, payload: AvatarUpdateRequestDto): Promise<UserAvatarRecord> {
		const { source, background, generated } = payload;
		if (!source && !background && !generated) {
			throw new BadRequestError('Set at least one of source, background or generated');
		}

		const record = this.recordFor(user);
		if (generated) {
			record.generated = generated;
			// Saving a design means wanting to see it, unless the request says otherwise.
			record.source = source ?? 'generated';
		}
		if (background) record.background = background;
		if (source) record.source = source;

		if (record.source === 'upload' && !record.upload) {
			throw new BadRequestError('You have not uploaded a picture');
		}
		if (record.source === 'sso' && !record.sso) {
			throw new BadRequestError('Your identity provider has not supplied a picture');
		}
		if (record.source === 'generated' && !record.generated) {
			throw new BadRequestError('You have not saved a generated avatar');
		}

		return await this.save(user, record);
	}

	/**
	 * Forgets one of the user's own pictures. The picture from the identity
	 * provider can't be removed here; it is refreshed on every sign-in. When the
	 * removed picture was the shown one, another picture the user still has
	 * takes over (the provider's first), or the name-based default when there
	 * is none.
	 */
	async remove(user: AvatarUser, kind: 'upload' | 'generated'): Promise<UserAvatarRecord | null> {
		const current = user.avatar;
		if (!current?.[kind]) {
			throw new NotFoundError(
				kind === 'upload' ? 'You have no uploaded picture' : 'You have no generated avatar',
			);
		}

		const { [kind]: removed, ...rest } = current;
		let record: UserAvatarRecord | null = rest;
		if (record.source === kind) {
			const fallback = (['sso', 'upload', 'generated'] as const).find((other) => !!record?.[other]);
			record = fallback ? { ...record, source: fallback } : null;
		}
		if (record && !record.upload && !record.sso && !record.generated) record = null;

		await this.personRepository.saveAvatar(user.id, record);
		if (kind === 'upload') await this.deleteQuietly([removed as StoredUserAvatarImage]);
		return record;
	}

	/**
	 * Stores the picture an identity provider supplied at sign-in. Never throws:
	 * a picture that can't be fetched must not stop the sign-in. The picture
	 * becomes the shown one only when the user hasn't chosen another.
	 */
	async syncSsoPicture(
		user: AvatarUser,
		pictureUrl: unknown,
		options: {
			allowHostname?: string;
			/** Host of the identity provider, shown to the user as where the picture is from. */
			provider?: string;
		} = {},
	): Promise<void> {
		if (typeof pictureUrl !== 'string' || pictureUrl === '') return;
		if (user.avatar?.sso?.sourceUrl === pictureUrl) return;

		let url: URL;
		try {
			url = new URL(pictureUrl);
		} catch {
			this.logger.debug('Ignoring SSO picture with an invalid URL', { userId: user.id });
			return;
		}
		if (url.protocol !== 'https:') {
			this.logger.debug('Ignoring SSO picture that is not served over https', { userId: user.id });
			return;
		}

		try {
			const data = await this.fetchPicture(url, options.allowHostname);
			const mimeType = await this.sniffImage(data, SSO_PICTURE_MAX_IMAGE_SIZE);
			const image = await this.store.write(user.id, 'sso', data, mimeType);
			const previous = user.avatar?.sso;

			const record = this.recordFor(user);
			record.sso = {
				...image,
				sourceUrl: pictureUrl,
				syncedAt: new Date().toISOString(),
				...(options.provider ? { provider: options.provider } : {}),
			};
			if (!user.avatar) record.source = 'sso';

			await this.save(user, record);
			if (previous) await this.deleteQuietly([previous]);
		} catch (error) {
			this.logger.warn('Failed to store the profile picture supplied by the identity provider', {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Removes every stored picture of a user, for account deletion. */
	async deleteAll(user: AvatarUser): Promise<void> {
		await this.deleteQuietly(storedAvatarImages(user.avatar));
	}

	private recordFor(user: AvatarUser): UserAvatarRecord {
		return (
			structuredClone(user.avatar) ?? {
				source: 'generated',
				background: defaultBackgroundFor(user.id),
			}
		);
	}

	private async save(user: AvatarUser, record: UserAvatarRecord) {
		await this.personRepository.saveAvatar(user.id, record);
		user.avatar = record;
		return record;
	}

	private async deleteQuietly(images: StoredUserAvatarImage[]) {
		try {
			await this.store.delete(images);
		} catch (error) {
			this.logger.warn('Failed to delete a stored profile picture', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Checks the bytes are a still picture within the byte and pixel limits,
	 * and says what they are. The declared content type never enters into it.
	 */
	private async sniffImage(data: Buffer, maxImageSize: number): Promise<UserAvatarMimeType> {
		if (data.length === 0) throw new BadRequestError('The picture is empty');
		if (data.length > USER_AVATAR_MAX_FILE_SIZE_BYTES) {
			throw new BadRequestError(
				`Pictures must be ${USER_AVATAR_MAX_FILE_SIZE_BYTES / 1024 / 1024} MB or smaller`,
			);
		}

		const { fileTypeFromBuffer } = await import('file-type');
		const sniffed = await fileTypeFromBuffer(data);
		// `file-type` tells APNG apart from PNG; animated WebP it does not, hence the second check.
		if (sniffed?.mime === 'image/apng' || sniffed?.mime === 'image/gif') {
			throw new BadRequestError('Animated pictures are not supported');
		}
		if (!sniffed || !isAllowedAvatarMimeType(sniffed.mime)) {
			throw new BadRequestError('Pictures must be JPEG, PNG, or WebP');
		}
		if (isAnimatedImage(data, sniffed.mime)) {
			throw new BadRequestError('Animated pictures are not supported');
		}

		const dimensions = imageDimensions(data, sniffed.mime);
		if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
			throw new BadRequestError('The picture could not be read');
		}
		if (dimensions.width > maxImageSize || dimensions.height > maxImageSize) {
			throw new BadRequestError(`Pictures must be ${maxImageSize} pixels or smaller on each side`);
		}
		return sniffed.mime;
	}

	/**
	 * Picture URLs come from the identity provider's claims, which n8n doesn't
	 * control, so the default SSRF policy applies. The provider's own hostname
	 * is exempt: an admin pointed n8n at it on purpose, and it may be internal.
	 */
	private async fetchPicture(url: URL, allowHostname?: string): Promise<Buffer> {
		const client = this.outboundHttp.requests({
			useDefaultSsrfPolicy: allowHostname && url.hostname === allowHostname ? 'unsafe' : 'safe',
		});
		const response = await client.request<Buffer>({
			method: 'GET',
			url: url.href,
			encoding: 'arraybuffer',
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			timeout: SSO_PICTURE_TIMEOUT_MS,
			abortSignal: AbortSignal.timeout(SSO_PICTURE_TIMEOUT_MS),
		});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw new Error(`Picture download failed with status ${response.statusCode}`);
		}
		return Buffer.from(response.body);
	}
}
