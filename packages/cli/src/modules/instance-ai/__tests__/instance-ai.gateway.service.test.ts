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

		it('returns the active session key if one already exists', () => {
			const pairingToken = registry.generatePairingToken('user-a');
			const sessionKey = registry.consumePairingToken('user-a', pairingToken);

			expect(registry.generatePairingToken('user-a')).toBe(sessionKey);
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
