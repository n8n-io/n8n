import type { McpToolCallResult } from '@n8n/api-types';
import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { BrowserConnection } from '@n8n/mcp-browser';
import { mock } from 'vitest-mock-extended';

import type { BrowserDomainGate, BrowserLocalMcpServer } from '../browser/browser-local-mcp-server';
import type { BrowserbaseGatewayClient } from '../browser/browserbase-gateway.client';
import { CloudBrowserMcpServer } from '../browser/cloud-browser-mcp-server';
import type { SavedLogin, SavedLoginStore } from '../browser/saved-login.store';

const ok: McpToolCallResult = { content: [{ type: 'text', text: 'ok' }] };
const LEDGERLY = 'https://ledgerly.example.com/settings/developer';
const OTHER = 'https://anotherdifferentsite.com/app';

const savedLedgerly: SavedLogin = {
	id: 'login-1',
	userId: 'user-1',
	site: 'ledgerly.example.com',
	label: 'ledgerly.example.com',
	region: 'eu-central-1',
	contextId: 'ctx-saved',
	createdAt: '2026-10-01T00:00:00.000Z',
};

function navigate(url: string, confirmation?: string) {
	return {
		name: 'browser_navigate',
		arguments: confirmation ? { url, _confirmation: confirmation } : { url },
	};
}

function textOf(result: McpToolCallResult): string {
	return result.content.map((part) => ('text' in part ? part.text : '')).join(' ');
}

function setup(options: { saved?: SavedLogin; inUseElsewhere?: boolean } = {}) {
	let sessionCount = 0;
	let contextCount = 0;
	/** The pages Browserbase lists for each session, as the test sets them. */
	const pagesBySession = new Map<string, string[]>();

	const gateway = mock<BrowserbaseGatewayClient>();
	gateway.createContext.mockImplementation(async () => ({ id: `ctx-${++contextCount}` }));
	gateway.createSession.mockImplementation(async (_userId, opts) => {
		const id = `bb-${++sessionCount}`;
		return { id, connectUrl: `wss://bb.invalid/${id}`, region: opts?.region ?? 'us-west-2' };
	});
	gateway.getLivePages.mockImplementation(async (_userId, sessionId) => ({
		debuggerFullscreenUrl: `https://live/${sessionId}`,
		pages: (pagesBySession.get(sessionId) ?? []).map((url, i) => ({
			id: `p${i}`,
			title: url,
			url,
			debuggerFullscreenUrl: `https://live/${sessionId}/p${i}`,
		})),
	}));
	gateway.getSessionStatus.mockResolvedValue('COMPLETED');
	gateway.releaseSession.mockResolvedValue();
	gateway.deleteContext.mockResolvedValue();

	const catalog = mock<BrowserLocalMcpServer>();
	catalog.getAvailableTools.mockReturnValue([]);
	catalog.checkAccess.mockResolvedValue(undefined);

	/** One tool server per Browserbase session, keyed by session id. */
	const servers = new Map<string, ReturnType<typeof mock<BrowserLocalMcpServer>>>();
	const connectToolsTo = vi.fn((cdpEndpoint: string) => {
		if (cdpEndpoint === 'ws://catalog.invalid') return catalog;
		const sessionId = cdpEndpoint.split('/').pop() ?? '';
		const server = mock<BrowserLocalMcpServer>();
		// A fresh result each call: the server adds notes to the result it gets.
		server.callTool.mockImplementation(async () => structuredClone(ok));
		Object.assign(server, {
			connection: mock<BrowserConnection>({
				clearSiteDataExcept: vi.fn().mockResolvedValue({ cookieDomains: [], origins: [] }),
			}),
		});
		servers.set(sessionId, server);
		return server;
	});

	const store = mock<SavedLoginStore>();
	store.findBySite.mockImplementation(async (_userId, site) =>
		options.saved?.site === site ? options.saved : undefined,
	);
	store.add.mockImplementation(async (login) => ({
		...login,
		id: 'login-new',
		createdAt: new Date().toISOString(),
	}));
	store.touch.mockResolvedValue();

	const server = new CloudBrowserMcpServer(
		'user-1',
		gateway,
		connectToolsTo,
		store,
		mock<Logger>(),
		{ savedLoginGrants: new Map(), inUseElsewhere: () => options.inUseElsewhere ?? false },
	);
	server.setDomainGate(mock<BrowserDomainGate>({ threadId: 'thread-1', runId: 'run-1' }));
	return { server, gateway, catalog, servers, store, pagesBySession };
}

