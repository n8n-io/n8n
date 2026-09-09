import type { Mock } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ProjectRepository, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Push } from '@/push';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';

import {
	CDP_TOKEN_HEADER,
	type BrowserUseUpgradeRequest,
} from '../browser/browser-use-ws.constants';
import { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';

import * as mcpBrowser from '@n8n/mcp-browser';

vi.mock('@n8n/mcp-browser', () => {
	const createdRelays: unknown[] = [];
	class MockRelay {
		onExtensionConnect?: () => void;
		onExtensionDisconnect?: () => void;
		onRecordingCompleted?: (recording: unknown) => Promise<{ threadUrl?: string }>;
		onRecordingActionAppended?: (recordingId: string, action: unknown) => void;
		onRecordingScreenshotCaptured?: (recordingId: string, screenshot: unknown) => void;
		attachExtension = vi.fn();
		attachController = vi.fn();
		stop = vi.fn();
		startRecording = vi.fn(async () => ({ success: true }));
		stopAndSubmitRecording = vi.fn(async () => ({ success: true }));
		discardRecording = vi.fn(async () => undefined);
		constructor() {
			createdRelays.push(this);
		}
	}
	return {
		__createdRelays: createdRelays,
		CDPRelayServer: MockRelay,
		createBrowserTools: vi.fn(() => ({
			tools: [],
			connection: { shutdown: vi.fn(async () => undefined) },
		})),
		buildExtensionConnectUrl: (endpoint: string) =>
			`chrome-extension://ext-id/connect.html?mcpRelayUrl=${encodeURIComponent(endpoint)}`,
		// A visible marker (rather than the identity function) so tests can tell a field
		// actually went through redaction, not just that it was passed along unchanged.
		redactString: (value: string) => `redacted(${value})`,
	};
});

const mcpBrowserMock: {
	__createdRelays: Array<{
		onExtensionConnect?: () => void;
		onExtensionDisconnect?: () => void;
		onRecordingCompleted?: (recording: unknown) => Promise<{ threadUrl?: string }>;
		onRecordingActionAppended?: (recordingId: string, action: unknown) => void;
		onRecordingScreenshotCaptured?: (recordingId: string, screenshot: unknown) => void;
		attachExtension: Mock;
		attachController: Mock;
		stop: Mock;
		startRecording: Mock;
		stopAndSubmitRecording: Mock;
		discardRecording: Mock;
	}>;
	createBrowserTools: Mock;
} = mcpBrowser as unknown as {
	__createdRelays: Array<{
		onExtensionConnect?: () => void;
		onExtensionDisconnect?: () => void;
		onRecordingCompleted?: (recording: unknown) => Promise<{ threadUrl?: string }>;
		onRecordingActionAppended?: (recordingId: string, action: unknown) => void;
		onRecordingScreenshotCaptured?: (recordingId: string, screenshot: unknown) => void;
		attachExtension: Mock;
		attachController: Mock;
		stop: Mock;
		startRecording: Mock;
		stopAndSubmitRecording: Mock;
		discardRecording: Mock;
	}>;
	createBrowserTools: Mock;
};

const USER_ID = 'user-1';

function extensionRequest(sessionId: string, token: string | null, extensionVersion?: unknown) {
	const ws = { close: vi.fn() };
	const req = {
		params: { sessionId },
		query: {
			...(token === null ? {} : { token }),
			...(extensionVersion === undefined ? {} : { extensionVersion }),
		},
		headers: {},
		socket: { remoteAddress: '127.0.0.1' },
		ws,
	} as unknown as BrowserUseUpgradeRequest;
	return { req, ws };
}

function cdpRequest(sessionId: string, token: string | null, remoteAddress = '127.0.0.1') {
	const ws = { close: vi.fn() };
	const req = {
		params: { sessionId },
		query: {},
		headers: token === null ? {} : { [CDP_TOKEN_HEADER]: token },
		socket: { remoteAddress },
		ws,
	} as unknown as BrowserUseUpgradeRequest;
	return { req, ws };
}

/** Create a session via the public flow and return its routing identifiers. */
async function createSession(service: InstanceAiBrowserSessionService) {
	const { connectUrl } = await service.createLink(USER_ID);
	const relayEndpoint = new URL(connectUrl).searchParams.get('mcpRelayUrl')!;
	const relayUrl = new URL(relayEndpoint);
	const sessionId = relayUrl.pathname.split('/').pop()!;
	const extToken = relayUrl.searchParams.get('token')!;
	const lastCall = mcpBrowserMock.createBrowserTools.mock.calls.at(-1)!;
	const cdpToken = (lastCall[1] as { cdpConnectHeaders: Record<string, string> }).cdpConnectHeaders[
		CDP_TOKEN_HEADER
	];
	const relay = mcpBrowserMock.__createdRelays.at(-1)!;
	return { sessionId, extToken, cdpToken, relay, relayEndpoint, connectUrl };
}

/** `createSession` plus the extension-connect and personal-project lookup every
 *  recording-completion/caption test needs before it can call `startRecording`. */
async function createConnectedSession(
	service: InstanceAiBrowserSessionService,
	projectRepository: ReturnType<typeof mock<ProjectRepository>>,
) {
	const session = await createSession(service);
	session.relay.onExtensionConnect?.();
	projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'project-1' } as never);
	return session;
}

