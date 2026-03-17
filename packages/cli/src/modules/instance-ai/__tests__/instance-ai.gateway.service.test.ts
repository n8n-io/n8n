import type { InstanceAiGatewayCapabilities } from '@n8n/api-types';

import { InstanceAiService } from '../instance-ai.service';

const CAPABILITIES: InstanceAiGatewayCapabilities = {
	rootPath: '/home/user/project',
	tools: [],
};

/**
 * Creates a minimal test harness that binds only the gateway lifecycle methods
 * from InstanceAiService onto a plain object with the required Map fields.
 * This avoids instantiating the full service with all its DI dependencies.
 */
function makeGatewayHarness() {
	const base: Record<string, unknown> = {
		userGateways: new Map(),
		apiKeyToUserId: new Map(),
		INITIAL_GRACE_MS: 10_000,
		MAX_GRACE_MS: 120_000,
		PAIRING_TOKEN_TTL_MS: 5 * 60 * 1000,
	};

	const proto = InstanceAiService.prototype as unknown as Record<
		string,
		(...args: unknown[]) => unknown
	>;
	const methods = [
		'getOrCreateUserGatewayState',
		'getUserIdForApiKey',
		'generatePairingToken',
		'getPairingToken',
		'consumePairingToken',
		'getActiveSessionKey',
		'clearActiveSessionKey',
		'getLocalGateway',
		'initGateway',
		'disconnectGateway',
		'getGatewayStatus',
		'resolveGatewayRequest',
		'startDisconnectTimer',
		'clearDisconnectTimer',
	];

	for (const name of methods) {
		base[name] = proto[name].bind(base);
	}

	return base as unknown as Pick<
		InstanceAiService,
		| 'getUserIdForApiKey'
		| 'generatePairingToken'
		| 'getPairingToken'
		| 'consumePairingToken'
		| 'getActiveSessionKey'
		| 'clearActiveSessionKey'
		| 'getLocalGateway'
		| 'initGateway'
		| 'disconnectGateway'
		| 'getGatewayStatus'
		| 'resolveGatewayRequest'
		| 'startDisconnectTimer'
		| 'clearDisconnectTimer'
	> & { userGateways: Map<string, { pairingToken: { token: string; createdAt: number } | null }> };
}

describe('InstanceAiService — per-user gateway isolation', () => {
	let svc: ReturnType<typeof makeGatewayHarness>;

	beforeEach(() => {
		svc = makeGatewayHarness();
	});

	describe('generatePairingToken', () => {
		it('creates a token and registers it in the reverse lookup', () => {
			const token = svc.generatePairingToken('user-a');

			expect(token).toMatch(/^gw_/);
			expect(svc.getUserIdForApiKey(token)).toBe('user-a');
		});

		it('returns the same token when called again within TTL', () => {
			const token1 = svc.generatePairingToken('user-a');
			const token2 = svc.generatePairingToken('user-a');

			expect(token1).toBe(token2);
		});

		it('returns the active session key if one already exists', () => {
			const pairingToken = svc.generatePairingToken('user-a');
			const sessionKey = svc.consumePairingToken('user-a', pairingToken);

			expect(svc.generatePairingToken('user-a')).toBe(sessionKey);
		});

		it('generates independent tokens for different users', () => {
			const tokenA = svc.generatePairingToken('user-a');
			const tokenB = svc.generatePairingToken('user-b');

			expect(tokenA).not.toBe(tokenB);
			expect(svc.getUserIdForApiKey(tokenA)).toBe('user-a');
			expect(svc.getUserIdForApiKey(tokenB)).toBe('user-b');
		});
	});

	describe('consumePairingToken', () => {
		it('swaps the pairing key for a session key in the reverse lookup', () => {
			const pairingToken = svc.generatePairingToken('user-a');
			const sessionKey = svc.consumePairingToken('user-a', pairingToken);

			expect(sessionKey).toMatch(/^sess_/);
			expect(svc.getUserIdForApiKey(pairingToken)).toBeUndefined();
			expect(svc.getUserIdForApiKey(sessionKey!)).toBe('user-a');
		});

		it('returns null for an invalid token', () => {
			svc.generatePairingToken('user-a');

			expect(svc.consumePairingToken('user-a', 'wrong-token')).toBeNull();
		});
	});

	describe('clearActiveSessionKey', () => {
		it('removes the session key from the reverse lookup', () => {
			const pairingToken = svc.generatePairingToken('user-a');
			const sessionKey = svc.consumePairingToken('user-a', pairingToken)!;

			svc.clearActiveSessionKey('user-a');

			expect(svc.getUserIdForApiKey(sessionKey)).toBeUndefined();
			expect(svc.getActiveSessionKey('user-a')).toBeNull();
		});
	});

	describe('getPairingToken', () => {
		it('returns null and cleans up the reverse lookup for an expired token', () => {
			const token = svc.generatePairingToken('user-a');
			svc.userGateways.get('user-a')!.pairingToken!.createdAt = Date.now() - 10 * 60 * 1000;

			expect(svc.getPairingToken('user-a')).toBeNull();
			expect(svc.getUserIdForApiKey(token)).toBeUndefined();
		});
	});

	describe('getGatewayStatus', () => {
		it('returns disconnected for a user who has never connected', () => {
			const status = svc.getGatewayStatus('unknown-user');

			expect(status).toEqual({ connected: false, connectedAt: null, directory: null });
		});

		it('returns connected state after initGateway', () => {
			svc.generatePairingToken('user-a');
			svc.initGateway('user-a', CAPABILITIES);

			const status = svc.getGatewayStatus('user-a');
			expect(status.connected).toBe(true);
			expect(status.directory).toBe('/home/user/project');
		});
	});

	describe('user isolation', () => {
		it('connecting user-a does not affect user-b gateway status', () => {
			svc.generatePairingToken('user-a');
			svc.initGateway('user-a', CAPABILITIES);

			expect(svc.getGatewayStatus('user-a').connected).toBe(true);
			expect(svc.getGatewayStatus('user-b').connected).toBe(false);
		});

		it('disconnecting user-a does not affect user-b gateway', () => {
			svc.generatePairingToken('user-a');
			svc.initGateway('user-a', CAPABILITIES);
			svc.generatePairingToken('user-b');
			svc.initGateway('user-b', CAPABILITIES);

			svc.disconnectGateway('user-a');

			expect(svc.getGatewayStatus('user-a').connected).toBe(false);
			expect(svc.getGatewayStatus('user-b').connected).toBe(true);
		});

		it('user-a session key is not accessible via user-b lookup', () => {
			const tokenA = svc.generatePairingToken('user-a');
			const sessionKeyA = svc.consumePairingToken('user-a', tokenA)!;

			expect(svc.getUserIdForApiKey(sessionKeyA)).toBe('user-a');
			expect(svc.getUserIdForApiKey(sessionKeyA)).not.toBe('user-b');
		});
	});
});
