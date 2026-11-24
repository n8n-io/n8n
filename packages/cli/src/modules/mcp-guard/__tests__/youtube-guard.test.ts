import type { OutboundHttp } from '@n8n/backend-network';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { GymAdmin } from '../gym-admin';
import { HttpGuardService } from '../http-guard.service';
import { HttpRunRegistry } from '../http-runs';
import { toToolCall } from '../http-tool-caller';
import { withYoutubeOwner, YOUTUBE_PROFILE } from '../youtube-profile';
import type { HydrationModel } from '../hydration-llm';
import { sendToNetwork } from '../network';
import { isReadShaped } from '../request-classifier';
import {
	isPassthroughHost,
	isTokenExchange,
	loadVendorKnowledge,
	vendorForRequest,
} from '../vendor-knowledge';

vi.mock('../network', () => ({
	sendToNetwork: vi.fn(async () => new Response('{"items":[]}')),
}));

const REAL_TOKEN = 'ya29.real-oauth-token-of-the-user';
const TENANT_TOKEN = 'gym-tenant-token';
const HOST = 'www.googleapis.com';
const model: HydrationModel = { resolve: async () => ({}) as never };

const youtube = loadVendorKnowledge('youtube');

const call = (method: string, path: string, body?: unknown) => ({
	method,
	url: new URL(`https://${HOST}${path}`),
	headers: { authorization: `Bearer ${REAL_TOKEN}` },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

describe('the YouTube vendor file', () => {
	it('loads, owns the two YouTube path prefixes of www.googleapis.com and states the quota risk', () => {
		expect(youtube.name).toBe('youtube');
		expect(youtube.hosts).toEqual(['www.googleapis.com']);
		expect(youtube.pathPrefixes).toEqual(['/youtube/v3', '/upload/youtube/v3']);
		expect(youtube.readPaths).toEqual([]);
		expect(youtube.instructions).toContain('Quota risk');
		expect(youtube.instructions).toContain('100 units');
		expect(youtube.instructions).toContain('native.google_youtube');
	});

	it('shares www.googleapis.com with Gmail and routes by path prefix', () => {
		expect(vendorForRequest(HOST, '/youtube/v3/search')?.name).toBe('youtube');
		expect(vendorForRequest(HOST, '/upload/youtube/v3/videos')?.name).toBe('youtube');
		expect(vendorForRequest(HOST, '/gmail/v1/users/me/messages')?.name).toBe('gmail');
		expect(vendorForRequest(HOST, '/youtube/v3x/search')).toBeUndefined();
		expect(vendorForRequest(HOST, '/drive/v3/files')?.name).not.toBe('youtube');
		expect(vendorForRequest('gmail.googleapis.com', '/youtube/v3/search')).toBeUndefined();
	});

	it('keeps the token exchange of the shared sign-in host working with two vendors', () => {
		const exchange = (method: string, path: string) => ({
			method,
			url: new URL(`https://oauth2.googleapis.com${path}`),
		});

		expect(youtube.passthroughHosts).toEqual(['oauth2.googleapis.com']);
		expect(loadVendorKnowledge('gmail').passthroughHosts).toEqual(['oauth2.googleapis.com']);
		expect(isPassthroughHost('oauth2.googleapis.com')).toBe(true);
		expect(isTokenExchange(exchange('POST', '/token'))).toBe(true);
		expect(isTokenExchange(exchange('POST', '/revoke'))).toBe(false);
		expect(isTokenExchange(exchange('GET', '/token'))).toBe(false);
		// The sign-in host belongs to no vendor, so any other request there is refused.
		expect(vendorForRequest('oauth2.googleapis.com', '/token')).toBeUndefined();
	});

	it('leaves a token exchange to the node when the service runs, and refuses other sign-in calls', async () => {
		Container.set(Logger, { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as unknown as Logger);
		const service = new HttpGuardService(Container.get(Logger), {
			transport: () => ({ asCustomFetch: () => fetch }),
		} as unknown as OutboundHttp);
		const scope = { model, chatId: 'c', agentId: 'a' };
		const request = (path: string) => ({
			method: 'POST',
			url: new URL(`https://oauth2.googleapis.com${path}`),
			headers: {},
		});

		expect(await service.handle(request('/token'), scope)).toBeUndefined();
		expect((await service.handle(request('/revoke'), scope))?.status).toBe(403);
	});
});

describe('YouTube routing: every operation of the node', () => {
	const reads: Array<[string, string]> = [
		['channel: get', '/youtube/v3/channels'],
		['channel: get many', '/youtube/v3/channels'],
		['playlist: get', '/youtube/v3/playlists'],
		['playlist: get many', '/youtube/v3/playlists'],
		['playlist item: get', '/youtube/v3/playlistItems'],
		['playlist item: get many', '/youtube/v3/playlistItems'],
		['video: get', '/youtube/v3/videos'],
		['video: get many (search)', '/youtube/v3/search'],
		['video category: get many', '/youtube/v3/videoCategories'],
		['load options: languages', '/youtube/v3/i18nLanguages'],
	];
	const writes: Array<[string, string, string]> = [
		['channel: update', 'PUT', '/youtube/v3/channels'],
		['channel: upload banner', 'POST', '/upload/youtube/v3/channelBanners/insert'],
		['playlist: create', 'POST', '/youtube/v3/playlists'],
		['playlist: update', 'PUT', '/youtube/v3/playlists'],
		['playlist: delete', 'DELETE', '/youtube/v3/playlists'],
		['playlist item: add', 'POST', '/youtube/v3/playlistItems'],
		['playlist item: delete', 'DELETE', '/youtube/v3/playlistItems'],
		['video: upload (first request)', 'POST', '/upload/youtube/v3/videos'],
		['video: upload (bytes)', 'PUT', '/upload/youtube/v3/videos'],
		['video: update', 'PUT', '/youtube/v3/videos'],
		['video: delete', 'DELETE', '/youtube/v3/videos'],
		['video: rate', 'POST', '/youtube/v3/videos/rate'],
		['comment: post (a method that the node lacks)', 'POST', '/youtube/v3/comments'],
	];

	it.each(reads)('treats %s as a read', (_label, path) => {
		expect(isReadShaped(call('GET', path), youtube.readPaths)).toBe(true);
		expect(vendorForRequest(HOST, path)?.name).toBe('youtube');
	});

	it.each(writes)('treats %s as a write', (_label, method, path) => {
		expect(isReadShaped(call(method, path, {}), youtube.readPaths)).toBe(false);
		expect(vendorForRequest(HOST, path)?.name).toBe('youtube');
	});

	it('names the tools by kind', () => {
		expect(toToolCall(call('GET', '/youtube/v3/search'), true).name).toBe(
			'read_list_youtube_search',
		);
		expect(toToolCall(call('POST', '/youtube/v3/videos/rate'), false).name).toBe(
			'write_post_youtube_videos_rate',
		);
	});
});

describe('the profile of YouTube', () => {
	it('uses the Google OAuth credential of the service "youtube"', () => {
		expect(YOUTUBE_PROFILE.name).toBe('youtube');
		expect(YOUTUBE_PROFILE.credentialKind).toBe('google_oauth');
		expect(YOUTUBE_PROFILE.credentialField).toBe('oauthTokenData.access_token');
		// YouTube ids ("PLx...", video ids) are no UUIDs. The plan must keep the real ones.
		expect(YOUTUBE_PROFILE.opaqueIds).toBe(true);
		expect(JSON.stringify(YOUTUBE_PROFILE.placeholderSeed)).toContain('person:me');
	});

	describe('lookups', () => {
		const lookups = YOUTUBE_PROFILE.lookups!;
		const read = (resource: string, id: string, part: string) => ({
			tool: `read_list_${resource}`,
			args: { method: 'GET', path: `/youtube/v3/${resource}`, query: { part, id } },
		});

		it('reads the real object that a playlist update or delete names', () => {
			expect(
				lookups('write_put_youtube_playlists', {
					method: 'PUT',
					path: '/youtube/v3/playlists',
					body: { id: 'PL123abc', snippet: { title: 'x' } },
				}),
			).toEqual([read('playlists', 'PL123abc', 'snippet,status,contentDetails')]);
			expect(
				lookups('write_delete_youtube_playlists', {
					method: 'DELETE',
					path: '/youtube/v3/playlists',
					query: { id: 'PL123abc' },
				}),
			).toEqual([read('playlists', 'PL123abc', 'snippet,status,contentDetails')]);
		});

		it('reads the playlist and the video of a playlist item add', () => {
			const out = lookups('write_post_youtube_playlistItems', {
				method: 'POST',
				path: '/youtube/v3/playlistItems',
				body: {
					snippet: {
						playlistId: 'PLxyz',
						resourceId: { kind: 'youtube#video', videoId: 'vid_1-2' },
					},
				},
			});

			expect(out).toEqual([
				read('playlists', 'PLxyz', 'snippet,status,contentDetails'),
				read('videos', 'vid_1-2', 'snippet,status,contentDetails'),
			]);
		});

		it('reads the video of a rating and a video delete', () => {
			const out = lookups('write_post_youtube_videos_rate', {
				method: 'POST',
				path: '/youtube/v3/videos/rate',
				query: { id: 'dQw4w9WgXcQ', rating: 'like' },
			});

			expect(out).toEqual([read('videos', 'dQw4w9WgXcQ', 'snippet,status,contentDetails')]);
		});

		it('reads the channel of a channel update', () => {
			const out = lookups('write_put_youtube_channels', {
				method: 'PUT',
				path: '/youtube/v3/channels',
				body: { id: 'UC123' },
			});

			expect(out).toEqual([read('channels', 'UC123', 'snippet,contentDetails,brandingSettings')]);
		});

		it('reads nothing for a read, a create, an unknown path or an id that is not a YouTube id', () => {
			expect(
				lookups('read_list_youtube_videos', {
					method: 'GET',
					path: '/youtube/v3/videos',
					query: { id: 'abc' },
				}),
			).toEqual([]);
			expect(
				lookups('write_post_youtube_playlists', {
					method: 'POST',
					path: '/youtube/v3/playlists',
					body: { snippet: { title: 'New' } },
				}),
			).toEqual([]);
			expect(lookups('write_post_x', { method: 'POST', path: '/youtube/v3/comments' })).toEqual([]);
			for (const id of ['a b', 'a&part=x', '../x', '', 'x'.repeat(65), 12, ['a']]) {
				expect(
					lookups('write_delete_youtube_videos', {
						method: 'DELETE',
						path: '/youtube/v3/videos',
						query: { id },
					}),
				).toEqual([]);
			}
		});

		it('builds reads that are read-shaped and inside the vendor', () => {
			const [one] = lookups('write_put_youtube_videos', {
				method: 'PUT',
				path: '/youtube/v3/videos',
				body: { id: 'abcDEF123' },
			});
			const req = call('GET', `${String(one.args.path)}?id=abcDEF123`);

			expect(isReadShaped(req, youtube.readPaths)).toBe(true);
			expect(vendorForRequest(HOST, req.url.pathname)?.name).toBe('youtube');
		});
	});

	describe('hydrateRead', () => {
		const hydrateRead = YOUTUBE_PROFILE.hydrateRead!;

		it('skips the static lists that the gym holds and copies everything else', () => {
			expect(hydrateRead({ method: 'GET', path: '/youtube/v3/videoCategories' }, {})).toBe(false);
			expect(hydrateRead({ method: 'GET', path: '/youtube/v3/i18nLanguages' }, {})).toBe(false);
			expect(hydrateRead({ method: 'GET', path: '/youtube/v3/search' }, {})).toBe(true);
			expect(hydrateRead({ method: 'GET', path: '/youtube/v3/playlistItems' }, {})).toBe(true);
		});
	});

	describe('hydrateWrite', () => {
		const hydrateWrite = YOUTUBE_PROFILE.hydrateWrite!;
		const args = (body: unknown) => ({ method: 'PUT', path: '/youtube/v3/playlists', body });

		it('hydrates a write that names an object that the gym did not make', () => {
			expect(hydrateWrite(args({ id: 'PL123abc' }), new Set())).toBe(true);
			expect(hydrateWrite(args({ id: 'PL123abc' }), new Set(['other']))).toBe(true);
		});

		it('does not hydrate a write on an object that the gym made, or a write that names none', () => {
			expect(hydrateWrite(args({ id: 'PL123abc' }), new Set(['PL123abc']))).toBe(false);
			expect(hydrateWrite(args({ snippet: { title: 'New' } }), new Set())).toBe(false);
		});
	});

	describe('finalize', () => {
		it('sets the one account of the gym as the owner of every channel, video and playlist', () => {
			const out = withYoutubeOwner({
				world_version: 1,
				native: {
					google_youtube: {
						channels: [{ ref: 'channel:a', owner: 'person:other' }],
						videos: [{ ref: 'video:a' }, 'not an object'],
						playlists: [{ ref: 'playlist:a', owner: 'person:x', visibility: 'private' }],
						items: [{ ref: 'item:a' }],
					},
				},
			});

			expect(out).toEqual({
				world_version: 1,
				native: {
					google_youtube: {
						channels: [{ ref: 'channel:a', owner: 'person:me', visibility: 'tenant' }],
						videos: [{ ref: 'video:a', owner: 'person:me', visibility: 'tenant' }, 'not an object'],
						playlists: [{ ref: 'playlist:a', owner: 'person:me', visibility: 'tenant' }],
						items: [{ ref: 'item:a' }],
					},
				},
			});
		});

		it('leaves an overlay without YouTube data as it is', () => {
			const plain = { world_version: 1 };

			expect(withYoutubeOwner(plain)).toBe(plain);
			expect(withYoutubeOwner({ native: { other: {} } })).toEqual({ native: { other: {} } });
			expect(withYoutubeOwner({ native: { google_youtube: {} } })).toEqual({
				native: { google_youtube: {} },
			});
		});
	});
});

describe('the credential of the node never leaves the guard', () => {
	const logs: string[] = [];
	let gymRequests: Array<{ url: string; headers: http.IncomingHttpHeaders; body: string }>;
	let gym: http.Server;
	let gymUrl: string;

	beforeAll(async () => {
		gym = http.createServer((req, res) => {
			let body = '';
			req.on('data', (chunk: Buffer) => (body += chunk.toString()));
			req.on('end', () => {
				gymRequests.push({ url: req.url ?? '', headers: req.headers, body });
				res.setHeader('content-type', 'application/json');
				res.end('{"kind":"youtube#playlist","id":"PLgymmade1"}');
			});
		});
		await new Promise<void>((resolve) => gym.listen(0, '127.0.0.1', resolve));
		gymUrl = `http://127.0.0.1:${(gym.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise((resolve) => gym.close(resolve));
	});

	beforeEach(() => {
		logs.length = 0;
		gymRequests = [];
		vi.mocked(sendToNetwork).mockClear();
		const sink = (text: string) => {
			logs.push(text);
		};
		Container.set(Logger, {
			info: sink,
			warn: sink,
			error: sink,
			debug: sink,
		} as unknown as Logger);
	});

	async function setup() {
		const admin = {
			createTenant: vi.fn(async () => {}),
			seed: vi.fn(async () => ({})),
			issueMcpCredential: vi.fn(async () => TENANT_TOKEN),
			tenantExists: vi.fn(async () => true),
			deleteTenant: vi.fn(async () => {}),
		};
		const registry = new HttpRunRegistry({
			profile: YOUTUBE_PROFILE,
			vendor: youtube,
			admin: admin as unknown as GymAdmin,
			gymUrl,
		});
		return await registry.getOrCreate('agent-chat', model);
	}

	it('sends a write only to the gym, with the token of the tenant', async () => {
		const run = await setup();

		const res = await run.router.handle(
			call('POST', '/youtube/v3/playlists?part=snippet', { snippet: { title: 'New' } }),
		);

		expect(res.status).toBe(200);
		expect(sendToNetwork).not.toHaveBeenCalled();
		const last = gymRequests[gymRequests.length - 1];
		expect(last.url).toBe('/youtube/v3/playlists?part=snippet');
		expect(last.headers.authorization).toBe(`Bearer ${TENANT_TOKEN}`);
		expect(last.headers.host).toBe(HOST);
		expect(JSON.stringify(gymRequests)).not.toContain(REAL_TOKEN);
		expect(logs.join('\n')).not.toContain(REAL_TOKEN);
	});

	it('does not send a video upload, a rating or a delete to the real service', async () => {
		const run = await setup();

		await run.router.handle(call('POST', '/upload/youtube/v3/videos?uploadType=resumable', {}));
		await run.router.handle(call('POST', '/youtube/v3/videos/rate?id=abc12345&rating=like'));
		await run.router.handle(call('DELETE', '/youtube/v3/playlists?id=PL123abc'));

		// Only the real lookup of the playlist that the delete names is a real request, and it is a GET.
		const methods = vi.mocked(sendToNetwork).mock.calls.map(([req]) => req.method);
		expect(methods.every((method) => method === 'GET')).toBe(true);
		expect(gymRequests.map((r) => r.url)).toEqual(
			expect.arrayContaining([
				'/upload/youtube/v3/videos?uploadType=resumable',
				'/youtube/v3/videos/rate?id=abc12345&rating=like',
				'/youtube/v3/playlists?id=PL123abc',
			]),
		);
	});

	it('reads the real service with the credential of the node, and the gym never gets it', async () => {
		const run = await setup();

		await run.router.handle(call('GET', '/youtube/v3/search?part=snippet&q=cats'));

		const real = vi.mocked(sendToNetwork).mock.calls[0][0];
		expect(real.url.hostname).toBe(HOST);
		expect(real.url.protocol).toBe('https:');
		expect(real.headers.authorization).toBe(`Bearer ${REAL_TOKEN}`);
		expect(gymRequests[gymRequests.length - 1].headers.authorization).toBe(
			`Bearer ${TENANT_TOKEN}`,
		);
		expect(JSON.stringify(gymRequests)).not.toContain(REAL_TOKEN);
		expect(logs.join('\n')).not.toContain(REAL_TOKEN);
		// The log line has method, host and path. It has no query.
		expect(logs.join('\n')).toContain(`GET ${HOST}/youtube/v3/search`);
		expect(logs.join('\n')).not.toContain('q=cats');
	});

	it('returns a 401 of the real read to the node, so that the node refreshes its token', async () => {
		vi.mocked(sendToNetwork).mockResolvedValueOnce(new Response('{"error":{}}', { status: 401 }));
		const run = await setup();

		const res = await run.router.handle(call('GET', '/youtube/v3/channels?part=snippet&mine=true'));

		expect(res.status).toBe(401);
		expect(gymRequests).toHaveLength(0);
	});
});
