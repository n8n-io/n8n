import Ajv from 'ajv-draft-04';
import { unzipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { TeamsManifestService } from '../teams-manifest.service';

interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Minimal reader for the 8-bit RGBA, non-interlaced PNGs this service bundles.
 * Written out rather than pulling in a decoder and its types for one assertion.
 */
function readRgbaPixels(png: Buffer): Rgba[] {
	const width = png.readUInt32BE(16);
	const height = png.readUInt32BE(20);
	expect([png.readUInt8(24), png.readUInt8(25), png.readUInt8(28)]).toEqual([8, 6, 0]);

	const idat: Buffer[] = [];
	for (let offset = 8; offset + 8 <= png.length; ) {
		const length = png.readUInt32BE(offset);
		const type = png.toString('ascii', offset + 4, offset + 8);
		if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
		offset += length + 12;
	}

	const raw = inflateSync(Buffer.concat(idat));
	const bpp = 4;
	const stride = width * bpp;
	const out = Buffer.alloc(height * stride);

	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x++) {
			const left = x >= bpp ? out[y * stride + x - bpp] : 0;
			const up = y > 0 ? out[(y - 1) * stride + x] : 0;
			const upLeft = y > 0 && x >= bpp ? out[(y - 1) * stride + x - bpp] : 0;
			let value = line[x];
			if (filter === 1) value += left;
			else if (filter === 2) value += up;
			else if (filter === 3) value += Math.floor((left + up) / 2);
			else if (filter === 4) {
				const p = left + up - upLeft;
				const [dL, dU, dUL] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
				value += dL <= dU && dL <= dUL ? left : dU <= dUL ? up : upLeft;
			}
			out[y * stride + x] = value & 0xff;
		}
	}

	const pixels: Rgba[] = [];
	for (let i = 0; i < out.length; i += bpp) {
		pixels.push({ r: out[i], g: out[i + 1], b: out[i + 2], a: out[i + 3] });
	}
	return pixels;
}

const schema: object = JSON.parse(
	readFileSync(join(__dirname, 'fixtures', 'MicrosoftTeams.schema.v1.16.json'), 'utf8'),
);

const BOT_ID = '11111111-2222-3333-4444-555555555555';

const options = (
	overrides: Partial<Parameters<TeamsManifestService['buildManifest']>[0]> = {},
) => ({
	agentName: 'Support Bot',
	agentId: 'agent-abc',
	botId: BOT_ID,
	agentUpdatedAt: new Date('2026-09-15T10:00:00.000Z'),
	...overrides,
});

