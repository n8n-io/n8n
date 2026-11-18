import { USER_AVATAR_BACKGROUNDS } from '@n8n/api-types';
import type { StoredUserAvatarImage } from '@n8n/db';

import {
	avatarImageUrl,
	defaultBackgroundFor,
	imageDimensions,
	isAnimatedImage,
	restBasePath,
	storedAvatarImages,
	toPublicAvatar,
} from '../user-avatar.utils';

const image = (storageKey: string, hash = 'h4sh'): StoredUserAvatarImage => ({
	storedAt: 'db',
	storageKey,
	mimeType: 'image/webp',
	hash,
});

describe('restBasePath', () => {
	it.each([
		['/', 'rest', '/rest'],
		['/n8n/', 'rest', '/n8n/rest'],
		['/n8n', 'api/rest', '/n8n/api/rest'],
		['', 'rest', '/rest'],
	])('joins deploy path %p and rest endpoint %p into %p', (deployPath, rest, expected) => {
		expect(restBasePath({ path: deployPath, endpoints: { rest } } as never)).toBe(expected);
	});
});

describe('avatarImageUrl', () => {
	it('builds a root-relative URL with the content hash as cache buster', () => {
		const url = avatarImageUrl(
			{ path: '/', endpoints: { rest: 'rest' } } as never,
			'user/1',
			'upload',
			image('k', 'cafe'),
		);

		expect(url).toBe('/rest/users/user%2F1/avatar/upload?v=cafe');
	});
});

describe('toPublicAvatar', () => {
	const config = { path: '/', endpoints: { rest: 'rest' } } as never;

	it('omits the field for users without a picture', () => {
		expect(toPublicAvatar(config, { id: 'u', avatar: null })).toBeUndefined();
	});

	it('replaces storage details with URLs and keeps the generated avatar', () => {
		const generated = {
			variant: 'ring' as const,
			seed: 's',
			colors: ['#000000', '#111111', '#222222', '#333333', '#444444'],
		};

		const result = toPublicAvatar(config, {
			id: 'u',
			avatar: {
				source: 'sso',
				background: 'gray',
				upload: image('up', 'aaaa'),
				sso: { ...image('sso', 'bbbb'), sourceUrl: 'https://idp/x', syncedAt: 'now' },
				generated,
			},
		});

		expect(result).toEqual({
			source: 'sso',
			background: 'gray',
			upload: { url: '/rest/users/u/avatar/upload?v=aaaa' },
			sso: { url: '/rest/users/u/avatar/sso?v=bbbb' },
			generated,
		});
		expect(JSON.stringify(result)).not.toContain('storageKey');
	});

	it('tells clients which identity provider a synced picture is from, but never its source URL', () => {
		const result = toPublicAvatar(config, {
			id: 'u',
			avatar: {
				source: 'sso',
				background: 'gray',
				sso: {
					...image('sso', 'bbbb'),
					sourceUrl: 'https://lh3.googleusercontent.com/x',
					syncedAt: 'now',
					provider: 'accounts.google.com',
				},
			},
		});

		expect(result?.sso).toEqual({
			url: '/rest/users/u/avatar/sso?v=bbbb',
			provider: 'accounts.google.com',
		});
		expect(JSON.stringify(result)).not.toContain('googleusercontent');
	});
});

describe('storedAvatarImages', () => {
	it('lists only the pictures that have bytes', () => {
		const upload = image('up');
		expect(storedAvatarImages(null)).toEqual([]);
		expect(storedAvatarImages({ source: 'upload', background: 'pink', upload })).toEqual([upload]);
	});
});

describe('defaultBackgroundFor', () => {
	it('is stable per user and always one of the backdrops', () => {
		const first = defaultBackgroundFor('11111111-2222-3333-4444-555555555555');
		expect(defaultBackgroundFor('11111111-2222-3333-4444-555555555555')).toBe(first);
		expect(USER_AVATAR_BACKGROUNDS).toContain(first);
	});

	it('spreads users across the backdrops', () => {
		const picks = new Set(Array.from({ length: 50 }, (_, i) => defaultBackgroundFor(`user-${i}`)));
		expect(picks.size).toBeGreaterThan(1);
	});
});

describe('isAnimatedImage', () => {
	const webp = (chunk: string, flags: number) =>
		Buffer.concat([
			Buffer.from('RIFF\0\0\0\0WEBP'),
			Buffer.from(chunk),
			Buffer.from([0, 0, 0, 0, flags, 0, 0, 0]),
		]);

	it('spots the animation flag of an extended WebP', () => {
		expect(isAnimatedImage(webp('VP8X', 0x02), 'image/webp')).toBe(true);
		expect(isAnimatedImage(webp('VP8X', 0x10), 'image/webp')).toBe(false);
		expect(isAnimatedImage(webp('VP8 ', 0x02), 'image/webp')).toBe(false);
	});

	it('spots an APNG by its animation control chunk ahead of the image data', () => {
		const signature = Buffer.from('\x89PNG\r\n\x1a\n', 'latin1');
		const apng = Buffer.concat([signature, Buffer.from('....IHDR....acTL....IDAT')]);
		const png = Buffer.concat([signature, Buffer.from('....IHDR....IDAT....acTL')]);

		expect(isAnimatedImage(apng, 'image/png')).toBe(true);
		expect(isAnimatedImage(png, 'image/png')).toBe(false);
	});

	it('treats JPEG as still', () => {
		expect(isAnimatedImage(Buffer.from('VP8XacTL'), 'image/jpeg')).toBe(false);
	});
});

