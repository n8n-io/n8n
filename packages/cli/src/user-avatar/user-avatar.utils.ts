import {
	USER_AVATAR_BACKGROUNDS,
	USER_AVATAR_MIME_TYPES,
	type UserAvatar,
	type UserAvatarBackground,
	type UserAvatarMimeType,
} from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { StoredUserAvatarImage, User, UserAvatarRecord } from '@n8n/db';
import path from 'node:path';

type UrlConfig = Pick<GlobalConfig, 'path' | 'endpoints'>;

/**
 * Root-relative path of the REST API, honoring `N8N_PATH` and
 * `N8N_ENDPOINT_REST`. Picture URLs are built on it so they resolve against
 * whatever origin the editor is served from, without the server having to
 * know that origin.
 */
export function restBasePath({ path: deployPath, endpoints }: UrlConfig) {
	return path.posix.join('/', deployPath, endpoints.rest);
}

/** URL of a stored picture, with its content hash as cache buster. */
export function avatarImageUrl(
	config: UrlConfig,
	userId: string,
	kind: 'upload' | 'sso',
	image: StoredUserAvatarImage,
) {
	return `${restBasePath(config)}/users/${encodeURIComponent(userId)}/avatar/${kind}?v=${image.hash}`;
}

/**
 * The client-facing view of a user's picture: storage details are replaced
 * with URLs. Returns `undefined` for users without a picture so the field is
 * omitted from the JSON and clients draw the name-based default.
 */
export function toPublicAvatar(
	config: UrlConfig,
	user: Pick<User, 'id' | 'avatar'>,
): UserAvatar | undefined {
	const record = user.avatar;
	if (!record) return undefined;

	return {
		source: record.source,
		background: record.background,
		upload: record.upload
			? { url: avatarImageUrl(config, user.id, 'upload', record.upload) }
			: undefined,
		sso: record.sso
			? {
					url: avatarImageUrl(config, user.id, 'sso', record.sso),
					...(record.sso.provider ? { provider: record.sso.provider } : {}),
				}
			: undefined,
		generated: record.generated,
	};
}

/** Every stored picture on a record, for cleanup. */
export function storedAvatarImages(record: UserAvatarRecord | null | undefined) {
	if (!record) return [];
	return [record.upload, record.sso].filter((image): image is StoredUserAvatarImage => !!image);
}

/**
 * Picks the backdrop for a user's first picture. Spreading users across the
 * on-brand backdrops keeps a members list varied, and deriving the pick from
 * the user id keeps it stable across re-uploads.
 */
export function defaultBackgroundFor(userId: string): UserAvatarBackground {
	let hash = 0;
	for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return USER_AVATAR_BACKGROUNDS[hash % USER_AVATAR_BACKGROUNDS.length];
}

export function isAllowedAvatarMimeType(mimeType: string): mimeType is UserAvatarMimeType {
	return (USER_AVATAR_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Animated pictures are rejected regardless of container. GIF never passes the
 * MIME check; WebP and PNG can carry animation and are checked here.
 */
export function isAnimatedImage(data: Buffer, mimeType: UserAvatarMimeType) {
	if (mimeType === 'image/webp') {
		// RIFF header (12 bytes), then an extended 'VP8X' chunk whose flags byte has the animation bit set.
		return (
			data.length > 20 && data.toString('latin1', 12, 16) === 'VP8X' && (data[20] & 0x02) !== 0
		);
	}
	if (mimeType === 'image/png') {
		// An APNG declares its frames in an 'acTL' chunk that precedes the first image data chunk.
		const animationControl = data.indexOf('acTL', 8, 'latin1');
		if (animationControl === -1) return false;
		const imageData = data.indexOf('IDAT', 8, 'latin1');
		return imageData === -1 || animationControl < imageData;
	}
	return false;
}

export interface ImageDimensions {
	width: number;
	height: number;
}

/**
 * Reads a picture's pixel size from its header, without decoding it. The size
 * is what bounds the memory every browser spends on showing the picture, so it
 * is checked here as well as the byte count: a few hundred kilobytes can hold
 * an image with billions of pixels. Returns `null` for bytes that do not carry
 * a readable header, which a valid picture always does.
 */
export function imageDimensions(
	data: Buffer,
	mimeType: UserAvatarMimeType,
): ImageDimensions | null {
	if (mimeType === 'image/png') {
		// The IHDR chunk always comes first: its width and height follow the signature and chunk header.
		if (data.length < 24 || data.toString('latin1', 12, 16) !== 'IHDR') return null;
		return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
	}

	if (mimeType === 'image/webp') {
		if (data.length < 30) return null;
		const chunk = data.toString('latin1', 12, 16);
		// Lossy: the frame header carries 14-bit dimensions after a 3-byte tag and a 3-byte start code.
		if (chunk === 'VP8 ') {
			return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
		}
		// Lossless: a signature byte, then 14 bits each of width - 1 and height - 1.
		if (chunk === 'VP8L') {
			const bits = data.readUInt32LE(21);
			return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
		}
		// Extended: 24 bits each of canvas width - 1 and height - 1, after a flags byte and three reserved.
		if (chunk === 'VP8X') {
			return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
		}
		return null;
	}

	// JPEG: walk the segments to the first frame header (SOFn), which holds the dimensions.
	let offset = 2;
	while (offset + 4 <= data.length) {
		if (data[offset] !== 0xff) return null;
		const marker = data[offset + 1];
		if (marker === 0xff) {
			offset += 1; // fill byte
			continue;
		}
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
			offset += 2; // standalone marker
			continue;
		}
		if (marker === 0xd9 || marker === 0xda) return null; // end of image, or scan data, before any frame header
		const isFrameHeader =
			marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
		if (isFrameHeader) {
			if (offset + 9 > data.length) return null;
			return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
		}
		offset += 2 + data.readUInt16BE(offset + 2);
	}
	return null;
}
