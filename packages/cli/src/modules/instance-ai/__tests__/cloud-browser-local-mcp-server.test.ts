import type { Logger } from '@n8n/backend-common';
import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX, type McpToolCallResult } from '@n8n/api-types';
import type { DomainAccessTracker } from '@n8n/instance-ai';
import {
	createBrowserTools,
	type AffectedResource,
	type BrowserToolkit,
	type ToolDefinition,
} from '@n8n/mcp-browser';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import {
	CLOUD_BROWSER_TOOLS,
	CloudBrowserLocalMcpServer,
	SESSION_IDLE_TIMEOUT_MS,
	START_SESSION_TOOL_NAME,
} from '../browser/cloud-browser-local-mcp-server';
import type { BrowserDomainGate } from '../browser/browser.helpers';
import type { CloudBrowserSessionProvider } from '../browser/cloud-browser-session-provider';

describe('CloudBrowserLocalMcpServer', () => {
	const scope = { userId: 'user-1', threadId: 'thread-1', taskId: 'task-1' };
	const noSessionResult = {
		content: [
			{
				type: 'text',
				text: 'No browser session is open. Call browser_start_session with a URL to open a session.',
			},
		],
		isError: true,
	};
	const disconnectedResult = {
		content: [
			{
				type: 'text',
				text: 'The browser session closed unexpectedly. Its pages, sign-ins and cookies are gone. Call browser_start_session with a URL to open a session.',
			},
		],
		isError: true,
	};
	const idleResult = {
		content: [
			{
				type: 'text',
				text: 'The browser session was closed because no browser tool was used for 15 minutes. Its pages, sign-ins and cookies are gone. Call browser_start_session with a URL to open a session.',
			},
		],
		isError: true,
	};

	const hostResource = (host: string): AffectedResource => ({
		toolGroup: 'browser',
		kind: 'host',
		resource: host,
		description: `Browser: ${host}`,
	});

	function fakeToolkit() {
		const navigate = {
			name: 'browser_navigate',
			inputSchema: z.object({ url: z.string() }),
			execute: vi.fn(async ({ url }: { url: string }) => ({
				content: [{ type: 'text', text: `opened ${url}` }],
			})),
			// Like the real tool: the URL's host, or 'browser' when it has none.
			getAffectedResources: ({ url }: { url: string }) => [
				hostResource(new URL(url).hostname || 'browser'),
			],
		} as unknown as ToolDefinition;
		const connection = {
			isConnected: true,
			getConnection: () => ({ activePageId: 'page-1' }),
			connect: vi.fn().mockResolvedValue(undefined),
			disconnect: vi.fn().mockResolvedValue(undefined),
		};
		const click = {
			name: 'browser_click',
			inputSchema: z.object({ ref: z.string() }),
			execute: vi.fn(async ({ ref }: { ref: string }) => ({
				content: [{ type: 'text', text: `clicked ${ref}` }],
			})),
			// Like the real tool: the host of the page it acts on.
			getAffectedResources: () => [hostResource('current.example.com')],
		} as unknown as ToolDefinition;
		const createCredential = {
			name: 'browser_create_credential',
			inputSchema: z.object({ name: z.string() }),
			execute: vi.fn(),
			getAffectedResources: ({ name }: { name: string }) => [
				{
					toolGroup: 'browser',
					kind: 'credential-write',
					resource: 'credentials',
					description: `Create credential "${name}"`,
				},
			],
		} as unknown as ToolDefinition;
		const connect = {
			name: 'browser_connect',
			inputSchema: z.object({}),
			execute: vi.fn(),
			getAffectedResources: () => [],
		};
		const cookies = {
			name: 'browser_cookies',
			inputSchema: z.object({}),
			execute: vi.fn(),
			getAffectedResources: () => [],
		};
		return {
			tools: [navigate, click, createCredential, connect, cookies],
			connection,
		} as unknown as BrowserToolkit & {
			connection: typeof connection;
		};
	}

	function setup() {
		const sessionProvider = mock<CloudBrowserSessionProvider>();
		// Sessions created and not yet released, so a test can check what is left open.
		const openSessions = new Set<string>();
		let sessionCount = 0;
		sessionProvider.createSession.mockImplementation(async () => {
			sessionCount++;
			const id = `sess-${sessionCount}`;
			openSessions.add(id);
			return { id, connectUrl: `wss://connect/${sessionCount}` };
		});
		sessionProvider.releaseSession.mockImplementation(async (_scope, id) => {
			openSessions.delete(id);
		});
		const toolkits: Array<ReturnType<typeof fakeToolkit>> = [];
		const createToolkit = vi.fn((connectUrl?: string) => {
			const toolkit = fakeToolkit();
			// Only session toolkits, not the one the constructor lists the tools from.
			if (connectUrl) toolkits.push(toolkit);
			return toolkit;
		});
		const logger = mock<Logger>();
		// Allows every site unless a test says otherwise.
		const tracker = mock<DomainAccessTracker>();
		tracker.isHostAllowed.mockReturnValue(true);
		const domainGate: BrowserDomainGate = { tracker, runId: 'run-1' };
		const server = new CloudBrowserLocalMcpServer({
			scope,
			sessionProvider,
			createToolkit,
			toolContext: { dir: '/tmp' },
			domainGate,
			logger,
		});
		const start = async (args: Record<string, unknown>) =>
			await server.callTool({ name: START_SESSION_TOOL_NAME, arguments: args });
		return {
			server,
			sessionProvider,
			openSessions,
			createToolkit,
			toolkits,
			start,
			logger,
			tracker,
			domainGate,
		};
	}

	describe('tool listing', () => {
		it('lists browser_start_session first, then only the allowed toolkit tools', () => {
			const { server } = setup();

			const names = server.getAvailableTools().map((tool) => tool.name);

			expect(names).toEqual([
				START_SESSION_TOOL_NAME,
				'browser_navigate',
				'browser_click',
				'browser_create_credential',
			]);
		});

		it('allows only tools that exist in the real toolkit', () => {
			const toolkitNames = createBrowserTools({ mode: 'remote' }).tools.map((tool) => tool.name);

			expect(toolkitNames).toEqual(expect.arrayContaining([...CLOUD_BROWSER_TOOLS]));
		});

		it('returns its tools for the browser category only', () => {
			const { server } = setup();

			expect(server.getToolsByCategory('browser')).toBe(server.getAvailableTools());
			expect(server.getToolsByCategory('filesystem')).toEqual([]);
		});
	});

	describe('access gate', () => {
		const deniedResult = {
			content: [{ type: 'text', text: 'Access denied by user' }],
			isError: true,
		};
		const toolOn = (toolkit: ReturnType<typeof fakeToolkit>, name: string) =>
			toolkit.tools.find((tool) => tool.name === name)!;
		/** The payload of a confirmation request, or `undefined` for any other result. */
		const confirmationRequest = (result: McpToolCallResult): unknown => {
			const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
			if (!result.isError || !text.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)) return;
			return JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length));
		};
		const noHostResult = {
			content: [
				{
					type: 'text',
					text: 'This browser action only works on websites. Use a website address.',
				},
			],
			isError: true,
		};
		const domainRequest = (host: string) => ({
			toolGroup: 'browser',
			kind: 'host',
			resource: host,
			description: `Browser: ${host}`,
			options: ['denyOnce', 'allowOnce', 'allowForSession'],
		});

		describe('browser_start_session', () => {
			it('asks about the URL host and opens no session', async () => {
				const { sessionProvider, tracker, start } = setup();
				tracker.isHostAllowed.mockReturnValue(false);

				const result = await start({ url: 'https://example.com/login' });

				expect(confirmationRequest(result)).toEqual(domainRequest('example.com'));
				expect(tracker.isHostAllowed).toHaveBeenCalledWith('example.com', 'run-1');
				expect(sessionProvider.createSession).not.toHaveBeenCalled();
			});

			it.each([
				['allowOnce', 'approveOnce'],
				['allowForSession', 'approveDomain'],
			] as const)(
				'records %s and opens the session when the call runs again',
				async (decision, method) => {
					const { sessionProvider, tracker, start } = setup();
					tracker.isHostAllowed.mockReturnValue(false);

					const result = await start({ url: 'https://example.com', _confirmation: decision });

					expect(result).toEqual({
						content: [{ type: 'text', text: 'opened https://example.com' }],
					});
					expect(tracker[method]).toHaveBeenCalled();
					expect(sessionProvider.createSession).toHaveBeenCalledTimes(1);
				},
			);

			it('opens no session when the user denies the URL host', async () => {
				const { sessionProvider, tracker, start } = setup();
				tracker.isHostAllowed.mockReturnValue(false);

				const result = await start({ url: 'https://example.com', _confirmation: 'denyOnce' });

				expect(result).toEqual(deniedResult);
				expect(sessionProvider.createSession).not.toHaveBeenCalled();
			});

			it('opens no session when the admin blocks browser access', async () => {
				const { sessionProvider, domainGate, start } = setup();
				domainGate.permissionMode = 'blocked';

				const result = await start({ url: 'https://example.com' });

				expect(result).toEqual({
					content: [{ type: 'text', text: 'Browser access blocked by admin' }],
					isError: true,
				});
				expect(sessionProvider.createSession).not.toHaveBeenCalled();
			});

			it('uses a replaced gate from the next call on', async () => {
				const { server, sessionProvider, tracker, start } = setup();
				server.setDomainGate({ tracker, runId: 'run-2', permissionMode: 'blocked' });

				const result = await start({ url: 'https://example.com' });

				expect(result).toEqual({
					content: [{ type: 'text', text: 'Browser access blocked by admin' }],
					isError: true,
				});
				expect(sessionProvider.createSession).not.toHaveBeenCalled();
			});

			it('opens the session without asking when the admin allows every site', async () => {
				const { sessionProvider, tracker, domainGate, start } = setup();
				domainGate.permissionMode = 'always_allow';
				tracker.isHostAllowed.mockReturnValue(false);

				await start({ url: 'https://example.com' });

				expect(sessionProvider.createSession).toHaveBeenCalledTimes(1);
			});

			it.each(['about:blank', 'data:text/html,<p>hi</p>', 'file:///etc/passwd'])(
				'refuses %s, which has no host, and opens no session',
				async (url) => {
					const { sessionProvider, start } = setup();

					const result = await start({ url });

					expect(result).toEqual(noHostResult);
					expect(sessionProvider.createSession).not.toHaveBeenCalled();
				},
			);

			it('refuses a host called "browser", which cannot load in the cloud browser', async () => {
				const { sessionProvider, start } = setup();

				const result = await start({ url: 'http://browser:8080' });

				expect(result).toEqual(noHostResult);
				expect(sessionProvider.createSession).not.toHaveBeenCalled();
			});
		});

		describe('other browser tools', () => {
			it('asks about the page an action touches, and does not run it', async () => {
				const { server, toolkits, tracker, start } = setup();
				await start({ url: 'https://example.com' });
				tracker.isHostAllowed.mockReturnValue(false);

				const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

				expect(confirmationRequest(result)).toEqual(domainRequest('current.example.com'));
				expect(toolOn(toolkits[0], 'browser_click').execute).not.toHaveBeenCalled();
			});

			it("runs the action with the user's answer, without passing the answer to the tool", async () => {
				const { server, toolkits, tracker, start } = setup();
				await start({ url: 'https://example.com' });
				tracker.isHostAllowed.mockReturnValue(false);

				const result = await server.callTool({
					name: 'browser_click',
					arguments: { ref: 'e1', _confirmation: 'allowOnce' },
				});

				expect(result).toEqual({ content: [{ type: 'text', text: 'clicked e1' }] });
				expect(tracker.approveOnce).toHaveBeenCalledWith('run-1', 'current.example.com');
				expect(toolOn(toolkits[0], 'browser_click').execute).toHaveBeenCalledWith(
					{ ref: 'e1' },
					{ dir: '/tmp' },
				);
			});

			it('asks about a credential write', async () => {
				const { server, toolkits, start } = setup();
				await start({ url: 'https://example.com' });

				const result = await server.callTool({
					name: 'browser_create_credential',
					arguments: { name: 'Acme API' },
				});

				expect(confirmationRequest(result)).toEqual({
					toolGroup: 'browser',
					kind: 'credential-write',
					resource: 'credentials',
					description: 'Create credential "Acme API"',
					options: ['denyOnce', 'allowOnce'],
				});
				expect(toolOn(toolkits[0], 'browser_create_credential').execute).not.toHaveBeenCalled();
			});

			it('creates the credential when the user allows it once', async () => {
				const { server, toolkits, start } = setup();
				await start({ url: 'https://example.com' });

				await server.callTool({
					name: 'browser_create_credential',
					arguments: { name: 'Acme API', _confirmation: 'allowOnce' },
				});

				expect(toolOn(toolkits[0], 'browser_create_credential').execute).toHaveBeenCalled();
			});

			it('applies the answer to the first resource that needs one, then asks about the next', async () => {
				const { server, toolkits, tracker, start } = setup();
				await start({ url: 'https://example.com' });
				const click = toolOn(toolkits[0], 'browser_click');
				click.getAffectedResources = () => [
					hostResource('one.example.com'),
					hostResource('two.example.com'),
					hostResource('three.example.com'),
				];
				tracker.isHostAllowed.mockImplementation((host) => host === 'one.example.com');

				const result = await server.callTool({
					name: 'browser_click',
					arguments: { ref: 'e1', _confirmation: 'allowOnce' },
				});

				expect(tracker.approveOnce).toHaveBeenCalledTimes(1);
				expect(tracker.approveOnce).toHaveBeenCalledWith('run-1', 'two.example.com');
				expect(confirmationRequest(result)).toEqual(domainRequest('three.example.com'));
				expect(click.execute).not.toHaveBeenCalled();
			});

			it('refuses a navigation to a URL with no host', async () => {
				const { server, toolkits, start } = setup();
				await start({ url: 'https://example.com' });

				const result = await server.callTool({
					name: 'browser_navigate',
					arguments: { url: 'about:blank' },
				});

				expect(result).toEqual(noHostResult);
				expect(toolOn(toolkits[0], 'browser_navigate').execute).toHaveBeenCalledTimes(1);
			});

			it('refuses a page action on a page with no host, even when every site is allowed', async () => {
				const { server, toolkits, domainGate, start } = setup();
				await start({ url: 'https://example.com' });
				domainGate.permissionMode = 'always_allow';
				const click = toolOn(toolkits[0], 'browser_click');
				click.getAffectedResources = () => [hostResource('browser')];

				const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

				expect(result).toEqual(noHostResult);
				expect(click.execute).not.toHaveBeenCalled();
			});

			it('does not run a tool whose resources cannot be read', async () => {
				const { server, toolkits, start } = setup();
				await start({ url: 'https://example.com' });
				const click = toolOn(toolkits[0], 'browser_click');
				click.getAffectedResources = () => {
					throw new Error('no page');
				};

				const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

				expect(result.isError).toBe(true);
				expect(click.execute).not.toHaveBeenCalled();
			});

			it('asks about an action called during a session start, on the new session', async () => {
				const { server, sessionProvider, toolkits, tracker, start } = setup();
				tracker.isHostAllowed.mockImplementation((host) => host === 'example.com');
				let openSession!: () => void;
				sessionProvider.createSession.mockImplementationOnce(async () => {
					await new Promise<void>((resolve) => (openSession = resolve));
					return { id: 'sess-1', connectUrl: 'wss://connect/1' };
				});

				const started = start({ url: 'https://example.com' });
				await vi.waitFor(() => expect(sessionProvider.createSession).toHaveBeenCalled());
				const navigated = server.callTool({
					name: 'browser_navigate',
					arguments: { url: 'https://other.example.com' },
				});
				openSession();
				const [, result] = await Promise.all([started, navigated]);

				expect(confirmationRequest(result)).toEqual(domainRequest('other.example.com'));
				const navigate = toolOn(toolkits[0], 'browser_navigate');
				expect(navigate.execute).toHaveBeenCalledTimes(1);
				expect(navigate.execute).toHaveBeenCalledWith(
					{ url: 'https://example.com' },
					{ dir: '/tmp' },
				);
			});
		});
	});

	describe('browser_start_session', () => {
		it('returns an error without a URL and opens no session', async () => {
			const { sessionProvider, start } = setup();

			const result = await start({});

			expect(result.isError).toBe(true);
			expect(sessionProvider.createSession).not.toHaveBeenCalled();
		});

		it('returns an error for a malformed URL and opens no session', async () => {
			const { sessionProvider, start } = setup();

			const result = await start({ url: 'not a url' });

			expect(result.isError).toBe(true);
			expect(sessionProvider.createSession).not.toHaveBeenCalled();
		});

		it('opens a session, connects to it and navigates to the URL', async () => {
			const { sessionProvider, createToolkit, toolkits, start } = setup();

			const result = await start({ url: 'https://example.com' });

			expect(sessionProvider.createSession).toHaveBeenCalledWith(scope);
			expect(createToolkit).toHaveBeenCalledWith('wss://connect/1');
			expect(toolkits[0].connection.connect).toHaveBeenCalled();
			expect(result).toEqual({ content: [{ type: 'text', text: 'opened https://example.com' }] });
		});

		it('ends the open session before it opens the next one', async () => {
			const { sessionProvider, toolkits, start } = setup();
			await start({ url: 'https://example.com' });

			await start({ url: 'https://example.org' });

			expect(toolkits[0].connection.disconnect).toHaveBeenCalled();
			expect(sessionProvider.releaseSession).toHaveBeenCalledWith(scope, 'sess-1');
			expect(sessionProvider.createSession).toHaveBeenCalledTimes(2);
		});

		it('releases the session and returns an error when connecting fails', async () => {
			const { openSessions, createToolkit, start } = setup();
			createToolkit.mockImplementationOnce(() => {
				const toolkit = fakeToolkit();
				toolkit.connection.connect.mockRejectedValue(new Error('CDP refused'));
				return toolkit;
			});

			const result = await start({ url: 'https://example.com' });

			expect(result).toEqual({
				content: [{ type: 'text', text: 'Could not open a browser session: CDP refused' }],
				isError: true,
			});
			expect(openSessions.size).toBe(0);
		});

		it('releases the session and returns an error when creating the toolkit fails', async () => {
			const { openSessions, createToolkit, start } = setup();
			createToolkit.mockImplementationOnce(() => {
				throw new Error('toolkit failed');
			});

			const result = await start({ url: 'https://example.com' });

			expect(result).toEqual({
				content: [{ type: 'text', text: 'Could not open a browser session: toolkit failed' }],
				isError: true,
			});
			expect(openSessions.size).toBe(0);
		});

		it('closes the first session when two starts overlap', async () => {
			const { server, openSessions, start } = setup();

			await Promise.all([
				start({ url: 'https://one.example.com' }),
				start({ url: 'https://two.example.com' }),
			]);

			expect([...openSessions]).toEqual(['sess-2']);

			await server.release();

			expect(openSessions.size).toBe(0);
		});

		it('runs an action called during a session start on the new session', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://one.example.com' });

			const restarted = start({ url: 'https://two.example.com' });
			const clicked = server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			const [, result] = await Promise.all([restarted, clicked]);

			expect(result).toEqual({ content: [{ type: 'text', text: 'clicked e1' }] });
			const clickOn = (index: number) =>
				toolkits[index].tools.find(({ name }) => name === 'browser_click')!.execute;
			expect(clickOn(1)).toHaveBeenCalledTimes(1);
			expect(clickOn(0)).not.toHaveBeenCalled();
		});

		it('logs a release that fails instead of throwing', async () => {
			const { server, sessionProvider, logger, start } = setup();
			await start({ url: 'https://example.com' });
			sessionProvider.releaseSession.mockRejectedValueOnce(new Error('HTTP 502'));

			await expect(server.release()).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to release cloud browser session',
				expect.objectContaining({ sessionId: 'sess-1', error: 'HTTP 502' }),
			);
		});

		it('waits for a start in progress before it releases', async () => {
			const { server, openSessions, start } = setup();

			const started = start({ url: 'https://example.com' });
			await server.release();
			await started;

			expect(openSessions.size).toBe(0);
		});

		it('keeps starting sessions after a start fails', async () => {
			const { sessionProvider, start } = setup();
			sessionProvider.createSession.mockRejectedValueOnce(new Error('HTTP 502'));

			const [failed, started] = await Promise.all([
				start({ url: 'https://one.example.com' }),
				start({ url: 'https://two.example.com' }),
			]);

			expect(failed.isError).toBe(true);
			expect(started).toEqual({
				content: [{ type: 'text', text: 'opened https://two.example.com' }],
			});
		});

		it('returns an error when no session can be created', async () => {
			const { sessionProvider, toolkits, start } = setup();
			sessionProvider.createSession.mockRejectedValue(new Error('HTTP 402'));

			const result = await start({ url: 'https://example.com' });

			expect(result).toEqual({
				content: [{ type: 'text', text: 'Could not open a browser session: HTTP 402' }],
				isError: true,
			});
			expect(toolkits).toHaveLength(0);
		});
	});

	describe('other browser tools', () => {
		it('refuses a call on a tab other than the active one', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });

			const result = await server.callTool({
				name: 'browser_click',
				arguments: { ref: 'e1', pageId: 'page-2' },
			});

			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Browser tools work only in the current tab. To use a page that opened in a new tab, open its URL in this tab with browser_navigate.',
					},
				],
				isError: true,
			});
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).not.toHaveBeenCalled();
		});

		it('refuses a call with a pageId when the connection is gone', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.getConnection = () => {
				throw new Error('Not connected');
			};

			const result = await server.callTool({
				name: 'browser_click',
				arguments: { ref: 'e1', pageId: 'page-1' },
			});

			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Browser tools work only in the current tab. To use a page that opened in a new tab, open its URL in this tab with browser_navigate.',
					},
				],
				isError: true,
			});
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).not.toHaveBeenCalled();
		});

		it('runs a call that names the active tab', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });

			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1', pageId: 'page-1' } });

			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).toHaveBeenCalled();
		});

		it('asks for browser_start_session when no session is open', async () => {
			const { server } = setup();

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual(noSessionResult);
		});

		it('releases a session whose connection dropped and says its state is gone', async () => {
			const { server, openSessions, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual(disconnectedResult);
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).not.toHaveBeenCalled();
			expect(openSessions.size).toBe(0);
		});

		it('releases a dropped session once when parallel calls find it', async () => {
			const { server, sessionProvider, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;

			await Promise.all([
				server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } }),
				server.callTool({ name: 'browser_click', arguments: { ref: 'e2' } }),
			]);

			expect(sessionProvider.releaseSession).toHaveBeenCalledTimes(1);
		});

		it('keeps saying the session dropped until a new one is started', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;
			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e2' } });

			expect(result).toEqual(disconnectedResult);
		});

		it('stops saying the session dropped once a start is attempted, even if it fails', async () => {
			const { server, sessionProvider, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;
			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			sessionProvider.createSession.mockRejectedValueOnce(new Error('HTTP 502'));
			await start({ url: 'https://example.com' });

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual(noSessionResult);
		});

		it('runs tools on a new session after the old one dropped', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;
			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			await start({ url: 'https://example.com' });
			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual({ content: [{ type: 'text', text: 'clicked e1' }] });
		});

		it('runs the tool on the active session with the tool context', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual({ content: [{ type: 'text', text: 'clicked e1' }] });
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).toHaveBeenCalledWith({ ref: 'e1' }, { dir: '/tmp' });
		});

		it.each(['browser_connect', 'browser_cookies', 'browser_does_not_exist'])(
			'refuses %s, which is not a tool the model can call',
			async (name) => {
				const { server, toolkits, start } = setup();
				await start({ url: 'https://example.com' });

				const result = await server.callTool({ name, arguments: {} });

				expect(result).toEqual({
					content: [{ type: 'text', text: `Unknown browser tool: ${name}` }],
					isError: true,
				});
				const hiddenTools = toolkits[0].tools.filter((tool) =>
					['browser_connect', 'browser_cookies'].includes(tool.name),
				);
				for (const tool of hiddenTools) {
					expect(tool.execute).not.toHaveBeenCalled();
				}
			},
		);
	});

	describe('release', () => {
		const releasedResult = {
			content: [{ type: 'text', text: 'The browser task has ended. No browser tools can run.' }],
			isError: true,
		};

		it('refuses every later call and opens no new session', async () => {
			const { server, sessionProvider, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			await server.release();

			const [restarted, clicked] = await Promise.all([
				start({ url: 'https://example.org' }),
				server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } }),
			]);

			expect(restarted).toEqual(releasedResult);
			expect(clicked).toEqual(releasedResult);
			expect(sessionProvider.createSession).toHaveBeenCalledTimes(1);
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).not.toHaveBeenCalled();
		});

		it('opens no session for a start that waited for the release', async () => {
			const { server, sessionProvider, openSessions, start } = setup();

			const released = server.release();
			const result = await start({ url: 'https://example.com' });
			await released;

			expect(result).toEqual(releasedResult);
			expect(sessionProvider.createSession).not.toHaveBeenCalled();
			expect(openSessions.size).toBe(0);
		});

		it('refuses an action that waited for the release', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });

			const released = server.release();
			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			await released;

			expect(result).toEqual(releasedResult);
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			expect(click?.execute).not.toHaveBeenCalled();
		});

		it('can be called twice', async () => {
			const { server, sessionProvider, start } = setup();
			await start({ url: 'https://example.com' });

			await server.release();
			await expect(server.release()).resolves.toBeUndefined();

			expect(sessionProvider.releaseSession).toHaveBeenCalledTimes(1);
		});
	});

	describe('idle release', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('releases the session after the idle timeout', async () => {
			const { server, openSessions, start } = setup();
			await start({ url: 'https://example.com' });

			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS);

			expect(openSessions.size).toBe(0);
			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			expect(result).toEqual(idleResult);
		});

		it('restarts the idle timeout after each tool call', async () => {
			const { server, openSessions, start } = setup();
			await start({ url: 'https://example.com' });

			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS - 1000);
			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS - 1000);

			expect([...openSessions]).toEqual(['sess-1']);

			await vi.advanceTimersByTimeAsync(1000);

			expect(openSessions.size).toBe(0);
		});

		it('does not release the session while a tool call is running', async () => {
			const { server, openSessions, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click');
			let finishClick: () => void = () => {};
			vi.mocked(click!.execute).mockImplementation(
				async () =>
					await new Promise((resolve) => {
						finishClick = () => resolve({ content: [{ type: 'text', text: 'clicked' }] });
					}),
			);

			const call = server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS * 2);

			expect([...openSessions]).toEqual(['sess-1']);

			finishClick();
			await call;
			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS);

			expect(openSessions.size).toBe(0);
		});

		it('does not start the idle timeout when no session is open', async () => {
			const { server, sessionProvider } = setup();

			await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });
			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS);

			expect(sessionProvider.releaseSession).not.toHaveBeenCalled();
		});

		it('stops the idle timeout when the session is released', async () => {
			const { server, sessionProvider, start } = setup();
			await start({ url: 'https://example.com' });

			await server.release();
			await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS);

			expect(sessionProvider.releaseSession).toHaveBeenCalledTimes(1);
		});
	});

	describe('getLiveView', () => {
		it('has no session before the agent opens one', async () => {
			const { server } = setup();

			expect(await server.getLiveView()).toEqual({ status: 'no-session' });
		});

		it('is starting while the session opens', async () => {
			const { server, sessionProvider, start } = setup();
			let openSession!: () => void;
			sessionProvider.createSession.mockImplementationOnce(async () => {
				await new Promise<void>((resolve) => (openSession = resolve));
				return { id: 'sess-1', connectUrl: 'wss://connect/1' };
			});

			const started = start({ url: 'https://example.com' });
			await vi.waitFor(() => expect(sessionProvider.createSession).toHaveBeenCalled());

			expect(await server.getLiveView()).toEqual({ status: 'starting' });
			openSession();
			await started;
		});

		it('has no session after a session failed to open', async () => {
			const { server, sessionProvider, start } = setup();
			sessionProvider.createSession.mockRejectedValueOnce(new Error('HTTP 502'));

			const result = await start({ url: 'https://example.com' });

			expect(result.isError).toBe(true);
			expect(await server.getLiveView()).toEqual({ status: 'no-session' });
		});

		it('rejects when the live view link cannot be fetched', async () => {
			const { server, sessionProvider, start } = setup();
			sessionProvider.getSessionLiveViewUrl.mockRejectedValue(new Error('HTTP 502'));
			await start({ url: 'https://example.com' });

			await expect(server.getLiveView()).rejects.toThrow('HTTP 502');
		});

		it("returns the session's live view link", async () => {
			const { server, sessionProvider, start } = setup();
			sessionProvider.getSessionLiveViewUrl.mockResolvedValue('https://live.example.com/1');
			await start({ url: 'https://example.com' });

			expect(await server.getLiveView()).toEqual({
				status: 'live',
				liveViewUrl: 'https://live.example.com/1',
			});
			expect(sessionProvider.getSessionLiveViewUrl).toHaveBeenCalledWith(scope, 'sess-1');
		});

		it('is starting when a new session replaced the one it asked about', async () => {
			const { server, sessionProvider, start } = setup();
			await start({ url: 'https://example.com' });
			sessionProvider.createSession.mockResolvedValueOnce({
				id: 'sess-2',
				connectUrl: 'wss://connect/2',
			});
			sessionProvider.getSessionLiveViewUrl.mockImplementation(async (_scope, sessionId) => {
				// The agent opens a new session while the gateway answers for the first one.
				if (sessionId === 'sess-1') await start({ url: 'https://example.org' });
				return `https://live.example.com/${sessionId}`;
			});

			expect(await server.getLiveView()).toEqual({ status: 'starting' });
		});

		it('is disconnected when the connection dropped', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			toolkits[0].connection.isConnected = false;

			expect(await server.getLiveView()).toEqual({
				status: 'disconnected',
				reason: 'connectionLost',
			});
		});

		it('is not found once the task released its browser', async () => {
			const { server, start } = setup();
			await start({ url: 'https://example.com' });
			await server.release();

			expect(await server.getLiveView()).toEqual({ status: 'not-found' });
		});

		describe('after an idle timeout', () => {
			beforeEach(() => vi.useFakeTimers());
			afterEach(() => vi.useRealTimers());

			it('is disconnected', async () => {
				const { server, start } = setup();
				await start({ url: 'https://example.com' });
				await vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS);

				expect(await server.getLiveView()).toEqual({
					status: 'disconnected',
					reason: 'idleTimeout',
				});
			});
		});
	});
});