describe('imageDimensions', () => {
	const u16be = (n: number) => Buffer.from([n >> 8, n & 0xff]);
	const u32be = (n: number) => Buffer.from([n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
	const u16le = (n: number) => Buffer.from([n & 0xff, n >> 8]);
	const u24le = (n: number) => Buffer.from([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]);

	const png = (width: number, height: number) =>
		Buffer.concat([
			Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'),
			u32be(13),
			Buffer.from('IHDR'),
			u32be(width),
			u32be(height),
			Buffer.alloc(5),
		]);

	const webp = (chunk: string, payload: Buffer) =>
		Buffer.concat([
			Buffer.from('RIFF'),
			u32be(0),
			Buffer.from('WEBP'),
			Buffer.from(chunk),
			u32be(0),
			payload,
			Buffer.alloc(16),
		]);

	/** A JPEG whose first frame header (SOF0) follows an APP0 segment and a comment. */
	const jpeg = (width: number, height: number, frameMarker = 0xc0) =>
		Buffer.concat([
			Buffer.from([0xff, 0xd8]),
			Buffer.from([0xff, 0xe0]),
			u16be(2 + 4),
			Buffer.from('JFIF'),
			Buffer.from([0xff, 0xff, 0xff, 0xfe]), // a fill byte, then a comment
			u16be(2 + 2),
			Buffer.from('hi'),
			Buffer.from([0xff, frameMarker]),
			u16be(11),
			Buffer.from([8]),
			u16be(height),
			u16be(width),
			Buffer.alloc(6),
		]);

	it('reads a PNG from its IHDR chunk', () => {
		expect(imageDimensions(png(640, 480), 'image/png')).toEqual({ width: 640, height: 480 });
		expect(imageDimensions(png(0, 0), 'image/png')).toEqual({ width: 0, height: 0 });
	});

	it('reads a lossy WebP from its frame header', () => {
		const frame = Buffer.concat([
			Buffer.alloc(3),
			Buffer.from([0x9d, 0x01, 0x2a]),
			u16le(512 | 0x4000), // the top two bits are a scaling hint, not size
			u16le(300),
		]);
		expect(imageDimensions(webp('VP8 ', frame), 'image/webp')).toEqual({
			width: 512,
			height: 300,
		});
	});

	it('reads a lossless WebP from its packed header', () => {
		const width = 1000;
		const height = 700;
		const bits = (width - 1) | ((height - 1) << 14);
		const frame = Buffer.concat([
			Buffer.from([0x2f]),
			Buffer.from([bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff]),
		]);
		expect(imageDimensions(webp('VP8L', frame), 'image/webp')).toEqual({ width, height });
	});

	it('reads an extended WebP from its canvas size', () => {
		const frame = Buffer.concat([Buffer.alloc(4), u24le(4095), u24le(2047)]);
		expect(imageDimensions(webp('VP8X', frame), 'image/webp')).toEqual({
			width: 4096,
			height: 2048,
		});
	});

	it('walks a JPEG to its first frame header, whatever its coding', () => {
		expect(imageDimensions(jpeg(1024, 768), 'image/jpeg')).toEqual({ width: 1024, height: 768 });
		expect(imageDimensions(jpeg(33, 44, 0xc2), 'image/jpeg')).toEqual({ width: 33, height: 44 });
	});

	it('does not mistake a Huffman table for a frame header', () => {
		const data = Buffer.concat([
			Buffer.from([0xff, 0xd8, 0xff, 0xc4]), // DHT shares the SOF range of markers
			u16be(2 + 4),
			Buffer.alloc(4),
			Buffer.from([0xff, 0xc0]),
			u16be(11),
			Buffer.from([8]),
			u16be(7),
			u16be(9),
			Buffer.alloc(6),
		]);
		expect(imageDimensions(data, 'image/jpeg')).toEqual({ width: 9, height: 7 });
	});

	it('gives up on bytes without a readable header', () => {
		expect(imageDimensions(Buffer.from('\x89PNG\r\n\x1a\n....', 'latin1'), 'image/png')).toBeNull();
		expect(
			imageDimensions(Buffer.from('RIFF....WEBPALPH'.padEnd(40, '.')), 'image/webp'),
		).toBeNull();
		expect(imageDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg')).toBeNull();
		expect(imageDimensions(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00]), 'image/jpeg')).toBeNull();
		expect(imageDimensions(jpeg(1, 1).subarray(0, 20), 'image/jpeg')).toBeNull();
	});
});