describe('InstanceAiBrowserSessionService', () => {
	const logger = mock<Logger>();
	const urlService = mock<UrlService>();
	const push = mock<Push>();
	const userRepository = mock<UserRepository>();
	const projectRepository = mock<ProjectRepository>();
	const credentialsService = mock<CredentialsService>();
	const globalConfig = mock<GlobalConfig>({ port: 5678 });
	const telemetry = mock<Telemetry>();
	let service: InstanceAiBrowserSessionService;

	beforeEach(() => {
		vi.clearAllMocks();
		mcpBrowserMock.__createdRelays.length = 0;
		logger.scoped.mockReturnValue(logger);
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		service = new InstanceAiBrowserSessionService(
			logger,
			urlService,
			push,
			userRepository,
			projectRepository,
			credentialsService,
			globalConfig,
			telemetry,
		);
	});

	describe('createLink', () => {
		it('builds a namespaced extension connect URL on the main host (no extra port)', async () => {
			const { relayEndpoint, sessionId } = await createSession(service);

			expect(relayEndpoint).toBe(
				`ws://localhost:5678/browser-use/extension/${sessionId}?token=${new URL(
					relayEndpoint,
				).searchParams.get('token')!}`,
			);
			expect(relayEndpoint).not.toContain(':5680');
		});

		it('uses wss when the instance base URL is https', async () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			const { relayEndpoint } = await createSession(service);
			expect(relayEndpoint.startsWith('wss://n8n.example.com/browser-use/extension/')).toBe(true);
		});

		it('rotates the extension token on each call but keeps the same session id', async () => {
			const first = await createSession(service);
			const second = await createSession(service);
			expect(second.sessionId).toBe(first.sessionId);
			expect(second.extToken).not.toBe(first.extToken);
		});
	});

	describe('handleExtensionUpgrade', () => {
		it('attaches the socket when the token matches', async () => {
			const { sessionId, extToken, relay } = await createSession(service);
			const { req, ws } = extensionRequest(sessionId, extToken);

			service.handleExtensionUpgrade(req);

			expect(relay.attachExtension).toHaveBeenCalledWith(ws);
			expect(ws.close).not.toHaveBeenCalled();
		});

		it('closes the socket for an unknown session id', async () => {
			await createSession(service);
			const { req, ws } = extensionRequest('does-not-exist', 'whatever');

			service.handleExtensionUpgrade(req);

			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
		});

		it('closes the socket when the token does not match', async () => {
			const { sessionId, relay } = await createSession(service);
			const { req, ws } = extensionRequest(sessionId, 'wrong-token');

			service.handleExtensionUpgrade(req);

			expect(relay.attachExtension).not.toHaveBeenCalled();
			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
		});

		it('rejects a still-valid token once it is past the connect TTL (before first connect)', async () => {
			const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
			const { sessionId, extToken, relay } = await createSession(service);

			nowSpy.mockReturnValue(1_000_000 + 6 * 60 * 1000);
			const { req, ws } = extensionRequest(sessionId, extToken);
			service.handleExtensionUpgrade(req);

			expect(relay.attachExtension).not.toHaveBeenCalled();
			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
			nowSpy.mockRestore();
		});

		it('accepts the token past the TTL once the extension has connected at least once', async () => {
			const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
			const { sessionId, extToken, relay } = await createSession(service);

			relay.onExtensionConnect?.(); // marks hasConnectedOnce

			nowSpy.mockReturnValue(1_000_000 + 6 * 60 * 1000);
			const { req, ws } = extensionRequest(sessionId, extToken);
			service.handleExtensionUpgrade(req);

			expect(relay.attachExtension).toHaveBeenCalledWith(ws);
			expect(ws.close).not.toHaveBeenCalled();
			nowSpy.mockRestore();
		});
	});

	describe('handleCdpUpgrade', () => {
		it('attaches the controller for a loopback peer with a matching token', async () => {
			const { sessionId, cdpToken, relay } = await createSession(service);
			const { req, ws } = cdpRequest(sessionId, cdpToken, '127.0.0.1');

			service.handleCdpUpgrade(req);

			expect(relay.attachController).toHaveBeenCalledWith(ws);
			expect(ws.close).not.toHaveBeenCalled();
		});

		it('closes the socket for a non-loopback peer even with a valid token', async () => {
			const { sessionId, cdpToken, relay } = await createSession(service);
			const { req, ws } = cdpRequest(sessionId, cdpToken, '10.0.0.5');

			service.handleCdpUpgrade(req);

			expect(relay.attachController).not.toHaveBeenCalled();
			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
		});

		it('closes the socket when the token header is missing or wrong', async () => {
			const { sessionId, relay } = await createSession(service);

			const missing = cdpRequest(sessionId, null, '127.0.0.1');
			service.handleCdpUpgrade(missing.req);
			const wrong = cdpRequest(sessionId, 'nope', '127.0.0.1');
			service.handleCdpUpgrade(wrong.req);

			expect(relay.attachController).not.toHaveBeenCalled();
			expect(missing.ws.close).toHaveBeenCalledWith(4003, expect.any(String));
			expect(wrong.ws.close).toHaveBeenCalledWith(4003, expect.any(String));
		});
	});

	describe('disconnect', () => {
		it('tears down the relay and forgets the session', async () => {
			const { sessionId, extToken, relay } = await createSession(service);

			await service.disconnect(USER_ID);

			expect(relay.stop).toHaveBeenCalledTimes(1);

			const { req, ws } = extensionRequest(sessionId, extToken);
			service.handleExtensionUpgrade(req);
			expect(relay.attachExtension).not.toHaveBeenCalled();
			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
		});
	});

	describe('getStatus', () => {
		it('reports connected with the browser category once the extension connects', async () => {
			const { relay } = await createSession(service);

			expect(service.getStatus(USER_ID).connected).toBe(false);

			relay.onExtensionConnect?.();

			const status = service.getStatus(USER_ID);
			expect(status.connected).toBe(true);
			expect(status.toolCategories).toEqual([{ name: 'browser', enabled: true }]);
		});

		it('tracks a connect event when the extension connects', async () => {
			const { relay } = await createSession(service);

			relay.onExtensionConnect?.();

			expect(telemetry.track).toHaveBeenCalledWith('Instance AI Browser connected', {
				user_id: USER_ID,
				browser_extension_version: null,
			});
		});
	});

	describe('extension version', () => {
		it('tracks the version reported on the upgrade', async () => {
			const { sessionId, extToken, relay } = await createSession(service);

			service.handleExtensionUpgrade(extensionRequest(sessionId, extToken, '0.0.7').req);
			relay.onExtensionConnect?.();

			expect(telemetry.track).toHaveBeenCalledWith('Instance AI Browser connected', {
				user_id: USER_ID,
				browser_extension_version: '0.0.7',
			});
			expect(service.getExtensionTraceContext(USER_ID)).toEqual({
				connectionState: 'connected',
				version: '0.0.7',
			});
		});

		it.each([
			['omitted, as pre-instrumentation extensions do', undefined],
			['not version-shaped', 'v0.0.7-beta'],
			['not a string', ['0.0.7']],
			['too long to be a Chrome version', '1.2.3.4.5'],
		])('records null when the version is %s', async (_case, reported) => {
			const { sessionId, extToken, relay } = await createSession(service);
			const { req, ws } = extensionRequest(sessionId, extToken, reported);

			service.handleExtensionUpgrade(req);
			relay.onExtensionConnect?.();

			expect(telemetry.track).toHaveBeenCalledWith('Instance AI Browser connected', {
				user_id: USER_ID,
				browser_extension_version: null,
			});
			// An unusable version must not cost the user their connection.
			expect(relay.attachExtension).toHaveBeenCalledWith(ws);
			expect(ws.close).not.toHaveBeenCalled();
		});

		it('re-reads the version on reconnect, so a silent auto-update is picked up', async () => {
			const { sessionId, extToken, relay } = await createSession(service);

			service.handleExtensionUpgrade(extensionRequest(sessionId, extToken, '0.0.6').req);
			relay.onExtensionConnect?.();
			relay.onExtensionDisconnect?.();
			service.handleExtensionUpgrade(extensionRequest(sessionId, extToken, '0.0.7').req);
			relay.onExtensionConnect?.();

			expect(service.getExtensionTraceContext(USER_ID)).toEqual({
				connectionState: 'connected',
				version: '0.0.7',
			});
		});

		it('reports connected with no version for a pre-instrumentation extension', async () => {
			const { sessionId, extToken, relay } = await createSession(service);

			service.handleExtensionUpgrade(extensionRequest(sessionId, extToken).req);
			relay.onExtensionConnect?.();

			expect(service.getExtensionTraceContext(USER_ID)).toEqual({ connectionState: 'connected' });
		});

		it('reports disconnected for a user with no session', () => {
			expect(service.getExtensionTraceContext('nobody')).toEqual({
				connectionState: 'disconnected',
			});
		});

		it('reports no version while disconnected', async () => {
			const { sessionId, extToken, relay } = await createSession(service);

			service.handleExtensionUpgrade(extensionRequest(sessionId, extToken, '0.0.7').req);
			relay.onExtensionConnect?.();
			relay.onExtensionDisconnect?.();

			expect(service.getExtensionTraceContext(USER_ID)).toEqual({
				connectionState: 'disconnected',
			});
		});
	});

	describe('startRecording / stopAndSubmitRecording', () => {
		it('returns false and sends nothing when the extension is not connected', async () => {
			const { relay } = await createSession(service);

			expect(await service.startRecording(USER_ID, 'thread-1')).toEqual({
				started: false,
				reason: expect.any(String),
			});
			expect(await service.stopAndSubmitRecording(USER_ID)).toEqual({
				stopped: false,
				reason: expect.any(String),
			});
			expect(relay.startRecording).not.toHaveBeenCalled();
			expect(relay.stopAndSubmitRecording).not.toHaveBeenCalled();
		});

		it('asks the connected extension to start recording, attributed to the given thread', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();

			expect(await service.startRecording(USER_ID, 'thread-1')).toEqual({ started: true });
			expect(relay.startRecording).toHaveBeenCalledTimes(1);
		});

		it('reports the extension-provided reason when it declines to start', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			relay.startRecording.mockResolvedValueOnce({
				success: false,
				error: 'Open a web page before recording.',
			});

			expect(await service.startRecording(USER_ID, 'thread-1')).toEqual({
				started: false,
				reason: 'Open a web page before recording.',
			});
		});

		it('asks the connected extension to stop and submit', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();

			expect(await service.stopAndSubmitRecording(USER_ID)).toEqual({ stopped: true });
			expect(relay.stopAndSubmitRecording).toHaveBeenCalledTimes(1);
		});

		it('reports the extension-provided reason when it declines to stop', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			relay.stopAndSubmitRecording.mockResolvedValueOnce({
				success: false,
				error: 'Record at least one action before sending.',
			});

			expect(await service.stopAndSubmitRecording(USER_ID)).toEqual({
				stopped: false,
				reason: 'Record at least one action before sending.',
			});
		});

		it('pushes a live recording-started state, scoped to the requesting thread', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();

			await service.startRecording(USER_ID, 'thread-1');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingStateChanged',
					data: { threadId: 'thread-1', status: 'recording', actionCount: 0 },
				},
				[USER_ID],
			);
		});
	});

	describe('streamed actions', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('redacts and counts each streamed action, pushing the debounced update', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'input',
				timestamp: 0,
				url: 'https://example.com?token=sk-live-abcdef1234567890',
				value: 'my api key is sk-live-abcdef1234567890',
			});
			await vi.advanceTimersByTimeAsync(300);

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingStateChanged',
					data: { threadId: 'thread-1', status: 'recording', actionCount: 1 },
				},
				[USER_ID],
			);
		});

		it('coalesces a burst of actions into a single debounced push', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			for (let i = 0; i < 3; i++) {
				relay.onRecordingActionAppended?.('rec-1', {
					id: `a${i}`,
					type: 'click',
					timestamp: 0,
					url: 'https://example.com',
				});
			}
			await vi.advanceTimersByTimeAsync(300);

			expect(push.sendToUsers).toHaveBeenCalledTimes(1);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({ data: expect.objectContaining({ actionCount: 3 }) }),
				[USER_ID],
			);
		});

		it('ignores a streamed action while no recording was started from a thread', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			push.sendToUsers.mockClear();

			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'click',
				timestamp: 0,
				url: 'https://example.com',
			});
			await vi.advanceTimersByTimeAsync(300);

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});

		it('pushes each streamed screenshot immediately, with no debounce', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			relay.onRecordingScreenshotCaptured?.('rec-1', {
				id: 's1',
				actionId: 'a1',
				data: 'ZmFrZQ==',
				mimeType: 'image/jpeg',
				timestamp: 0,
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingScreenshotReceived',
					data: {
						threadId: 'thread-1',
						actionId: 'a1',
						mimeType: 'image/jpeg',
						data: 'ZmFrZQ==',
					},
				},
				[USER_ID],
			);
		});

		it('ignores a streamed screenshot while no recording was started from a thread', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			push.sendToUsers.mockClear();

			relay.onRecordingScreenshotCaptured?.('rec-1', {
				id: 's1',
				actionId: 'a1',
				data: 'ZmFrZQ==',
				mimeType: 'image/jpeg',
				timestamp: 0,
			});

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});

		it('cleans up an in-progress recording if the extension disconnects mid-recording', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			relay.onExtensionDisconnect?.();

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ threadId: 'thread-1', status: 'discarded' }),
				}),
				[USER_ID],
			);

			// The caption timer must not keep firing for a session with no recording left.
			relay.onExtensionConnect?.();
			const captionHandler = vi.fn(async () => 'summary');
			service.setActionCaptionHandler(captionHandler);
			await vi.advanceTimersByTimeAsync(30_000);
			expect(captionHandler).not.toHaveBeenCalled();
		});
	});

	describe('discardRecording', () => {
		it('returns false when there is no in-progress recording to discard', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();

			expect(service.discardRecording(USER_ID)).toBe(false);
			expect(relay.discardRecording).not.toHaveBeenCalled();
		});

		it('discards, clears state, and pushes a terminal status with no thread message', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			expect(service.discardRecording(USER_ID)).toBe(true);

			expect(relay.discardRecording).toHaveBeenCalledTimes(1);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingStateChanged',
					data: { threadId: 'thread-1', status: 'discarded', actionCount: 0 },
				},
				[USER_ID],
			);

			// A second discard has nothing left to act on.
			push.sendToUsers.mockClear();
			expect(service.discardRecording(USER_ID)).toBe(false);
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('action caption', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('summarizes accumulated actions on each tick, skipping ticks with nothing new', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			const captionHandler = vi.fn(async () => 'Opened Gmail and composed a message');
			service.setActionCaptionHandler(captionHandler);
			await service.startRecording(USER_ID, 'thread-1');

			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'click',
				timestamp: 0,
				url: 'https://mail.google.com',
			});

			await vi.advanceTimersByTimeAsync(20_000);
			expect(captionHandler).toHaveBeenCalledTimes(1);

			// Nothing new accumulated since the last tick — skip the call entirely.
			await vi.advanceTimersByTimeAsync(20_000);
			expect(captionHandler).toHaveBeenCalledTimes(1);
		});

		it('redacts every free-text field of a streamed action before it reaches the caption handler', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			const captionHandler = vi.fn(async () => 'summary');
			service.setActionCaptionHandler(captionHandler);
			await service.startRecording(USER_ID, 'thread-1');

			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'input',
				timestamp: 0,
				url: 'https://example.com?token=secret',
				value: 'my api key',
				target: {
					tag: 'input',
					role: 'textbox',
					label: 'API key',
					name: 'apiKey',
					inputType: 'password',
				},
			});
			await vi.advanceTimersByTimeAsync(20_000);

			expect(captionHandler).toHaveBeenCalledWith({
				userId: USER_ID,
				actions: [
					expect.objectContaining({
						url: 'redacted(https://example.com?token=secret)',
						value: 'redacted(my api key)',
						target: expect.objectContaining({
							role: 'redacted(textbox)',
							label: 'redacted(API key)',
							name: 'redacted(apiKey)',
							inputType: 'redacted(password)',
						}),
					}),
				],
			});
		});

		it('pushes the new caption live once a tick produces one', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			service.setActionCaptionHandler(vi.fn(async () => 'Opened Gmail and composed a message'));
			await service.startRecording(USER_ID, 'thread-1');
			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'click',
				timestamp: 0,
				url: 'https://mail.google.com',
			});
			push.sendToUsers.mockClear();

			await vi.advanceTimersByTimeAsync(12_000);

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingStateChanged',
					data: {
						threadId: 'thread-1',
						status: 'recording',
						actionCount: 1,
						caption: 'Opened Gmail and composed a message',
					},
				},
				[USER_ID],
			);
		});

		it('never throws the run when the caption handler fails', async () => {
			const { relay } = await createSession(service);
			relay.onExtensionConnect?.();
			service.setActionCaptionHandler(vi.fn(async () => await Promise.reject(new Error('boom'))));
			await service.startRecording(USER_ID, 'thread-1');
			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'click',
				timestamp: 0,
				url: 'https://example.com',
			});

			// Would reject/throw here if the failure escaped the tick's own try/catch.
			await vi.advanceTimersByTimeAsync(20_000);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to summarize in-progress recording',
				expect.objectContaining({ userId: USER_ID }),
			);
		});

		it('passes the latest caption into the completion handler, then clears it', async () => {
			const { relay } = await createConnectedSession(service, projectRepository);
			service.setActionCaptionHandler(vi.fn(async () => 'Opened Gmail'));
			const completionHandler = vi.fn(async () => ({ threadId: 'thread-1' }));
			service.setRecordingCompletionHandler(completionHandler);

			await service.startRecording(USER_ID, 'thread-1');
			relay.onRecordingActionAppended?.('rec-1', {
				id: 'a1',
				type: 'click',
				timestamp: 0,
				url: 'https://mail.google.com',
			});
			await vi.advanceTimersByTimeAsync(20_000);

			await relay.onRecordingCompleted?.({ id: 'rec-1' } as never);

			expect(completionHandler).toHaveBeenCalledWith(
				expect.objectContaining({ caption: 'Opened Gmail' }),
			);
		});
	});

	describe('recording completion', () => {
		const recording = { id: 'rec-1' } as never;

		it('passes the origin thread from startRecording through to the completion handler, then clears it', async () => {
			const { relay } = await createConnectedSession(service, projectRepository);
			const handler = vi.fn(async () => ({ threadId: 'thread-1' }));
			service.setRecordingCompletionHandler(handler);

			await service.startRecording(USER_ID, 'thread-1');
			await relay.onRecordingCompleted?.(recording);

			expect(handler).toHaveBeenCalledWith({
				userId: USER_ID,
				projectId: 'project-1',
				recording,
				originThreadId: 'thread-1',
			});

			// A second, unrelated recording completing must not inherit the earlier thread.
			await relay.onRecordingCompleted?.({ id: 'rec-2' } as never);
			expect(handler).toHaveBeenLastCalledWith({
				userId: USER_ID,
				projectId: 'project-1',
				recording: { id: 'rec-2' },
				originThreadId: undefined,
			});
		});

		it('passes no origin thread for a recording started manually (from the extension popup)', async () => {
			const { relay } = await createConnectedSession(service, projectRepository);
			const handler = vi.fn(async () => ({ threadId: 'thread-1' }));
			service.setRecordingCompletionHandler(handler);

			await relay.onRecordingCompleted?.(recording);

			expect(handler).toHaveBeenCalledWith(expect.objectContaining({ originThreadId: undefined }));
		});

		it('pushes a terminal "stopped" state for an AI-triggered recording completing', async () => {
			const { relay } = await createConnectedSession(service, projectRepository);
			service.setRecordingCompletionHandler(vi.fn(async () => ({ threadId: 'thread-1' })));
			await service.startRecording(USER_ID, 'thread-1');
			push.sendToUsers.mockClear();

			await relay.onRecordingCompleted?.(recording);

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiRecordingStateChanged',
					data: { threadId: 'thread-1', status: 'stopped', actionCount: 0 },
				},
				[USER_ID],
			);
		});

		it('pushes nothing for a manually completed recording (no origin thread to notify)', async () => {
			const { relay } = await createConnectedSession(service, projectRepository);
			service.setRecordingCompletionHandler(vi.fn(async () => ({ threadId: 'thread-1' })));
			push.sendToUsers.mockClear();

			await relay.onRecordingCompleted?.(recording);

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});
});
