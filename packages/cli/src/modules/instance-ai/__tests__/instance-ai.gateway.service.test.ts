import type { InstanceAiGatewayCapabilities } from '@n8n/api-types';

import { LocalGatewayRegistry } from '../filesystem/local-gateway-registry';

const CAPABILITIES: InstanceAiGatewayCapabilities = {
	rootPath: '/home/user/project',
	tools: [],
	toolCategories: [],
};

describe('LocalGatewayRegistry — per-user gateway isolation', () => {
	let registry: LocalGatewayRegistry;

	beforeEach(() => {
		registry = new LocalGatewayRegistry();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('generatePairingToken', () => {
		it('creates a token and registers it in the reverse lookup', () => {
			const token = registry.generatePairingToken('user-a');

			expect(token).toMatch(/^gw_/);
			expect(registry.getUserIdForApiKey(token)).toBe('user-a');
		});

		it('returns the same token when called again within TTL', () => {
			const token1 = registry.generatePairingToken('user-a');
			const token2 = registry.generatePairingToken('user-a');

			expect(token1).toBe(token2);
		});

		it('returns a new pairing token instead of exposing an active session key', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			const nextPairingToken = registry.generatePairingToken('user-a');

			expect(nextPairingToken).toMatch(/^gw_/);
			expect(nextPairingToken).not.toBe(sessionKey);
			expect(registry.getUserIdForApiKey(sessionKey)).toBe('user-a');
			expect(registry.getUserIdForApiKey(nextPairingToken)).toBe('user-a');
		});

		it('does not return an expired active session key', () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;

			jest.setSystemTime(new Date('2026-01-02T00:00:01.000Z'));
			const nextToken = registry.generatePairingToken('user-a');

			expect(nextToken).toMatch(/^gw_/);
			expect(nextToken).not.toBe(sessionKey);
			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
		});

		it('generates independent tokens for different users', () => {
			const tokenA = registry.generatePairingToken('user-a');
			const tokenB = registry.generatePairingToken('user-b');

			expect(tokenA).not.toBe(tokenB);
			expect(registry.getUserIdForApiKey(tokenA)).toBe('user-a');
			expect(registry.getUserIdForApiKey(tokenB)).toBe('user-b');
		});
	});

	describe('consumePairingToken', () => {
		it('swaps the pairing key for a session key in the reverse lookup', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken);

			expect(sessionKey).toMatch(/^sess_/);
			expect(registry.getUserIdForApiKey(pairingToken)).toBeUndefined();
			expect(registry.getUserIdForApiKey(sessionKey!)).toBe('user-a');
		});

		it('returns null for an invalid token', () => {
			registry.generatePairingToken('user-a');

			expect(registry.consumePairingToken('user-a', 'wrong-token')).toBeNull();
		});

		it('revokes the previous active session when a new pairing token is consumed', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			const nextPairingToken = registry.generatePairingToken('user-a');

			const nextSessionKey = registry.consumePairingToken('user-a', nextPairingToken);

			expect(nextSessionKey).toMatch(/^sess_/);
			expect(nextSessionKey).not.toBe(sessionKey);
			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(registry.getUserIdForApiKey(nextSessionKey!)).toBe('user-a');
		});

		it('disconnects existing gateway listeners when a new pairing token is consumed', async () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			registry.initGateway('user-a', CAPABILITIES);
			const gateway = registry.getGateway('user-a');
			const disconnectEvents: unknown[] = [];
			gateway.onDisconnect((event) => disconnectEvents.push(event));
			const staleRequestListener = jest.fn();
			gateway.onRequest(staleRequestListener);
			const nextPairingToken = registry.generatePairingToken('user-a');

			const nextSessionKey = registry.consumePairingToken('user-a', nextPairingToken);

			expect(nextSessionKey).toMatch(/^sess_/);
			expect(nextSessionKey).not.toBe(sessionKey);
			expect(disconnectEvents).toEqual([{ type: 'gateway-disconnect' }]);
			expect(registry.getGatewayStatus('user-a').connected).toBe(false);

			registry.initGateway('user-a', CAPABILITIES);
			gateway.onRequest((event) => {
				gateway.resolveRequest(event.payload.requestId, { content: [] });
			});
			await expect(gateway.callTool({ name: 'read_file', arguments: {} })).resolves.toEqual({
				content: [],
			});
			expect(staleRequestListener).not.toHaveBeenCalled();
		});
	});

	describe('clearActiveSessionKey', () => {
		it('removes the session key from the reverse lookup', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;

			registry.clearActiveSessionKey('user-a');

			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(registry.getActiveSessionKey('user-a')).toBeNull();
		});
	});

	describe('session key lifecycle', () => {
		it('does not resolve pairing tokens through the session key lookup', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			const nextPairingToken = registry.generatePairingToken('user-a');

			expect(registry.getUserIdForSessionKey(sessionKey)).toBe('user-a');
			expect(registry.getUserIdForSessionKey(nextPairingToken)).toBeUndefined();
			expect(registry.getUserIdForApiKey(nextPairingToken)).toBe('user-a');
		});

		it('expires active session keys from reverse lookup', () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			registry.initGateway('user-a', CAPABILITIES);

			jest.setSystemTime(new Date('2026-01-02T00:00:01.000Z'));

			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(registry.getActiveSessionKey('user-a')).toBeNull();
			expect(registry.getGatewayStatus('user-a').connected).toBe(false);
		});

		it('rotates a session key after the rotation window', () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;

			jest.setSystemTime(new Date('2026-01-01T01:00:00.000Z'));

			expect(registry.isSessionKeyDueForRotation('user-a', sessionKey)).toBe(true);
			expect(registry.getSessionKeyRotateAfter('user-a', sessionKey)).toEqual(
				new Date('2026-01-01T01:00:00.000Z'),
			);

			const rotatedSessionKey = registry.rotateSessionKeyIfNeeded('user-a', sessionKey);

			expect(rotatedSessionKey).toMatch(/^sess_/);
			expect(rotatedSessionKey).not.toBe(sessionKey);
			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(registry.getUserIdForApiKey(rotatedSessionKey!)).toBe('user-a');
		});

		it('keeps a session key before the rotation window', () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;

			jest.setSystemTime(new Date('2026-01-01T00:59:59.000Z'));

			expect(registry.isSessionKeyDueForRotation('user-a', sessionKey)).toBe(false);
			expect(registry.rotateSessionKeyIfNeeded('user-a', sessionKey)).toBeNull();
			expect(registry.getUserIdForApiKey(sessionKey)).toBe('user-a');
		});

		it('revokes pairing tokens, session keys, and the active gateway', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken)!;
			registry.initGateway('user-a', CAPABILITIES);

			expect(registry.revokeSession('user-a')).toBe(true);

			expect(registry.getUserIdForApiKey(pairingToken)).toBeUndefined();
			expect(registry.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(registry.getActiveSessionKey('user-a')).toBeNull();
			expect(registry.getGatewayStatus('user-a').connected).toBe(false);
		});
	});

	describe('getPairingToken', () => {
		it('returns null and cleans up the reverse lookup for an expired token', () => {
			const token = registry.generatePairingToken('user-a');

			// Access the private map to backdate the token
			const userGateways = (
				registry as unknown as {
					userGateways: Map<string, { pairingToken: { token: string; createdAt: number } | null }>;
				}
			).userGateways;
			userGateways.get('user-a')!.pairingToken!.createdAt = Date.now() - 10 * 60 * 1000;

			expect(registry.getPairingToken('user-a')).toBeNull();
			expect(registry.getUserIdForApiKey(token)).toBeUndefined();
		});
	});

	describe('getGatewayStatus', () => {
		it('returns disconnected for a user who has never connected', () => {
			expect(registry.getGatewayStatus('unknown-user')).toEqual({
				connected: false,
				connectedAt: null,
				directory: null,
				hostIdentifier: null,
				toolCategories: [],
			});
		});

		it('returns connected state after initGateway', () => {
			registry.generatePairingToken('user-a');
			registry.initGateway('user-a', CAPABILITIES);

			const status = registry.getGatewayStatus('user-a');
			expect(status.connected).toBe(true);
			expect(status.directory).toBe('/home/user/project');
		});
	});

	describe('user isolation', () => {
		it('connecting user-a does not affect user-b gateway status', () => {
			registry.generatePairingToken('user-a');
			registry.initGateway('user-a', CAPABILITIES);

			expect(registry.getGatewayStatus('user-a').connected).toBe(true);
			expect(registry.getGatewayStatus('user-b').connected).toBe(false);
		});

		it('disconnecting user-a does not affect user-b gateway', () => {
			registry.generatePairingToken('user-a');
			registry.initGateway('user-a', CAPABILITIES);
			registry.generatePairingToken('user-b');
			registry.initGateway('user-b', CAPABILITIES);

			registry.disconnectGateway('user-a');

			expect(registry.getGatewayStatus('user-a').connected).toBe(false);
			expect(registry.getGatewayStatus('user-b').connected).toBe(true);
		});

		it('user-a session key is not resolvable as user-b', () => {
			const tokenA = registry.generatePairingToken('user-a');
			const sessionKeyA = registry.consumePairingToken('user-a', tokenA)!;

			expect(registry.getUserIdForApiKey(sessionKeyA)).toBe('user-a');
			expect(registry.getUserIdForApiKey(sessionKeyA)).not.toBe('user-b');
		});
	});
});
