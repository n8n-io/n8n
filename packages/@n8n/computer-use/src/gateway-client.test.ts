import type { Mock, Mocked } from 'vitest';
/**
 * Unit tests for GatewayClient.checkPermissions (tested indirectly via dispatchToolCall).
 *
 * The private checkPermissions method is exercised by mocking the tool registry
 * so we can control what AffectedResources are returned, then asserting side-effects
 * on the session and the decisions taken.
 */

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports
// ---------------------------------------------------------------------------

// Suppress logger noise during tests
vi.mock('./logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
	printAuthFailure: vi.fn(),
	printDisconnected: vi.fn(),
	printReconnecting: vi.fn(),
	printReinitFailed: vi.fn(),
	printReinitializing: vi.fn(),
	printToolCall: vi.fn(),
	printToolResult: vi.fn(),
}));

// Mock tool modules that pull in native/ESM-only dependencies
vi.mock('./tools/shell', () => ({
	['ShellModule']: { isSupported: vi.fn().mockResolvedValue(false), definitions: [] },
}));
vi.mock('./tools/filesystem', () => ({
	filesystemReadTools: [],
	filesystemWriteTools: [],
}));
vi.mock('./tools/screenshot', () => ({
	['ScreenshotModule']: { isSupported: vi.fn().mockResolvedValue(false), definitions: [] },
}));
vi.mock('./tools/mouse-keyboard', () => ({
	['MouseKeyboardModule']: { isSupported: vi.fn().mockResolvedValue(false), definitions: [] },
}));
vi.mock('./tools/browser', () => ({
	['BrowserModule']: { create: vi.fn().mockResolvedValue(null) },
}));

import type { GatewayConfig } from './config';
import { GatewayAuthError, GatewayClient } from './gateway-client';
import type { GatewaySession } from './gateway-session';
import type { AffectedResource, ConfirmResourceAccess, ToolDefinition } from './tools/types';
import { INSTANCE_RESOURCE_DECISION_KEYS } from './tools/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(permissionConfirmation: 'client' | 'instance' = 'client'): GatewayConfig {
	return {
		logLevel: 'silent',
		allowedOrigins: [],
		filesystem: { dir: '/' },
		computer: { shell: { timeout: 30_000 } },
		browser: { defaultBrowser: 'chrome' },
		permissions: {},
		permissionConfirmation,
	};
}