describe('TeamsManifestService', () => {
	const service = new TeamsManifestService();

	describe('buildManifest', () => {
		it('produces a manifest that satisfies the published Teams schema', () => {
			const ajv = new Ajv({ strict: false });
			const validate = ajv.compile(schema);

			const valid = validate(service.buildManifest(options()));

			expect(validate.errors).toBeNull();
			expect(valid).toBe(true);
		});

		it('uses the credential client ID as the bot ID', () => {
			expect(service.buildManifest(options()).bots[0].botId).toBe(BOT_ID);
		});

		it('scopes the bot to direct messages when nothing else is turned on', () => {
			expect(service.buildManifest(options()).bots[0].scopes).toEqual(['personal']);
		});

		describe('availability', () => {
			it.each([
				['team channels', { teamChannels: true }, ['personal', 'team']],
				['group chats', { groupChats: true }, ['personal', 'groupChat']],
				['both', { teamChannels: true, groupChats: true }, ['personal', 'team', 'groupChat']],
			])('adds the %s scope', (_label, availability, expected) => {
				expect(service.buildManifest(options({ availability })).bots[0].scopes).toEqual(expected);
			});

			it('keeps direct chat on whatever else is turned off', () => {
				expect(
					service.buildManifest(options({ availability: { teamChannels: false } })).bots[0].scopes,
				).toEqual(['personal']);
			});

			it('emits no read permissions by default', () => {
				const manifest = service.buildManifest(options());

				expect(manifest.authorization).toBeUndefined();
				expect(manifest.webApplicationInfo).toBeUndefined();
			});

			it.each([
				[
					'channel messages',
					{ teamChannels: true, readAllChannelMessages: true },
					'ChannelMessage.Read.Group',
				],
				[
					'group messages',
					{ groupChats: true, readAllGroupMessages: true },
					'ChatMessage.Read.Chat',
				],
			])('asks to read all %s', (_label, availability, permission) => {
				const manifest = service.buildManifest(options({ availability }));

				expect(manifest.authorization?.permissions.resourceSpecific).toEqual([
					{ name: permission, type: 'Application' },
				]);
			});

			it('pairs a read permission with webApplicationInfo, which Teams requires', () => {
				const manifest = service.buildManifest(
					options({ availability: { teamChannels: true, readAllChannelMessages: true } }),
				);

				expect(manifest.webApplicationInfo).toEqual({ id: BOT_ID });
			});

			it('drops a read permission whose surface is off, so it cannot read as in effect', () => {
				const manifest = service.buildManifest(
					options({ availability: { teamChannels: false, readAllChannelMessages: true } }),
				);

				expect(manifest.authorization).toBeUndefined();
				expect(manifest.bots[0].scopes).toEqual(['personal']);
			});

			it.each([
				['nothing', {}],
				['every scope', { teamChannels: true, groupChats: true }],
				[
					'every scope and read permission',
					{
						teamChannels: true,
						groupChats: true,
						readAllChannelMessages: true,
						readAllGroupMessages: true,
					},
				],
			])('still satisfies the published schema with %s turned on', (_label, availability) => {
				const ajv = new Ajv({ strict: false });

				expect(ajv.validate(schema, service.buildManifest(options({ availability })))).toBe(true);
				expect(ajv.errors).toBeNull();
			});
		});

		it('derives a stable GUID id for an agent, and a different one per agent', () => {
			const first = service.buildManifest(options()).id;
			const second = service.buildManifest(options()).id;
			const other = service.buildManifest(options({ agentId: 'agent-xyz' })).id;

			expect(first).toBe(second);
			expect(other).not.toBe(first);
			expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('raises the version when the agent changes, so Teams accepts the re-upload', () => {
			const earlier = service.buildManifest(options()).version;
			const later = service.buildManifest(
				options({ agentUpdatedAt: new Date('2026-09-15T10:00:05.000Z') }),
			).version;

			expect(later).not.toBe(earlier);
			expect([earlier, later].sort()[1]).toBe(later);
		});

		it.each([
			['1.0.0', new Date('1970-01-01T00:00:00.000Z')],
			['1.20711.36000', new Date('2026-09-15T10:00:00.000Z')],
		])('formats the version as %s', (expected, updatedAt) => {
			expect(service.buildManifest(options({ agentUpdatedAt: updatedAt })).version).toBe(expected);
		});

		it('never emits a version with a major below 1', () => {
			expect(service.buildManifest(options({ agentUpdatedAt: new Date(0) })).version).toMatch(
				/^[1-9]\d*\.\d+\.\d+$/,
			);
		});

		it.each([
			['short name', 30, (m: ReturnType<TeamsManifestService['buildManifest']>) => m.name.short],
			['full name', 100, (m: ReturnType<TeamsManifestService['buildManifest']>) => m.name.full],
			[
				'short description',
				80,
				(m: ReturnType<TeamsManifestService['buildManifest']>) => m.description.short,
			],
			[
				'full description',
				4000,
				(m: ReturnType<TeamsManifestService['buildManifest']>) => m.description.full,
			],
			[
				'developer name',
				32,
				(m: ReturnType<TeamsManifestService['buildManifest']>) => m.developer.name,
			],
		])('keeps the %s within Teams limits', (_label, limit, read) => {
			const manifest = service.buildManifest(options({ agentName: 'A'.repeat(500) }));

			expect(read(manifest).length).toBeGreaterThan(0);
			expect(read(manifest).length).toBeLessThanOrEqual(limit);
		});

		describe('app identity', () => {
			it('uses the agent name when nothing overrides it', () => {
				expect(service.buildManifest(options()).name.short).toBe('Support Bot');
			});

			it('prefers the name chosen for Teams', () => {
				const manifest = service.buildManifest(
					options({ identity: { displayName: 'Support desk' } }),
				);

				expect(manifest.name.short).toBe('Support desk');
				expect(manifest.description.short).toContain('Support desk');
			});

			it('prefers the description chosen for Teams', () => {
				const manifest = service.buildManifest(
					options({ identity: { description: 'Answers questions about orders' } }),
				);

				expect(manifest.description.short).toBe('Answers questions about orders');
			});

			it('reports the same defaults the manifest falls back to', () => {
				const defaults = service.defaultIdentity('Support Bot');
				const manifest = service.buildManifest(options());

				// The setup shows these before anything is saved, so they have to be
				// what the manifest would actually use.
				expect(defaults.displayName).toBe(manifest.name.short);
				expect(defaults.description).toBe(manifest.description.short);
			});

			it('sanitises and truncates the defaults too', () => {
				const defaults = service.defaultIdentity('A'.repeat(200));

				expect(defaults.displayName.length).toBeLessThanOrEqual(30);
				expect(defaults.description.length).toBeLessThanOrEqual(80);
			});

			it('still truncates an override to the Teams limits', () => {
				const manifest = service.buildManifest(
					options({ identity: { displayName: 'A'.repeat(200) } }),
				);

				expect(manifest.name.short.length).toBeLessThanOrEqual(30);
			});
		});

		it('falls back to a default name when the agent name has no usable characters', () => {
			expect(service.buildManifest(options({ agentName: '🎉🎉🎉' })).name.short).toBe('n8n Agent');
		});

		it('serves every developer URL over HTTPS', () => {
			const { developer } = service.buildManifest(options());

			for (const url of [developer.websiteUrl, developer.privacyUrl, developer.termsOfUseUrl]) {
				expect(url).toMatch(/^https:\/\//);
			}
		});
	});

	describe('buildPackage', () => {
		it('produces a flat zip holding exactly the three expected files', async () => {
			const entries = unzipSync(await service.buildPackage(options()));

			expect(Object.keys(entries).sort()).toEqual(['color.png', 'manifest.json', 'outline.png']);
			// A nested folder is what makes the Teams upload fail.
			expect(Object.keys(entries).some((name) => name.includes('/'))).toBe(false);
		});

		it('writes the same manifest into the zip that buildManifest returns', async () => {
			const entries = unzipSync(await service.buildPackage(options()));

			expect(JSON.parse(Buffer.from(entries['manifest.json']).toString('utf8'))).toEqual(
				service.buildManifest(options()),
			);
		});

		it.each([
			['color.png', 192],
			['outline.png', 32],
		])('bundles %s at %ipx square', async (name, size) => {
			const entries = unzipSync(await service.buildPackage(options()));
			const png = Buffer.from(entries[name]);

			// PNG IHDR: width and height are big-endian uint32 at bytes 16 and 20.
			expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
			expect(png.readUInt32BE(16)).toBe(size);
			expect(png.readUInt32BE(20)).toBe(size);
		});

		it('bundles an outline icon made only of white and transparent pixels', async () => {
			const entries = unzipSync(await service.buildPackage(options()));
			const pixels = readRgbaPixels(Buffer.from(entries['outline.png']));

			// Teams rejects a coloured outline icon with InvalidOutlineIconTransparency.
			const coloured = pixels.filter(
				({ r, g, b, a }) => a > 0 && (r !== 255 || g !== 255 || b !== 255),
			);

			expect(coloured).toEqual([]);
			expect(pixels.some(({ a }) => a === 255)).toBe(true);
			expect(pixels.some(({ a }) => a === 0)).toBe(true);
		});
	});
});
