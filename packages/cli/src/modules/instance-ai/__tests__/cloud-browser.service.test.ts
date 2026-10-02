import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import type { CreateCredentialPayload, ToolContext } from '@n8n/mcp-browser';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayBrowserbaseService } from '@/services/ai-gateway-browserbase.service';

import { BrowserLocalMcpServer } from '../browser/browser-local-mcp-server';
import { CloudBrowserService } from '../browser/cloud-browser.service';

import * as mcpBrowser from '@n8n/mcp-browser';

vi.mock('@n8n/mcp-browser', () => ({
	createBrowserTools: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
}));

const createBrowserTools = mcpBrowser.createBrowserTools as unknown as Mock;

const USER_ID = 'user-1';
const CONNECT_URL = 'wss://connect.browserbase.com?signingKey=abc';

/** A tool that hands back the context the server runs it with. */
function contextCapturingTool(onContext: (context: ToolContext) => void) {
	return {
		name: 'capture_context',
		description: 'Captures the tool context',
		inputSchema: z.object({}),
		execute: (_args: unknown, context: ToolContext) => {
			onContext(context);
			return { content: [] };
		},
		getAffectedResources: () => [],
	};
}

function fakeConnection() {
	return {
		connect: vi.fn().mockResolvedValue({ browser: 'chrome', pages: [] }),
		shutdown: vi.fn().mockResolvedValue(undefined),
	};
}