function makeSession(overrides: Partial<GatewaySession> = {}): Mocked<GatewaySession> {
	return {
		dir: '/tmp',
		check: vi.fn().mockReturnValue('ask'),
		getAllPermissions: vi.fn().mockReturnValue({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'ask',
			computer: 'deny',
			browser: 'ask',
		}),
		setPermissions: vi.fn(),
		setDir: vi.fn(),
		getGroupMode: vi.fn().mockReturnValue('allow'),
		allowForSession: vi.fn(),
		clearSession: vi.fn(),
		alwaysAllow: vi.fn(),
		alwaysDeny: vi.fn(),
		flush: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as Mocked<GatewaySession>;
}

const SHELL_RESOURCE: AffectedResource = {
	toolGroup: 'shell',
	resource: 'npm install',
	description: 'Run npm install',
};

/** A minimal tool definition that returns a given resource list and a simple result. */
function makeTool(resources: AffectedResource[]): ToolDefinition {
	return {
		name: 'test_tool',
		description: 'Test tool',
		inputSchema: { parse: (x: unknown) => x } as ToolDefinition['inputSchema'],
		annotations: {},
		execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
		getAffectedResources: vi.fn().mockResolvedValue(resources),
	};
}

/**
 * Build a minimal GatewayClient with a single registered tool, bypassing the
 * normal async initialisation (uploadCapabilities / getAllDefinitions).
 */
function makeClient(
	session: Mocked<GatewaySession>,
	confirmResourceAccess: ConfirmResourceAccess,
	permissionConfirmation: 'client' | 'instance' = 'client',
	resources: AffectedResource[] = [SHELL_RESOURCE],
): GatewayClient {
	const client = new GatewayClient({
		url: 'http://localhost:5678',
		apiKey: 'tok',
		config: makeConfig(permissionConfirmation),
		session,
		confirmResourceAccess,
	});

	const tool = makeTool(resources);

	// Inject the tool directly so dispatchToolCall finds it without network I/O.
	// @ts-expect-error — accessing private field for testing
	client.allDefinitions = [tool];
	// @ts-expect-error — accessing private field for testing
	client.definitionMap = new Map([[tool.name, tool]]);

	return client;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GatewayClient.checkPermissions', () => {
	describe('client mode', () => {
		it('allowOnce — does not modify session permissions', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn().mockResolvedValue('allowOnce');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(confirmResourceAccess).toHaveBeenCalledWith(SHELL_RESOURCE);
			expect(session.setPermissions).not.toHaveBeenCalled();
			expect(session.alwaysAllow).not.toHaveBeenCalled();
		});

		it('allowForSession — allows the specific resource for the session', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn().mockResolvedValue('allowForSession');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(session.allowForSession).toHaveBeenCalledWith('shell', 'npm install');
			expect(session.setPermissions).not.toHaveBeenCalled();
		});

		it('alwaysAllow — delegates to session.alwaysAllow', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn().mockResolvedValue('alwaysAllow');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(session.alwaysAllow).toHaveBeenCalledWith('shell', 'npm install');
		});

		it('denyOnce — throws without persisting', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn().mockResolvedValue('denyOnce');
			const client = makeClient(session, confirmResourceAccess);

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'User denied access',
			);
			expect(session.setPermissions).not.toHaveBeenCalled();
			expect(session.alwaysDeny).not.toHaveBeenCalled();
		});

		it('alwaysDeny — persists and throws', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn().mockResolvedValue('alwaysDeny');
			const client = makeClient(session, confirmResourceAccess);

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'User permanently denied',
			);
			expect(session.alwaysDeny).toHaveBeenCalledWith('shell', 'npm install');
		});

		it('skips confirmation when session.check returns allow', async () => {
			const session = makeSession({ check: vi.fn().mockReturnValue('allow') });
			const confirmResourceAccess = vi.fn();
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(confirmResourceAccess).not.toHaveBeenCalled();
		});

		it('throws immediately when session.check returns deny', async () => {
			const session = makeSession({ check: vi.fn().mockReturnValue('deny') });
			const confirmResourceAccess = vi.fn();
			const client = makeClient(session, confirmResourceAccess);

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'User permanently denied',
			);
			expect(confirmResourceAccess).not.toHaveBeenCalled();
		});
	});

	describe('instance mode', () => {
		it('throws GATEWAY_CONFIRMATION_REQUIRED with the 3-option list', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn();
			const client = makeClient(session, confirmResourceAccess, 'instance');

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'GATEWAY_CONFIRMATION_REQUIRED::',
			);

			// Extract the JSON payload from the error
			let errorMessage = '';
			try {
				await client['dispatchToolCall']('test_tool', {});
			} catch (e) {
				errorMessage = e instanceof Error ? e.message : '';
			}
			let json: { options: string[] };
			try {
				json = JSON.parse(errorMessage.slice('GATEWAY_CONFIRMATION_REQUIRED::'.length)) as {
					options: string[];
				};
			} catch {
				throw new Error(`Failed to parse GATEWAY_CONFIRMATION_REQUIRED payload: ${errorMessage}`);
			}
			expect(json.options).toEqual(INSTANCE_RESOURCE_DECISION_KEYS);
		});

		it('applies _confirmation decision in instance mode without prompting', async () => {
			const session = makeSession();
			const confirmResourceAccess = vi.fn();
			const client = makeClient(session, confirmResourceAccess, 'instance');

			// Simulate the agent sending back _confirmation=allowForSession
			await client['dispatchToolCall']('test_tool', { _confirmation: 'allowForSession' });

			expect(session.allowForSession).toHaveBeenCalledWith('shell', 'npm install');
			expect(confirmResourceAccess).not.toHaveBeenCalled();
		});
	});
});

describe('GatewayClient.uploadCapabilities', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	function makeMinimalClient(): GatewayClient {
		const client = new GatewayClient({
			url: 'http://localhost:5678',
			apiKey: 'tok',
			config: makeConfig(),
			session: makeSession(),
			confirmResourceAccess: vi.fn(),
		});

		// Bypass tool discovery — uploadCapabilities only needs definitions to exist.
		// @ts-expect-error — accessing private field for testing
		client.allDefinitions = [];
		// @ts-expect-error — accessing private field for testing
		client.activeToolCategories = [];

		return client;
	}

	function mockFetchResponse(status: number, body = ''): void {
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: status >= 200 && status < 300,
			status,
			text: vi.fn().mockResolvedValue(body),
			json: vi.fn().mockResolvedValue({ data: { ok: true } }),
		});
	}

	it('throws GatewayAuthError on 401', async () => {
		mockFetchResponse(401, 'invalid token');
		const client = makeMinimalClient();

		await expect(client['uploadCapabilities']()).rejects.toBeInstanceOf(GatewayAuthError);
	});

	it('throws GatewayAuthError on 403', async () => {
		mockFetchResponse(403, 'forbidden');
		const client = makeMinimalClient();

		await expect(client['uploadCapabilities']()).rejects.toBeInstanceOf(GatewayAuthError);
	});

	it('throws plain Error on non-auth failure (500)', async () => {
		mockFetchResponse(500, 'server exploded');
		const client = makeMinimalClient();

		const promise = client['uploadCapabilities']();
		await expect(promise).rejects.not.toBeInstanceOf(GatewayAuthError);
		await expect(promise).rejects.toThrow(/Failed to upload capabilities: 500/);
	});
});
