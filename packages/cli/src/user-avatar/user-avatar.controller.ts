import {
	AvatarUpdateRequestDto,
	userAvatarBackgroundSchema,
	type UserAvatarBackground,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import type { PublicUser } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Param, Patch, Put, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';

import { UserService } from '@/services/user.service';

import { UserAvatarService } from './user-avatar.service';
import {
	describeAvatarUploadError,
	UserAvatarUploadMiddleware,
	type RequestWithAvatarFile,
} from './user-avatar-upload.middleware';

const uploadMiddleware = Container.get(UserAvatarUploadMiddleware);

/** The signed-in user's profile picture. Reading pictures lives on `/users/:id/avatar`. */
@RestController('/me/avatar')
export class UserAvatarController {
	constructor(
		private readonly avatarService: UserAvatarService,
		private readonly userService: UserService,
		private readonly eventService: EventService,
	) {}

	/**
	 * Uploads a picture (multipart field `picture`) and makes it the shown one.
	 * An optional `background` field sets the backdrop in the same request, so
	 * a transparent picture never shows up on the wrong color in between.
	 */
	@Put('/', { middlewares: [uploadMiddleware.single('picture')] })
	async upload(req: AuthenticatedRequest & RequestWithAvatarFile): Promise<PublicUser> {
		if (req.fileUploadError)
			throw new BadRequestError(describeAvatarUploadError(req.fileUploadError));
		if (!req.file) throw new BadRequestError('Upload a picture in the "picture" field');

		const body = (req.body ?? {}) as Record<string, unknown>;
		let background: UserAvatarBackground | undefined;
		if (body.background !== undefined) {
			const parsed = userAvatarBackgroundSchema.safeParse(body.background);
			if (!parsed.success) throw new BadRequestError('Unknown backdrop');
			background = parsed.data;
		}

		await this.avatarService.upload(req.user, req.file.buffer, background);
		return await this.respondWithUser(req.user.id);
	}

	/** Switches the shown picture, saves a generated avatar, or changes the backdrop. */
	@Patch('/')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AvatarUpdateRequestDto,
	): Promise<PublicUser> {
		await this.avatarService.update(req.user, payload);
		return await this.respondWithUser(req.user.id);
	}

	/** Forgets the uploaded picture or the generated avatar. */
	@Delete('/:kind')
	async remove(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('kind') kind: string,
	): Promise<PublicUser> {
		if (kind !== 'upload' && kind !== 'generated') {
			throw new BadRequestError('Only the uploaded picture or the generated avatar can be removed');
		}

		await this.avatarService.remove(req.user, kind);
		return await this.respondWithUser(req.user.id);
	}

	private async respondWithUser(userId: string): Promise<PublicUser> {
		const user = await this.userService.findUserWithAuthIdentities(userId);
		this.eventService.emit('user-updated', { user, fieldsChanged: ['avatar'] });
		return await this.userService.toPublic(user);
	}
}