describe('CloudBrowserService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const provider = mock<AiGatewayBrowserbaseService>();
	const userRepository = mock<UserRepository>();
	const credentialsService = mock<CredentialsService>();
	let connection: ReturnType<typeof fakeConnection>;
	let service: CloudBrowserService;

	beforeEach(() => {
		connection = fakeConnection();
		createBrowserTools.mockReturnValue({ tools: [], connection });
		let sessionNumber = 0;
		provider.createSession.mockImplementation(async () => ({
			sessionId: `sess-${++sessionNumber}`,
			connectUrl: CONNECT_URL,
		}));
		provider.releaseSession.mockResolvedValue(undefined);
		service = new CloudBrowserService(logger, provider, userRepository, credentialsService);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('startSession()', () => {
		it('creates a session and connects to it directly over CDP', async () => {
			const server = await service.startSession(USER_ID, 'run-1');

			expect(server).toBeInstanceOf(BrowserLocalMcpServer);
			expect(provider.createSession).toHaveBeenCalledWith(USER_ID);
			expect(createBrowserTools).toHaveBeenCalledWith(
				{ mode: 'direct-cdp' },
				{ cdpEndpoint: CONNECT_URL },
			);
			expect(connection.connect).toHaveBeenCalled();
		});

		it('refuses a second session for the same run', async () => {
			await service.startSession(USER_ID, 'run-1');

			await expect(service.startSession(USER_ID, 'run-1')).rejects.toThrow(
				'A browser session is already active',
			);
			expect(provider.createSession).toHaveBeenCalledTimes(1);
		});

		it('refuses a second session for the same run while the first is still starting', async () => {
			const first = service.startSession(USER_ID, 'run-1');

			await expect(service.startSession(USER_ID, 'run-1')).rejects.toThrow(
				'A browser session is already active',
			);
			await first;
			expect(provider.createSession).toHaveBeenCalledTimes(1);
		});

		it('lets another run start its own session', async () => {
			await service.startSession(USER_ID, 'run-1');
			await service.startSession(USER_ID, 'run-2');

			expect(provider.createSession).toHaveBeenCalledTimes(2);
		});

		it('releases the session and rethrows when connecting fails', async () => {
			connection.connect.mockRejectedValueOnce(new Error('connect failed'));

			await expect(service.startSession(USER_ID, 'run-1')).rejects.toThrow('connect failed');
			expect(provider.releaseSession).toHaveBeenCalledWith(USER_ID, 'sess-1');

			await service.startSession(USER_ID, 'run-1');
			expect(provider.createSession).toHaveBeenCalledTimes(2);
		});
	});

	describe('tool context', () => {
		async function startAndCaptureContext(): Promise<ToolContext> {
			let captured: ToolContext | undefined;
			createBrowserTools.mockReturnValue({
				tools: [contextCapturingTool((context) => (captured = context))],
				connection,
			});
			const server = await service.startSession(USER_ID, 'run-1');
			await server.callTool({ name: 'capture_context', arguments: {} });
			return captured!;
		}

		it('works in a per-user directory', async () => {
			const { dir } = await startAndCaptureContext();

			const expectedDir = join(tmpdir(), 'n8n-instance-ai-cloud-browser', USER_ID);
			expect(dir).toBe(expectedDir);
			expect(mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
		});

		it('keeps captured secrets per credentials key until cleared', async () => {
			const { secretsBuffer } = await startAndCaptureContext();

			secretsBuffer?.capture('key-1', 'apiKey', 'secret-value');

			expect(secretsBuffer?.getFields('key-1')).toEqual(new Map([['apiKey', 'secret-value']]));
			secretsBuffer?.clear('key-1');
			expect(secretsBuffer?.getFields('key-1')).toBeUndefined();
		});

		it('creates credentials as the session user', async () => {
			const user = mock<User>({ id: USER_ID });
			userRepository.findOne.mockResolvedValue(user);
			credentialsService.createUnmanagedCredential.mockResolvedValue(
				mock({ id: 'cred-1' }) as never,
			);
			const payload = mock<CreateCredentialPayload>();
			const context = await startAndCaptureContext();

			const result = await context.createCredential?.(payload);

			expect(result).toEqual({ credentialId: 'cred-1' });
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: USER_ID },
				relations: ['role'],
			});
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(payload, user);
		});

		it('fails to create credentials when the session user no longer exists', async () => {
			userRepository.findOne.mockResolvedValue(null);
			const context = await startAndCaptureContext();

			await expect(context.createCredential?.(mock<CreateCredentialPayload>())).rejects.toThrow(
				'User for browser session not found',
			);
		});
	});

	describe('getSessionServer()', () => {
		it("returns the server of the run's open session, and nothing once it ends", async () => {
			const server = await service.startSession(USER_ID, 'run-1');

			expect(service.getSessionServer('run-1')).toBe(server);
			expect(service.getSessionServer('run-2')).toBeUndefined();

			await service.endSession('run-1');

			expect(service.getSessionServer('run-1')).toBeUndefined();
		});
	});

	describe('endSession()', () => {
		it('disconnects and releases the run session', async () => {
			await service.startSession(USER_ID, 'run-1');

			await service.endSession('run-1');

			expect(connection.shutdown).toHaveBeenCalled();
			expect(provider.releaseSession).toHaveBeenCalledWith(USER_ID, 'sess-1');
		});

		it('does nothing when the run has no session', async () => {
			await service.endSession('run-1');

			expect(provider.releaseSession).not.toHaveBeenCalled();
		});

		it('releases the session only once', async () => {
			await service.startSession(USER_ID, 'run-1');

			await service.endSession('run-1');
			await service.endSession('run-1');

			expect(provider.releaseSession).toHaveBeenCalledTimes(1);
		});

		it('still releases the session when disconnecting fails', async () => {
			connection.shutdown.mockRejectedValue(new Error('shutdown failed'));
			await service.startSession(USER_ID, 'run-1');

			await service.endSession('run-1');

			expect(provider.releaseSession).toHaveBeenCalledWith(USER_ID, 'sess-1');
		});

		it('rethrows a release failure', async () => {
			provider.releaseSession.mockRejectedValue(new Error('release failed'));
			await service.startSession(USER_ID, 'run-1');

			await expect(service.endSession('run-1')).rejects.toThrow('release failed');
		});
	});

	describe('releaseRun()', () => {
		it('logs a release failure instead of throwing', async () => {
			provider.releaseSession.mockRejectedValue(new Error('release failed'));
			await service.startSession(USER_ID, 'run-1');

			await expect(service.releaseRun('run-1')).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('shutdown()', () => {
		it('releases the session of every run', async () => {
			await service.startSession(USER_ID, 'run-1');
			await service.startSession(USER_ID, 'run-2');

			await service.shutdown();

			expect(provider.releaseSession).toHaveBeenCalledWith(USER_ID, 'sess-1');
			expect(provider.releaseSession).toHaveBeenCalledWith(USER_ID, 'sess-2');
		});
	});
});
