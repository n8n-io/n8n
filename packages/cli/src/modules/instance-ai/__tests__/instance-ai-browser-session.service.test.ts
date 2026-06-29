import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Push } from '@/push';
import type { UrlService } from '@/services/url.service';

import {
	CDP_TOKEN_HEADER,
	type BrowserUseUpgradeRequest,
} from '../browser/browser-use-ws.constants';
import { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';

jest.mock('@n8n/mcp-browser', () => {
	const createdRelays: unknown[] = [];
	class MockRelay {
		onExtensionConnect?: () => void;
		onExtensionDisconnect?: () => void;
		attachExtension = jest.fn();
		attachController = jest.fn();
		stop = jest.fn();
		constructor() {
			createdRelays.push(this);
		}
	}
	return {
		__createdRelays: createdRelays,
		CDPRelayServer: MockRelay,
		createBrowserTools: jest.fn(() => ({
			tools: [],
			connection: { shutdown: jest.fn(async () => undefined) },
		})),
		buildExtensionConnectUrl: (endpoint: string) =>
			`chrome-extension://ext-id/connect.html?mcpRelayUrl=${encodeURIComponent(endpoint)}`,
	};
});

const mcpBrowserMock: {
	__createdRelays: Array<{
		onExtensionConnect?: () => void;
		attachExtension: jest.Mock;
		attachController: jest.Mock;
		stop: jest.Mock;
	}>;
	createBrowserTools: jest.Mock;
} = jest.requireMock('@n8n/mcp-browser');

const USER_ID = 'user-1';

function extensionRequest(sessionId: string, token: string | null) {
	const ws = { close: jest.fn() };
	const req = {
		params: { sessionId },
		query: token === null ? {} : { token },
		headers: {},
		socket: { remoteAddress: '127.0.0.1' },
		ws,
	} as unknown as BrowserUseUpgradeRequest;
	return { req, ws };
}

function cdpRequest(sessionId: string, token: string | null, remoteAddress = '127.0.0.1') {
	const ws = { close: jest.fn() };
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

describe('InstanceAiBrowserSessionService', () => {
	const logger = mock<Logger>();
	const urlService = mock<UrlService>();
	const push = mock<Push>();
	const userRepository = mock<UserRepository>();
	const credentialsService = mock<CredentialsService>();
	const globalConfig = mock<GlobalConfig>({ port: 5678 });
	let service: InstanceAiBrowserSessionService;

	beforeEach(() => {
		jest.clearAllMocks();
		mcpBrowserMock.__createdRelays.length = 0;
		logger.scoped.mockReturnValue(logger);
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		service = new InstanceAiBrowserSessionService(
			logger,
			urlService,
			push,
			userRepository,
			credentialsService,
			globalConfig,
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
			const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
			const { sessionId, extToken, relay } = await createSession(service);

			nowSpy.mockReturnValue(1_000_000 + 6 * 60 * 1000);
			const { req, ws } = extensionRequest(sessionId, extToken);
			service.handleExtensionUpgrade(req);

			expect(relay.attachExtension).not.toHaveBeenCalled();
			expect(ws.close).toHaveBeenCalledWith(4003, expect.any(String));
			nowSpy.mockRestore();
		});

		it('accepts the token past the TTL once the extension has connected at least once', async () => {
			const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
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
	});
});
