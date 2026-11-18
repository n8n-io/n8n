import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import type { StoredUserAvatarImage, UserAvatarRecord, PersonRepository } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { UserAvatarService } from '../user-avatar.service';
import type { UserAvatarStore } from '../user-avatar-store';

/** Just enough bytes for `file-type` to recognise the container and for the header to carry a size. */
const u16be = (n: number) => Buffer.from([n >> 8, n & 0xff]);
const u32be = (n: number) => Buffer.from([n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
const u24le = (n: number) => Buffer.from([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]);

const png = (size: number, animated = false) =>
	Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		Buffer.from('0000000d49484452', 'hex'), // IHDR chunk header
		u32be(size),
		u32be(size),
		Buffer.alloc(5),
		Buffer.alloc(4),
		...(animated ? [Buffer.from('000000086163544c', 'hex'), Buffer.alloc(12)] : []), // acTL before IDAT
		Buffer.from('0000000049444154', 'hex'), // IDAT chunk header
		Buffer.alloc(8),
	]);
const PNG = png(512);
const APNG = png(512, true);
const jpeg = (size: number) =>
	Buffer.concat([
		Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
		u16be(2 + 14),
		Buffer.from('JFIF'),
		Buffer.alloc(10),
		Buffer.from([0xff, 0xc0]), // SOF0
		u16be(11),
		Buffer.from([8]),
		u16be(size),
		u16be(size),
		Buffer.alloc(6),
	]);
const JPEG = jpeg(512);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(20)]);
const webp = (flags: number, size = 512) =>
	Buffer.concat([
		Buffer.from('RIFF'),
		Buffer.from([0x20, 0, 0, 0]),
		Buffer.from('WEBP'),
		Buffer.from('VP8X'),
		Buffer.from([0x0a, 0, 0, 0]),
		Buffer.from([flags, 0, 0, 0]),
		u24le(size - 1),
		u24le(size - 1),
		Buffer.alloc(8),
	]);
const STILL_WEBP = webp(0x10);
const ANIMATED_WEBP = webp(0x12);

const image = (storageKey: string): StoredUserAvatarImage => ({
	storedAt: 'fs',
	storageKey,
	mimeType: 'image/png',
	hash: 'abc',
});

const ssoImage = (storageKey: string, sourceUrl = 'https://idp.example/me.png') => ({
	...image(storageKey),
	sourceUrl,
	syncedAt: '2026-01-01T00:00:00.000Z',
});

const generated = {
	variant: 'beam' as const,
	seed: 'seed',
	colors: ['#111111', '#222222', '#333333', '#444444', '#555555'],
};

