import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { GymAdmin } from '../gym-admin';
import { HttpRunRegistry } from '../http-runs';
import { TELEGRAM_PROFILE } from '../http-profiles';
import type { HydrationModel } from '../hydration-llm';
import { sendToNetwork } from '../network';
import { loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';
import { isReadShaped } from '../request-classifier';
import { toToolCall } from '../http-tool-caller';

vi.mock('../network', () => ({
	sendToNetwork: vi.fn(async () => new Response('{"ok":true,"result":{}}')),
}));

// A real-looking bot token. It must never show up in a log, an error or a gym request.
const TOKEN = '8123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
const TENANT_TOKEN = '7000000001:AAtenantTokenOfTheGymXXXXXXXXXXXXXXXXXX';
const HOST = 'api.telegram.org';
const model: HydrationModel = { resolve: async () => ({}) as never };

const telegram = loadVendorKnowledge('telegram');

const call = (method: string, path: string, body?: unknown) => ({
	method,
	url: new URL(`https://${HOST}${path}`),
	headers: { authorization: 'Bearer should-not-matter' },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

describe('the Telegram vendor file', () => {
	it('loads, owns the bot and file paths of api.telegram.org and has no passthrough host', () => {
		expect(telegram.name).toBe('telegram');
		expect(telegram.hosts).toEqual(['api.telegram.org']);
		expect(telegram.pathPrefixes).toEqual(['/bot*', '/file/bot*']);
		expect(telegram.passthroughHosts).toEqual([]);
		expect(telegram.instructions).toContain('native.telegram');
	});

	it('is chosen for a path with a token, also a file path, and not for other paths or hosts', () => {
		expect(vendorForRequest(HOST, `/bot${TOKEN}/sendMessage`)?.name).toBe('telegram');
		expect(vendorForRequest(HOST, `/file/bot${TOKEN}/photos/file_1.jpg`)?.name).toBe('telegram');
		expect(vendorForRequest(HOST, '/other')).toBeUndefined();
		expect(vendorForRequest(HOST, '/bot/sendMessage')).toBeUndefined();
		expect(vendorForRequest('example.com', `/bot${TOKEN}/sendMessage`)).toBeUndefined();
	});
});

describe('Telegram routing: reads and writes', () => {
	const readMethods = [
		'getMe',
		'getChat',
		'getChatAdministrators',
		'getChatMember',
		'getChatMemberCount',
		'getFile',
	];
	// Every method of the Telegram node, and the other Bot API methods that change data.
	const writeMethods = [
		'answerCallbackQuery',
		'answerInlineQuery',
		'leaveChat',
		'setChatDescription',
		'setChatTitle',
		'editMessageText',
		'deleteMessage',
		'pinChatMessage',
		'unpinChatMessage',
		'sendAnimation',
		'sendAudio',
		'sendChatAction',
		'sendDocument',
		'sendLocation',
		'sendMessage',
		'sendMediaGroup',
		'sendPhoto',
		'sendSticker',
		'sendVideo',
		'sendMessageDraft',
		'sendRichMessage',
		'sendRichMessageDraft',
		'forwardMessage',
		'copyMessage',
		'banChatMember',
		'setWebhook',
		'deleteWebhook',
		// A safe default: getUpdates with an offset takes updates away from the server.
		'getUpdates',
	];

	it.each(readMethods)('treats a POST of %s as a read', (method) => {
		expect(isReadShaped(call('POST', `/bot${TOKEN}/${method}`, {}), telegram.readPaths)).toBe(true);
	});

	it.each(writeMethods)('treats a POST of %s as a write', (method) => {
		expect(isReadShaped(call('POST', `/bot${TOKEN}/${method}`, {}), telegram.readPaths)).toBe(
			false,
		);
	});

	it('treats a read method with another spelling or a longer path as a write', () => {
		for (const path of [
			`/bot${TOKEN}/GETME`,
			`/bot${TOKEN}/getMe/extra`,
			`/bot${TOKEN}/test/getMe`,
			`/bot${TOKEN}/getMeNow`,
		]) {
			expect(isReadShaped(call('POST', path), telegram.readPaths)).toBe(false);
		}
	});

	it('treats the file download as a read, because it is a GET', () => {
		expect(
			isReadShaped(call('GET', `/file/bot${TOKEN}/photos/file_1.jpg`), telegram.readPaths),
		).toBe(true);
	});

	it('names the tool from the method, without the token or the placeholder', () => {
		const { name } = toToolCall(call('POST', `/bot${TOKEN}/sendMessage`, {}), false);
		const redacted = toToolCall(call('POST', '/botguard-redacted/sendMessage', {}), false);

		expect(redacted.name).toBe('write_post_sendMessage');
		expect(name).toBe('write_post_sendMessage');
	});
});

describe('the profile of Telegram', () => {
	it('uses the bot token credential and its own gym ports', () => {
		expect(TELEGRAM_PROFILE.credentialKind).toBe('bot_token');
		expect(TELEGRAM_PROFILE.credentialField).toBe('accessToken');
		expect(TELEGRAM_PROFILE.defaultAdminUrl).toBe('http://127.0.0.1:9097');
		expect(TELEGRAM_PROFILE.defaultGymUrl).toBe('http://127.0.0.1:8087');
	});

	it('seeds a persona that has a Telegram identity, so the gym can issue a token', () => {
		expect(JSON.stringify(TELEGRAM_PROFILE.placeholderSeed)).toContain('"telegram"');
	});

	describe('lookups', () => {
		const lookups = TELEGRAM_PROFILE.lookups!;

		it('reads the real chat of a write, also when the chat id is short, negative or a name', () => {
			for (const chat_id of [42, '12345', -1001234567890, '@mychannel']) {
				const out = lookups('write_post_sendMessage', {
					method: 'POST',
					path: '/botguard-redacted/sendMessage',
					body: { chat_id, text: 'hi' },
				});

				expect(out).toEqual([
					{
						tool: 'read_getChat',
						args: {
							method: 'POST',
							path: '/botguard-redacted/getChat',
							body: { chat_id: String(chat_id) },
						},
					},
				]);
			}
		});

		it('reads the chat from the query of a write', () => {
			const out = lookups('write_post_deleteMessage', {
				method: 'POST',
				path: '/botguard-redacted/deleteMessage',
				query: { chat_id: '777' },
			});

			expect(out).toHaveLength(1);
			expect(out[0].args.body).toEqual({ chat_id: '777' });
		});

		it('reads nothing for a read, or for a write without a usable chat id', () => {
			const path = '/botguard-redacted/x';
			expect(lookups('read_getChat', { method: 'POST', path, body: { chat_id: 1 } })).toEqual([]);
			expect(lookups('write_post_x', { method: 'POST', path })).toEqual([]);
			expect(lookups('write_post_x', { method: 'POST', path, body: { chat_id: '' } })).toEqual([]);
			expect(lookups('write_post_x', { method: 'POST', path, body: { chat_id: {} } })).toEqual([]);
			expect(lookups('write_post_x', { method: 'POST', path, body: 'text' })).toEqual([]);
			expect(
				lookups('write_post_x', { method: 'POST', path, body: { chat_id: 'x'.repeat(200) } }),
			).toEqual([]);
			expect(
				lookups('write_post_x', { method: 'POST', path, query: { chat_id: ['1', '2'] } }),
			).toEqual([]);
		});

		it('builds a read that is read-shaped and inside the vendor', () => {
			const [read] = lookups('write_post_sendMessage', {
				method: 'POST',
				path: '/botguard-redacted/sendMessage',
				body: { chat_id: 1 },
			});
			const req = call('POST', String(read.args.path), read.args.body);

			expect(isReadShaped(req, telegram.readPaths)).toBe(true);
			expect(vendorForRequest(HOST, req.url.pathname)?.name).toBe('telegram');
		});
	});

	describe('hydrateRead', () => {
		const hydrateRead = TELEGRAM_PROFILE.hydrateRead!;
		const args = (path: string) => ({ method: 'POST', path });

		it('copies chat reads and skips the bot and the files', () => {
			expect(hydrateRead(args('/botguard-redacted/getChat'), {})).toBe(true);
			expect(hydrateRead(args('/botguard-redacted/getChatMember'), {})).toBe(true);
			expect(hydrateRead(args('/botguard-redacted/getMe'), {})).toBe(false);
			expect(hydrateRead(args('/botguard-redacted/getFile'), {})).toBe(false);
			expect(hydrateRead({ method: 'GET', path: '/file/botguard-redacted/a/b.jpg' }, {})).toBe(
				false,
			);
		});
	});

	describe('hydrateWrite', () => {
		const hydrateWrite = TELEGRAM_PROFILE.hydrateWrite!;
		const path = '/botguard-redacted/sendMessage';

		it('hydrates a write that names a chat, also a short chat id', () => {
			expect(hydrateWrite({ method: 'POST', path, body: { chat_id: 12 } }, new Set())).toBe(true);
			expect(hydrateWrite({ method: 'POST', path, body: { chat_id: '@c' } }, new Set())).toBe(true);
		});

		it('does not hydrate a write that names no chat', () => {
			expect(hydrateWrite({ method: 'POST', path, body: { text: 'x' } }, new Set())).toBe(false);
			expect(hydrateWrite({ method: 'POST', path }, new Set())).toBe(false);
		});
	});
});

describe('a bot token never leaves the guard', () => {
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
				res.end('{"ok":true,"result":{"message_id":1}}');
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
			profile: TELEGRAM_PROFILE,
			vendor: telegram,
			admin: admin as unknown as GymAdmin,
			gymUrl,
		});
		return await registry.getOrCreate('agent-chat', model);
	}

	it('sends a write to the gym with the token of the tenant, and never reaches the real service', async () => {
		const run = await setup();

		const res = await run.router.handle(
			call('POST', `/bot${TOKEN}/sendMessage`, { chat_id: 5, text: 'hello' }),
		);

		expect(res.status).toBe(200);
		// The chat of the write is looked up with a real read. The write itself stays away.
		const paths = vi.mocked(sendToNetwork).mock.calls.map(([req]) => req.url.pathname);
		expect(paths.every((path) => path.endsWith('/getChat'))).toBe(true);
		expect(gymRequests.length).toBeGreaterThan(0);
		const last = gymRequests[gymRequests.length - 1];
		expect(last.url).toBe(`/bot${TENANT_TOKEN}/sendMessage`);
		expect(JSON.stringify(gymRequests)).not.toContain(TOKEN);
		expect(logs.join('\n')).not.toContain(TOKEN);
		expect(logs.join('\n')).toContain(`${HOST}/botguard-redacted/sendMessage`);
	});

	it('sends no request to the real service for a write that names no chat', async () => {
		const run = await setup();

		await run.router.handle(call('POST', `/bot${TOKEN}/setMyCommands`, { commands: [] }));

		expect(sendToNetwork).not.toHaveBeenCalled();
		expect(gymRequests[gymRequests.length - 1].url).toBe(`/bot${TENANT_TOKEN}/setMyCommands`);
	});

	it('reads the real service with the real token, and the gym and the logs never see it', async () => {
		const run = await setup();

		await run.router.handle(call('POST', `/bot${TOKEN}/getChat`, { chat_id: 5 }));

		const real = vi.mocked(sendToNetwork).mock.calls[0][0];
		expect(real.url.pathname).toBe(`/bot${TOKEN}/getChat`);
		expect(real.url.hostname).toBe(HOST);
		expect(gymRequests[gymRequests.length - 1].url).toBe(`/bot${TENANT_TOKEN}/getChat`);
		expect(JSON.stringify(gymRequests)).not.toContain(TOKEN);
		expect(logs.join('\n')).not.toContain(TOKEN);
	});

	it('reads a file with the real token and keeps the token out of the gym path', async () => {
		const run = await setup();

		await run.router.handle(call('GET', `/file/bot${TOKEN}/photos/file_1.jpg`));

		const real = vi.mocked(sendToNetwork).mock.calls[0][0];
		expect(real.url.pathname).toBe(`/file/bot${TOKEN}/photos/file_1.jpg`);
		expect(gymRequests[gymRequests.length - 1].url).toBe(
			`/file/bot${TENANT_TOKEN}/photos/file_1.jpg`,
		);
		expect(logs.join('\n')).not.toContain(TOKEN);
	});

	it('keeps the token out of the logs when the real read and the hydration of a write fail', async () => {
		vi.mocked(sendToNetwork).mockRejectedValueOnce(new Error(`connect /bot${TOKEN}/getChat`));
		vi.mocked(sendToNetwork).mockResolvedValueOnce(new Response('{"ok":false}', { status: 401 }));
		const run = await setup();

		await run.router.handle(call('POST', `/bot${TOKEN}/getChat`, { chat_id: 5 }));
		await run.router.handle(call('POST', `/bot${TOKEN}/sendMessage`, { chat_id: 6, text: 'x' }));

		expect(logs.length).toBeGreaterThan(0);
		expect(logs.join('\n')).not.toContain(TOKEN);
		expect(JSON.stringify(gymRequests)).not.toContain(TOKEN);
	});
});
