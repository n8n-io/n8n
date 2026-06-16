import type { InstanceAiGatewayCapabilities } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { InstanceAiGatewayService } from '../instance-ai-gateway.service';

const CAPABILITIES: InstanceAiGatewayCapabilities = {
	rootPath: '/home/user/project',
	tools: [],
	toolCategories: [
		{ name: 'files', enabled: true },
		{ name: 'shell', enabled: false },
		{ name: 'browser', enabled: true },
	],
};

describe('InstanceAiGatewayService', () => {
	let telemetry: ReturnType<typeof mock<Telemetry>>;
	let service: InstanceAiGatewayService;

	beforeEach(() => {
		telemetry = mock<Telemetry>();
		service = new InstanceAiGatewayService(telemetry);
	});

	describe('initGateway', () => {
		it('initializes the gateway and tracks a connect event with the enabled categories', () => {
			service.initGateway('user-1', CAPABILITIES);

			expect(telemetry.track).toHaveBeenCalledWith('User connected to Computer Use', {
				user_id: 'user-1',
				tool_groups: ['files', 'browser'],
			});
			expect(service.getGatewayStatus('user-1').connected).toBe(true);
		});
	});

	describe('disconnectAllGateways', () => {
		it('returns the connected user ids and disconnects them all', () => {
			service.initGateway('user-1', CAPABILITIES);
			service.initGateway('user-2', CAPABILITIES);

			const disconnected = service.disconnectAllGateways();

			expect(disconnected.sort()).toEqual(['user-1', 'user-2']);
			expect(service.getGatewayStatus('user-1').connected).toBe(false);
			expect(service.getGatewayStatus('user-2').connected).toBe(false);
		});
	});

	describe('disconnectAll', () => {
		it('disconnects every gateway without collecting ids', () => {
			service.initGateway('user-1', CAPABILITIES);

			service.disconnectAll();

			expect(service.getGatewayStatus('user-1').connected).toBe(false);
		});
	});

	describe('pairing token delegation', () => {
		it('issues a pairing token resolvable back to the user via the reverse lookup', () => {
			const token = service.generatePairingToken('user-1');

			expect(token).toMatch(/^gw_/);
			expect(service.getUserIdForApiKey(token)).toBe('user-1');
		});

		it('swaps a pairing token for a session key on consume', () => {
			const token = service.generatePairingToken('user-1');

			const sessionKey = service.consumePairingToken('user-1', token);

			expect(sessionKey).toMatch(/^sess_/);
			expect(service.getActiveSessionKey('user-1')).toBe(sessionKey);
		});
	});
});