describe('UserAvatarService', () => {
	const store = mock<UserAvatarStore>();
	const personRepository = mock<PersonRepository>();
	const outboundHttp = mock<OutboundHttp>();
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>({ userManagement: { avatarUploadsDisabled: false } });

	let service: UserAvatarService;

	beforeEach(() => {
		vi.resetAllMocks();
		globalConfig.userManagement.avatarUploadsDisabled = false;
		store.write.mockImplementation(async (_userId, kind, data, mimeType) => ({
			storedAt: 'fs',
			storageKey: `stored/${kind}`,
			mimeType,
			hash: data.length.toString(16),
		}));
		service = new UserAvatarService(store, personRepository, globalConfig, outboundHttp, logger);
	});

	const userWith = (avatar: UserAvatarRecord | null) => ({ id: 'user-1', avatar });

	describe('upload', () => {
		it('refuses when uploads are disabled on the instance', async () => {
			globalConfig.userManagement.avatarUploadsDisabled = true;

			await expect(service.upload(userWith(null), PNG)).rejects.toThrow(ForbiddenError);
			expect(store.write).not.toHaveBeenCalled();
		});

		it.each([
			['an empty file', Buffer.alloc(0), 'empty'],
			['a GIF', GIF, 'Animated'],
			['random bytes', Buffer.from('definitely not a picture'), 'JPEG, PNG, or WebP'],
			['an animated WebP', ANIMATED_WEBP, 'Animated'],
			['an APNG', APNG, 'Animated'],
			['a file over 1 MB', Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]), '1 MB'],
			['a PNG wider than 512 pixels', png(513), '512 pixels'],
			['a JPEG taller than 512 pixels', jpeg(2000), '512 pixels'],
			['a WebP with a bigger canvas', webp(0x10, 4096), '512 pixels'],
			['a PNG with no pixels', png(0), 'could not be read'],
			[
				'a JPEG without a frame header',
				Buffer.concat([JPEG.subarray(0, 24), Buffer.alloc(20)]),
				'could not be read',
			],
		])('rejects %s', async (_, data, message) => {
			const upload = service.upload(userWith(null), data);

			await expect(upload).rejects.toThrow(BadRequestError);
			await expect(upload).rejects.toThrow(message);
			expect(store.write).not.toHaveBeenCalled();
		});

		it.each([
			['PNG', PNG, 'image/png'],
			['JPEG', JPEG, 'image/jpeg'],
			['still WebP', STILL_WEBP, 'image/webp'],
		])('stores a %s by its sniffed type and makes it the shown picture', async (_, data, mime) => {
			const user = userWith(null);

			const record = await service.upload(user, data);

			expect(store.write).toHaveBeenCalledWith('user-1', 'upload', data, mime);
			expect(record.source).toBe('upload');
			expect(record.upload?.storageKey).toBe('stored/upload');
			expect(personRepository.saveAvatar).toHaveBeenCalledWith('user-1', record);
			expect(user.avatar).toBe(record);
		});

		it('keeps the other pictures and the backdrop, and forgets the previous upload', async () => {
			const previous = image('old-upload');
			const user = userWith({
				source: 'generated',
				background: 'gray',
				upload: previous,
				generated,
			});

			const record = await service.upload(user, PNG);

			expect(record).toMatchObject({ source: 'upload', background: 'gray', generated });
			expect(record.upload?.storageKey).toBe('stored/upload');
			expect(store.delete).toHaveBeenCalledWith([previous]);
		});

		it('sets the backdrop in the same request when given', async () => {
			const record = await service.upload(userWith(null), PNG, 'pink-light');

			expect(record.background).toBe('pink-light');
		});

		it('picks a stable backdrop for a first picture', async () => {
			const first = await service.upload(userWith(null), PNG);
			const second = await service.upload(userWith(null), PNG);

			expect(first.background).toBe(second.background);
		});

		it('does not fail the upload when the previous picture cannot be deleted', async () => {
			store.delete.mockRejectedValue(new Error('bucket gone'));
			const user = userWith({ source: 'upload', background: 'pink', upload: image('old') });

			await expect(service.upload(user, PNG)).resolves.toMatchObject({ source: 'upload' });
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('requires at least one change', async () => {
			await expect(service.update(userWith(null), {})).rejects.toThrow(BadRequestError);
		});

		it.each([
			['upload', 'not uploaded'],
			['sso', 'identity provider'],
			['generated', 'generated avatar'],
		] as const)('refuses to show a %s picture the user does not have', async (source, message) => {
			await expect(service.update(userWith(null), { source })).rejects.toThrow(message);
		});

		it('saves a generated avatar and shows it', async () => {
			const user = userWith({ source: 'upload', background: 'pink', upload: image('up') });

			const record = await service.update(user, { generated });

			expect(record).toMatchObject({ source: 'generated', generated, upload: image('up') });
		});

		it('saves a generated avatar without showing it when the request says so', async () => {
			const user = userWith({ source: 'upload', background: 'pink', upload: image('up') });

			const record = await service.update(user, { generated, source: 'upload' });

			expect(record).toMatchObject({ source: 'upload', generated });
		});

		it('switches back to the identity provider picture', async () => {
			const user = userWith({
				source: 'upload',
				background: 'pink',
				upload: image('up'),
				sso: ssoImage('sso'),
			});

			const record = await service.update(user, { source: 'sso' });

			expect(record.source).toBe('sso');
		});

		it('changes only the backdrop', async () => {
			const user = userWith({ source: 'upload', background: 'pink', upload: image('up') });

			const record = await service.update(user, { background: 'gray-dark' });

			expect(record).toMatchObject({ source: 'upload', background: 'gray-dark' });
		});
	});

	describe('remove', () => {
		it('reports a picture the user does not have', async () => {
			await expect(service.remove(userWith(null), 'upload')).rejects.toThrow(NotFoundError);
			await expect(
				service.remove(userWith({ source: 'generated', background: 'pink', generated }), 'upload'),
			).rejects.toThrow(NotFoundError);
		});

		it('falls back to the identity provider picture when the shown upload goes', async () => {
			const upload = image('up');
			const user = userWith({
				source: 'upload',
				background: 'pink',
				upload,
				sso: ssoImage('sso'),
				generated,
			});

			const record = await service.remove(user, 'upload');

			expect(record).toMatchObject({ source: 'sso', generated });
			expect(record?.upload).toBeUndefined();
			expect(store.delete).toHaveBeenCalledWith([upload]);
		});

		it('falls back to the generated avatar when that is all that is left', async () => {
			const user = userWith({
				source: 'upload',
				background: 'pink',
				upload: image('up'),
				generated,
			});

			const record = await service.remove(user, 'upload');

			expect(record).toMatchObject({ source: 'generated', generated });
		});

		it('falls back to the upload when the shown generated avatar goes', async () => {
			const user = userWith({
				source: 'generated',
				background: 'pink',
				upload: image('up'),
				generated,
			});

			const record = await service.remove(user, 'generated');

			expect(record).toMatchObject({ source: 'upload' });
			expect(record?.generated).toBeUndefined();
			expect(store.delete).not.toHaveBeenCalled();
		});

		it('leaves the shown picture alone when another one is removed', async () => {
			const user = userWith({
				source: 'generated',
				background: 'pink',
				upload: image('up'),
				generated,
			});

			const record = await service.remove(user, 'upload');

			expect(record).toMatchObject({ source: 'generated' });
		});

		it('clears the record when the last picture goes', async () => {
			const user = userWith({ source: 'upload', background: 'pink', upload: image('up') });

			const record = await service.remove(user, 'upload');

			expect(record).toBeNull();
			expect(personRepository.saveAvatar).toHaveBeenCalledWith('user-1', null);
		});
	});

	describe('syncSsoPicture', () => {
		const request = vi.fn();

		beforeEach(() => {
			request.mockReset();
			outboundHttp.requests.mockReturnValue({ request } as never);
		});

		it.each([
			['no claim', undefined],
			['an empty claim', ''],
			['a non-string claim', { url: 'https://x' }],
			['an invalid URL', 'not a url'],
			['a plain http URL', 'http://idp.example/me.png'],
		])('ignores %s', async (_, claim) => {
			await service.syncSsoPicture(userWith(null), claim);

			expect(outboundHttp.requests).not.toHaveBeenCalled();
			expect(store.write).not.toHaveBeenCalled();
		});

		it('skips a picture it already has', async () => {
			const user = userWith({ source: 'sso', background: 'pink', sso: ssoImage('sso') });

			await service.syncSsoPicture(user, 'https://idp.example/me.png');

			expect(outboundHttp.requests).not.toHaveBeenCalled();
		});

		it('stores the picture and shows it for a user without one', async () => {
			request.mockResolvedValue({ statusCode: 200, body: PNG });
			const user = userWith(null);

			await service.syncSsoPicture(user, 'https://idp.example/new.png');

			expect(outboundHttp.requests).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'safe' });
			expect(store.write).toHaveBeenCalledWith('user-1', 'sso', PNG, 'image/png');
			expect(user.avatar).toMatchObject({
				source: 'sso',
				sso: { storageKey: 'stored/sso', sourceUrl: 'https://idp.example/new.png' },
			});
			expect(user.avatar?.sso).not.toHaveProperty('provider');
		});

		it('remembers which identity provider the picture is from', async () => {
			request.mockResolvedValue({ statusCode: 200, body: PNG });
			const user = userWith(null);

			await service.syncSsoPicture(user, 'https://idp.example/new.png', {
				allowHostname: 'idp.example',
				provider: 'idp.example',
			});

			expect(user.avatar?.sso?.provider).toBe('idp.example');
		});

		it('refreshes the picture without overriding what the user chose', async () => {
			request.mockResolvedValue({ statusCode: 200, body: PNG });
			const previous = ssoImage('old-sso', 'https://idp.example/old.png');
			const user = userWith({ source: 'generated', background: 'pink', sso: previous, generated });

			await service.syncSsoPicture(user, 'https://idp.example/new.png');

			expect(user.avatar?.source).toBe('generated');
			expect(user.avatar?.sso?.sourceUrl).toBe('https://idp.example/new.png');
			expect(store.delete).toHaveBeenCalledWith([previous]);
		});

		it('gives a provider picture more room than an upload', async () => {
			request.mockResolvedValue({ statusCode: 200, body: png(2048) });
			const user = userWith(null);

			await service.syncSsoPicture(user, 'https://idp.example/big.png');

			expect(store.write).toHaveBeenCalledWith('user-1', 'sso', png(2048), 'image/png');
		});

		it('relaxes the SSRF policy only for the identity provider host', async () => {
			request.mockResolvedValue({ statusCode: 200, body: PNG });

			await service.syncSsoPicture(userWith(null), 'https://idp.internal/me.png', {
				allowHostname: 'idp.internal',
			});
			await service.syncSsoPicture(userWith(null), 'https://cdn.example/me.png', {
				allowHostname: 'idp.internal',
			});

			expect(outboundHttp.requests).toHaveBeenNthCalledWith(1, { useDefaultSsrfPolicy: 'unsafe' });
			expect(outboundHttp.requests).toHaveBeenNthCalledWith(2, { useDefaultSsrfPolicy: 'safe' });
		});

		it.each([
			['the download fails', () => request.mockRejectedValue(new Error('timeout'))],
			[
				'the server answers with an error',
				() => request.mockResolvedValue({ statusCode: 404, body: Buffer.alloc(0) }),
			],
			[
				'the bytes are not a still picture',
				() => request.mockResolvedValue({ statusCode: 200, body: GIF }),
			],
			[
				'the picture is absurdly large',
				() => request.mockResolvedValue({ statusCode: 200, body: png(2049) }),
			],
			[
				'storing fails',
				() => {
					request.mockResolvedValue({ statusCode: 200, body: PNG });
					store.write.mockRejectedValue(new Error('disk full'));
				},
			],
		])('never throws when %s', async (_, arrange) => {
			arrange();
			const user = userWith(null);

			await expect(
				service.syncSsoPicture(user, 'https://idp.example/me.png'),
			).resolves.toBeUndefined();

			expect(user.avatar).toBeNull();
			expect(personRepository.saveAvatar).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('deleteAll', () => {
		it('removes every stored picture', async () => {
			const upload = image('up');
			const sso = ssoImage('sso');

			await service.deleteAll(
				userWith({ source: 'upload', background: 'pink', upload, sso, generated }),
			);

			expect(store.delete).toHaveBeenCalledWith([upload, sso]);
		});

		it('does nothing for a user without pictures', async () => {
			await service.deleteAll(userWith(null));

			expect(store.delete).toHaveBeenCalledWith([]);
		});
	});
});
