import type { Logger } from '@n8n/backend-common';
import type { AffectedResource, BrowserToolkit, ToolDefinition } from '@n8n/mcp-browser';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import {
	CloudBrowserLocalMcpServer,
	SESSION_IDLE_TIMEOUT_MS,
	START_SESSION_TOOL_NAME,
} from '../browser/cloud-browser-local-mcp-server';
import type { CloudBrowserSessionProvider } from '../browser/cloud-browser-session-provider';

describe('CloudBrowserLocalMcpServer', () => {
	const scope = { userId: 'user-1', jobId: 'job-1' };
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
		const server = new CloudBrowserLocalMcpServer({
			scope,
			sessionProvider,
			createToolkit,
			toolContext: { dir: '/tmp' },
			logger,
		});
		const start = async (args: Record<string, unknown>) =>
			await server.callTool({ name: START_SESSION_TOOL_NAME, arguments: args });
		return { server, sessionProvider, openSessions, createToolkit, toolkits, start, logger };
	}

	describe('tool listing', () => {
		it('lists browser_start_session first, then the toolkit tools without connect', () => {
			const { server } = setup();

			const names = server.getAvailableTools().map((tool) => tool.name);

			expect(names).toEqual([
				START_SESSION_TOOL_NAME,
				'browser_navigate',
				'browser_click',
				'browser_create_credential',
			]);
		});

		it('returns its tools for the browser category only', () => {
			const { server } = setup();

			expect(server.getToolsByCategory('browser')).toBe(server.getAvailableTools());
			expect(server.getToolsByCategory('filesystem')).toEqual([]);
		});
	});

	describe('getAffectedResources', () => {
		it('gives the URL host for browser_start_session, without opening a session', async () => {
			const { server, sessionProvider } = setup();

			const resources = await server.getAffectedResources({
				name: START_SESSION_TOOL_NAME,
				arguments: { url: 'https://example.com/login' },
			});

			expect(resources).toEqual([hostResource('example.com')]);
			expect(sessionProvider.createSession).not.toHaveBeenCalled();
		});

		it.each([
			['a URL with no host', 'about:blank'],
			['a malformed URL', 'not a url'],
		])('gives nothing for browser_start_session with %s', async (_case, url) => {
			const { server } = setup();

			const resources = await server.getAffectedResources({
				name: START_SESSION_TOOL_NAME,
				arguments: { url },
			});

			expect(resources).toEqual([]);
		});

		it('gives what a tool on the active session touches', async () => {
			const { server, start } = setup();
			await start({ url: 'https://example.com' });

			const [click, navigate] = await Promise.all([
				server.getAffectedResources({ name: 'browser_click', arguments: { ref: 'e1' } }),
				server.getAffectedResources({
					name: 'browser_navigate',
					arguments: { url: 'https://other.example.com' },
				}),
			]);

			expect(click).toEqual([hostResource('current.example.com')]);
			expect(navigate).toEqual([hostResource('other.example.com')]);
		});

		it('gives a credential write for browser_create_credential', async () => {
			const { server, start } = setup();
			await start({ url: 'https://example.com' });

			const resources = await server.getAffectedResources({
				name: 'browser_create_credential',
				arguments: { name: 'Acme API' },
			});

			expect(resources).toEqual([expect.objectContaining({ kind: 'credential-write' })]);
		});

		it('gives every resource a tool touches, without the page with no host', async () => {
			const { server, toolkits, start } = setup();
			await start({ url: 'https://example.com' });
			const click = toolkits[0].tools.find(({ name }) => name === 'browser_click')!;
			click.getAffectedResources = () => [
				hostResource('one.example.com'),
				hostResource('browser'),
				hostResource('two.example.com'),
			];

			const resources = await server.getAffectedResources({
				name: 'browser_click',
				arguments: { ref: 'e1' },
			});

			expect(resources).toEqual([hostResource('one.example.com'), hostResource('two.example.com')]);
		});

		it('gives nothing for a tool when no session is open', async () => {
			const { server } = setup();

			const resources = await server.getAffectedResources({
				name: 'browser_click',
				arguments: { ref: 'e1' },
			});

			expect(resources).toEqual([]);
		});

		it.each([
			['a hidden tool', 'browser_connect', {}],
			['an unknown tool', 'browser_does_not_exist', {}],
			['arguments that do not parse', 'browser_click', { ref: 1 }],
		])('gives nothing for %s', async (_case, name, args) => {
			const { server, start } = setup();
			await start({ url: 'https://example.com' });

			expect(await server.getAffectedResources({ name, arguments: args })).toEqual([]);
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

		it('says no session is open after the job released it', async () => {
			const { server, start } = setup();
			await start({ url: 'https://example.com' });
			await server.release();

			const result = await server.callTool({ name: 'browser_click', arguments: { ref: 'e1' } });

			expect(result).toEqual(noSessionResult);
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
});