describe('CloudBrowserMcpServer', () => {
	describe('step 1: session on first navigation', () => {
		it.each(['browser_connect', 'browser_tab_list', 'browser_snapshot', 'browser_live_view'])(
			'answers %s without starting a session',
			async (name) => {
				const { server, gateway } = setup();

				await server.callTool({ name, arguments: {} });

				expect(gateway.createSession).not.toHaveBeenCalled();
			},
		);

		it('offers no tab tool, and refuses one, so each browser has one tab', async () => {
			const { server, gateway, catalog } = setup();
			catalog.getAvailableTools.mockReturnValue([
				{
					name: 'browser_tab_open',
					description: '',
					inputSchema: { type: 'object', properties: {} },
				},
			]);

			const result = await server.callTool({
				name: 'browser_tab_open',
				arguments: { url: LEDGERLY },
			});

			expect(server.getAvailableTools().map((t) => t.name)).toEqual([
				'browser_start_session',
				'browser_live_view',
			]);
			expect(result.isError).toBe(true);
			expect(gateway.createSession).not.toHaveBeenCalled();
		});

		it('starts the session on the first navigation and runs it there', async () => {
			const { server, gateway, servers } = setup();

			await server.callTool({ name: 'browser_connect', arguments: {} });
			const result = await server.callTool(navigate(LEDGERLY));

			expect(gateway.createSession).toHaveBeenCalledTimes(1);
			expect(servers.get('bb-1')?.callTool).toHaveBeenCalledWith(navigate(LEDGERLY));
			expect(result).toEqual(ok);
		});

		it('says it is starting while the session is created, and tells listeners', async () => {
			const { server, gateway } = setup();
			const seen: boolean[] = [];
			server.onChange(() => seen.push(server.isStarting()));
			let startingDuringCreate = false;
			gateway.createSession.mockImplementation(async () => {
				startingDuringCreate = server.isStarting();
				return { id: 'bb-1', connectUrl: 'wss://bb.invalid/bb-1', region: 'us-west-2' };
			});

			await server.callTool(navigate(LEDGERLY));

			expect(startingDuringCreate).toBe(true);
			expect(seen).toEqual([true, false]);
			expect(server.isStarting()).toBe(false);
		});

		it('asks for domain access before starting a session', async () => {
			const { server, gateway, catalog } = setup();
			const pending: McpToolCallResult = {
				content: [{ type: 'text', text: 'confirm' }],
				isError: true,
			};
			catalog.checkAccess.mockResolvedValue(pending);

			const result = await server.callTool(navigate(LEDGERLY));

			expect(result).toBe(pending);
			expect(gateway.createSession).not.toHaveBeenCalled();
		});
	});

	describe('step 2: pending context per session', () => {
		it('opens the session on a new context that it writes back to', async () => {
			const { server, gateway } = setup();

			await server.callTool(navigate(LEDGERLY));

			expect(gateway.createContext).toHaveBeenCalledTimes(1);
			expect(gateway.createSession).toHaveBeenCalledWith('user-1', {
				context: { id: 'ctx-1', persist: true },
				region: undefined,
			});
		});

		it('deletes the context on release when nobody chose to remember it', async () => {
			const { server, gateway, store } = setup();
			await server.callTool(navigate(LEDGERLY));

			await server.release('task ended');

			expect(gateway.releaseSession).toHaveBeenCalledWith('user-1', 'bb-1');
			expect(gateway.deleteContext).toHaveBeenCalledWith('user-1', 'ctx-1');
			expect(store.add).not.toHaveBeenCalled();
		});
	});

	describe('step 3: remember at hand-back', () => {
		it('binds to the page the user is on and saves the login with its region', async () => {
			const { server, gateway, store, pagesBySession } = setup();
			await server.callTool(navigate(LEDGERLY));
			pagesBySession.set('bb-1', [LEDGERLY]);

			const site = await server.handBack(true);
			await server.release('task ended');

			expect(site).toBe('ledgerly.example.com');
			expect(store.add).toHaveBeenCalledWith({
				userId: 'user-1',
				site: 'ledgerly.example.com',
				label: 'ledgerly.example.com',
				region: 'us-west-2',
				contextId: 'ctx-1',
			});
			expect(gateway.deleteContext).not.toHaveBeenCalled();
		});

		it('offers the checkbox for the current page site, until a saved login is in use', async () => {
			const { server, pagesBySession } = setup();
			await server.callTool(navigate(LEDGERLY));
			pagesBySession.set('bb-1', ['https://ledgerly.example.com/login']);

			const view = await server.getLiveView();

			expect(view?.loginSite).toBe('ledgerly.example.com');
		});
	});

	describe('step 4: cleanup before release', () => {
		it('clears every other site from a remembered context, before the release', async () => {
			const { server, gateway, servers, pagesBySession } = setup();
			pagesBySession.set('bb-1', [LEDGERLY, 'https://news.ycombinator.com/']);
			await server.callTool(navigate(LEDGERLY));
			pagesBySession.set('bb-1', [LEDGERLY]);
			await server.handBack(true);

			await server.release('task ended');

			const clear = vi.mocked(servers.get('bb-1')!.connection.clearSiteDataExcept);
			expect(clear).toHaveBeenCalledTimes(1);
			const [keep, origins] = clear.mock.calls[0];
			// Cookies the browser sends to the Ledgerly host: its own and its parent domain's.
			expect(keep.cookieDomain('ledgerly.example.com')).toBe(true);
			expect(keep.cookieDomain('example.com')).toBe(true);
			expect(keep.cookieDomain('n8n.example.com')).toBe(false);
			expect(keep.cookieDomain('accounts.google.com')).toBe(false);
			// Storage of the Ledgerly origin only.
			expect(keep.origin('ledgerly.example.com')).toBe(true);
			expect(keep.origin('example.com')).toBe(false);
			expect(keep.origin('n8n.example.com')).toBe(false);
			expect([...(origins ?? [])]).toContain('https://news.ycombinator.com');
			expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
				gateway.releaseSession.mock.invocationCallOrder[0],
			);
		});

		it('does not clean a context it is about to delete', async () => {
			const { server, servers } = setup();
			await server.callTool(navigate(LEDGERLY));

			await server.release('task ended');

			expect(servers.get('bb-1')!.connection.clearSiteDataExcept).not.toHaveBeenCalled();
		});
	});

	describe('step 5: reuse with consent and region', () => {
		it('asks before using a saved login, and starts no session until answered', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly });

			const result = await server.callTool(navigate(LEDGERLY));

			expect(result.isError).toBe(true);
			const text = textOf(result);
			expect(text.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)).toBe(true);
			expect(JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length))).toMatchObject({
				toolGroup: 'saved-login',
				resource: 'ledgerly.example.com',
			});
			expect(gateway.createSession).not.toHaveBeenCalled();
		});

		it('opens the saved login in its region once allowed, and keeps it on release', async () => {
			const { server, gateway, store, catalog } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(LEDGERLY));

			const result = await server.callTool(navigate(LEDGERLY, 'allowOnce'));
			await server.release('task ended');

			// The saved login's answer is not taken for a domain answer.
			expect(catalog.checkAccess).toHaveBeenLastCalledWith(navigate(LEDGERLY));
			expect(gateway.createContext).not.toHaveBeenCalled();
			expect(gateway.createSession).toHaveBeenCalledWith('user-1', {
				context: { id: 'ctx-saved', persist: true },
				region: 'eu-central-1',
			});
			expect(textOf(result)).toContain('saved login for ledgerly.example.com');
			expect(gateway.deleteContext).not.toHaveBeenCalled();
			expect(store.touch).toHaveBeenCalledWith('login-1', {
				lastUsedAt: expect.any(String),
				lastVerifiedAt: expect.any(String),
			});
		});

		it('does not ask again in the same conversation after "use it"', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(LEDGERLY));
			await server.callTool(navigate(LEDGERLY, 'allowForSession'));
			await server.release('task ended');

			const result = await server.callTool(navigate(LEDGERLY));

			expect(result.isError).toBeFalsy();
			expect(gateway.createSession).toHaveBeenCalledTimes(2);
		});

		it('signs in afresh when the user declines', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(LEDGERLY));

			const result = await server.callTool(navigate(LEDGERLY, 'denyOnce'));

			expect(result.isError).toBeFalsy();
			expect(gateway.createSession).toHaveBeenCalledWith('user-1', {
				context: { id: 'ctx-1', persist: true },
				region: undefined,
			});
		});
	});

	describe('step 6: a second site in a task, one live browser', () => {
		const LEDGERLY_LOGIN = 'https://ledgerly.example.com/login';
		const OTHER_LOGIN = 'https://anotherdifferentsite.com/login';

		function startSession(url: string, confirmation?: string) {
			return {
				name: 'browser_start_session',
				arguments: confirmation ? { url, _confirmation: confirmation } : { url },
			};
		}

		/** Signs in to Ledgerly in the first browser, without a saved login. */
		async function signedInToLedgerly(ctx: ReturnType<typeof setup>) {
			ctx.pagesBySession.set('bb-1', [LEDGERLY_LOGIN]);
			await ctx.server.callTool(navigate(LEDGERLY));
			ctx.pagesBySession.set('bb-1', [LEDGERLY]);
			await ctx.server.handBack(false);
		}

		it('keeps navigation to other sites in the browser in use', async () => {
			const { server, gateway, servers } = setup();
			await server.callTool(navigate(LEDGERLY));

			await server.callTool(navigate(OTHER));

			expect(gateway.createSession).toHaveBeenCalledTimes(1);
			expect(servers.get('bb-1')?.callTool).toHaveBeenLastCalledWith(navigate(OTHER));
		});

		it('does not hand off a sign-in for another site, and says to start a session', async () => {
			const ctx = setup();
			await signedInToLedgerly(ctx);
			ctx.pagesBySession.set('bb-1', [OTHER_LOGIN]);

			const result = await ctx.server.callTool(navigate(OTHER));

			expect(ctx.gateway.createSession).toHaveBeenCalledTimes(1);
			const text = textOf(result);
			expect(text).not.toContain('handOff');
			expect(text).toContain(`call browser_start_session with ${OTHER}`);
		});

		it('closes the signed-in browser, keeps its context, and reopens it on switching back', async () => {
			const ctx = setup();
			const { server, gateway, servers, pagesBySession } = ctx;
			await signedInToLedgerly(ctx);
			pagesBySession.set('bb-2', [OTHER_LOGIN]);

			const started = await server.callTool(startSession(OTHER));

			// One browser at a time: the Ledgerly one is cleaned up and released, not deleted.
			expect(vi.mocked(servers.get('bb-1')!.connection.clearSiteDataExcept)).toHaveBeenCalled();
			expect(gateway.releaseSession).toHaveBeenCalledWith('user-1', 'bb-1');
			expect(gateway.deleteContext).not.toHaveBeenCalled();
			expect(gateway.createSession).toHaveBeenLastCalledWith('user-1', {
				context: { id: 'ctx-2', persist: true },
				region: undefined,
			});
			const startedText = textOf(started);
			expect(startedText).toContain('Closed the browser for ledgerly.example.com');
			expect(startedText).toContain('https://live/bb-2/p0');

			// The user signs in to the other site, then the agent goes back to Ledgerly.
			pagesBySession.set('bb-2', [OTHER]);
			await server.handBack(false);
			pagesBySession.set('bb-3', [LEDGERLY]);
			const back = await server.callTool(startSession(LEDGERLY));

			expect(gateway.releaseSession).toHaveBeenCalledWith('user-1', 'bb-2');
			expect(gateway.createSession).toHaveBeenLastCalledWith('user-1', {
				context: { id: 'ctx-1', persist: true },
				region: 'us-west-2',
			});
			expect(servers.get('bb-3')?.callTool).toHaveBeenLastCalledWith(navigate(LEDGERLY));
			expect(textOf(back)).toContain('Reopened the browser for ledgerly.example.com');
		});

		it('settles every context of the task when it ends', async () => {
			const ctx = setup();
			const { server, gateway, store, pagesBySession } = ctx;
			pagesBySession.set('bb-1', [LEDGERLY_LOGIN]);
			await server.callTool(navigate(LEDGERLY));
			pagesBySession.set('bb-1', [LEDGERLY]);
			await server.handBack(true);
			pagesBySession.set('bb-2', [OTHER_LOGIN]);
			await server.callTool(startSession(OTHER));

			await server.release('task ended');

			expect(store.add).toHaveBeenCalledWith(
				expect.objectContaining({
					site: 'ledgerly.example.com',
					contextId: 'ctx-1',
				}),
			);
			expect(gateway.deleteContext).toHaveBeenCalledWith('user-1', 'ctx-2');
			expect(gateway.deleteContext).not.toHaveBeenCalledWith('user-1', 'ctx-1');
		});

		it('does not switch while the user is still signing in', async () => {
			const { server, gateway, pagesBySession } = setup();
			pagesBySession.set('bb-1', [LEDGERLY_LOGIN]);
			await server.callTool(navigate(LEDGERLY));

			const result = await server.callTool(startSession(OTHER));

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain('still signing in');
			expect(gateway.createSession).toHaveBeenCalledTimes(1);
		});

		it('asks for the saved login of the site it switches to', async () => {
			const ctx = setup({ saved: savedLedgerly });
			const { server, gateway, pagesBySession } = ctx;
			pagesBySession.set('bb-1', [OTHER_LOGIN]);
			await server.callTool(navigate(OTHER));
			pagesBySession.set('bb-1', [OTHER]);
			await server.handBack(false);

			const card = await server.callTool(startSession(LEDGERLY));
			expect(textOf(card)).toContain('saved-login');

			await server.callTool(startSession(LEDGERLY, 'allowOnce'));
			expect(gateway.createSession).toHaveBeenLastCalledWith('user-1', {
				context: { id: 'ctx-saved', persist: true },
				region: 'eu-central-1',
			});
		});

		it('reuses a browser nobody signed in to, or replaces it for a saved login', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(OTHER));

			// No saved login for the site: the same browser is used.
			await server.callTool(startSession('https://third.example/app'));
			expect(gateway.createSession).toHaveBeenCalledTimes(1);

			// A saved login: the empty browser is closed and its context deleted.
			await server.callTool(startSession(LEDGERLY));
			await server.callTool(startSession(LEDGERLY, 'allowOnce'));
			expect(gateway.releaseSession).toHaveBeenCalledWith('user-1', 'bb-1');
			expect(gateway.deleteContext).toHaveBeenCalledWith('user-1', 'ctx-1');
			expect(gateway.createSession).toHaveBeenCalledTimes(2);
		});

		it('opens a saved login on navigation while the browser has no sign-in', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(OTHER));
			await server.callTool(navigate(LEDGERLY));

			await server.callTool(navigate(LEDGERLY, 'allowOnce'));

			expect(gateway.createSession).toHaveBeenLastCalledWith('user-1', {
				context: { id: 'ctx-saved', persist: true },
				region: 'eu-central-1',
			});
		});

		it('refuses a saved login another task is using', async () => {
			const { server, gateway } = setup({ saved: savedLedgerly, inUseElsewhere: true });

			const result = await server.callTool(navigate(LEDGERLY));

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain('in use by another browser task');
			expect(gateway.createSession).not.toHaveBeenCalled();
		});

		it('treats another app on the same domain as another site', async () => {
			const ctx = setup({ saved: savedLedgerly });
			await ctx.server.callTool(navigate(LEDGERLY));
			ctx.pagesBySession.set('bb-1', [LEDGERLY]);
			await ctx.server.callTool(navigate(LEDGERLY, 'allowOnce'));
			const N8N = 'https://n8n.example.com/signin';
			ctx.pagesBySession.set('bb-1', [N8N]);

			const result = await ctx.server.callTool(navigate(N8N));

			// No saved login card for it, and its sign-in does not land in Ledgerly's login.
			const text = textOf(result);
			expect(text).not.toContain('saved-login');
			expect(text).not.toContain('handOff');
			expect(text).toContain(`call browser_start_session with ${N8N}`);
		});

		it('keeps redirects and expired sign-ins on the bound site in the same session', async () => {
			const { server, gateway, pagesBySession } = setup({ saved: savedLedgerly });
			await server.callTool(navigate(LEDGERLY));
			pagesBySession.set('bb-1', [LEDGERLY_LOGIN]);

			const result = await server.callTool(navigate(LEDGERLY, 'allowOnce'));

			expect(gateway.createSession).toHaveBeenCalledTimes(1);
			expect(textOf(result)).toContain('handOff');
		});
	});
});
