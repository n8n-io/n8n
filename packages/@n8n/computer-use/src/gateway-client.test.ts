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
jest.mock('./logger', () => ({
	logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() },
	printAuthFailure: jest.fn(),
	printDisconnected: jest.fn(),
	printReconnecting: jest.fn(),
	printReinitFailed: jest.fn(),
	printReinitializing: jest.fn(),
	printToolCall: jest.fn(),
	printToolResult: jest.fn(),
}));

// Mock tool modules that pull in native/ESM-only dependencies
jest.mock('./tools/shell', () => ({
	['ShellModule']: { isSupported: jest.fn().mockResolvedValue(false), definitions: [] },
}));
jest.mock('./tools/filesystem', () => ({
	filesystemReadTools: [],
	filesystemWriteTools: [],
}));
jest.mock('./tools/screenshot', () => ({
	['ScreenshotModule']: { isSupported: jest.fn().mockResolvedValue(false), definitions: [] },
}));
jest.mock('./tools/mouse-keyboard', () => ({
	['MouseKeyboardModule']: { isSupported: jest.fn().mockResolvedValue(false), definitions: [] },
}));
jest.mock('./tools/browser', () => ({
	['BrowserModule']: { create: jest.fn().mockResolvedValue(null) },
}));

import type { GatewayConfig } from './config';
import { GatewayClient } from './gateway-client';
import type { GatewaySession } from './gateway-session';
import type { AffectedResource, ConfirmResourceAccess, ToolDefinition } from './tools/types';
import { INSTANCE_RESOURCE_DECISION_KEYS } from './tools/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(permissionConfirmation: 'client' | 'instance' = 'client'): GatewayConfig {
	return {
		logLevel: 'silent',
		port: 0,
		allowedOrigins: [],
		filesystem: { dir: '/' },
		computer: { shell: { timeout: 30_000 } },
		browser: { defaultBrowser: 'chrome' },
		permissions: {},
		permissionConfirmation,
	};
}

function makeSession(overrides: Partial<GatewaySession> = {}): jest.Mocked<GatewaySession> {
	return {
		dir: '/tmp',
		check: jest.fn().mockReturnValue('ask'),
		getAllPermissions: jest.fn().mockReturnValue({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'ask',
			computer: 'deny',
			browser: 'ask',
		}),
		setPermissions: jest.fn(),
		setDir: jest.fn(),
		getGroupMode: jest.fn().mockReturnValue('allow'),
		allowForSession: jest.fn(),
		clearSessionRules: jest.fn(),
		alwaysAllow: jest.fn(),
		alwaysDeny: jest.fn(),
		flush: jest.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as jest.Mocked<GatewaySession>;
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
		execute: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
		getAffectedResources: jest.fn().mockResolvedValue(resources),
	};
}

/**
 * Build a minimal GatewayClient with a single registered tool, bypassing the
 * normal async initialisation (uploadCapabilities / getAllDefinitions).
 */
function makeClient(
	session: jest.Mocked<GatewaySession>,
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
			const confirmResourceAccess = jest.fn().mockResolvedValue('allowOnce');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(confirmResourceAccess).toHaveBeenCalledWith(SHELL_RESOURCE);
			expect(session.setPermissions).not.toHaveBeenCalled();
			expect(session.alwaysAllow).not.toHaveBeenCalled();
		});

		it('allowForSession — allows the specific resource for the session', async () => {
			const session = makeSession();
			const confirmResourceAccess = jest.fn().mockResolvedValue('allowForSession');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(session.allowForSession).toHaveBeenCalledWith('shell', 'npm install');
			expect(session.setPermissions).not.toHaveBeenCalled();
		});

		it('alwaysAllow — delegates to session.alwaysAllow', async () => {
			const session = makeSession();
			const confirmResourceAccess = jest.fn().mockResolvedValue('alwaysAllow');
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(session.alwaysAllow).toHaveBeenCalledWith('shell', 'npm install');
		});

		it('denyOnce — throws without persisting', async () => {
			const session = makeSession();
			const confirmResourceAccess = jest.fn().mockResolvedValue('denyOnce');
			const client = makeClient(session, confirmResourceAccess);

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'User denied access',
			);
			expect(session.setPermissions).not.toHaveBeenCalled();
			expect(session.alwaysDeny).not.toHaveBeenCalled();
		});

		it('alwaysDeny — persists and throws', async () => {
			const session = makeSession();
			const confirmResourceAccess = jest.fn().mockResolvedValue('alwaysDeny');
			const client = makeClient(session, confirmResourceAccess);

			await expect(client['dispatchToolCall']('test_tool', {})).rejects.toThrow(
				'User permanently denied',
			);
			expect(session.alwaysDeny).toHaveBeenCalledWith('shell', 'npm install');
		});

		it('skips confirmation when session.check returns allow', async () => {
			const session = makeSession({ check: jest.fn().mockReturnValue('allow') });
			const confirmResourceAccess = jest.fn();
			const client = makeClient(session, confirmResourceAccess);

			await client['dispatchToolCall']('test_tool', {});

			expect(confirmResourceAccess).not.toHaveBeenCalled();
		});

		it('throws immediately when session.check returns deny', async () => {
			const session = makeSession({ check: jest.fn().mockReturnValue('deny') });
			const confirmResourceAccess = jest.fn();
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
			const confirmResourceAccess = jest.fn();
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
			const confirmResourceAccess = jest.fn();
			const client = makeClient(session, confirmResourceAccess, 'instance');

			// Simulate the agent sending back _confirmation=allowForSession
			await client['dispatchToolCall']('test_tool', { _confirmation: 'allowForSession' });

			expect(session.allowForSession).toHaveBeenCalledWith('shell', 'npm install');
			expect(confirmResourceAccess).not.toHaveBeenCalled();
		});
	});
});
