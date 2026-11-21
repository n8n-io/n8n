import { TelemetryProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiGatewayService } from '@/services/ai-gateway.service';

import { createGetN8nGatewayAccessTool } from '../tools/get-n8n-gateway-access.tool';

const user = Object.assign(new User(), { id: 'user-1' });

function makeMocks(enabled: boolean) {
	const aiGatewayService = mock<AiGatewayService>();
	aiGatewayService.isEnabled.mockReturnValue(enabled);
	aiGatewayService.getUserGatewayAccess.mockResolvedValue({
		gatewayUrl: 'https://gateway.example.com',
		token: 'jwt-token',
		expiresAt: '2026-11-18T12:00:00.000Z',
	});
	const telemetry = mockInstance(TelemetryProxy, { track: vi.fn() });
	return { aiGatewayService, telemetry };
}

describe('get_n8n_gateway_access MCP tool', () => {
	test('returns the gateway URL and a token for the signed-in user', async () => {
		const { aiGatewayService, telemetry } = makeMocks(true);
		const tool = createGetN8nGatewayAccessTool(user, aiGatewayService, telemetry);

		const result = await tool.handler({}, {} as never);

		expect(tool.name).toBe('get_n8n_gateway_access');
		expect(aiGatewayService.getUserGatewayAccess).toHaveBeenCalledWith('user-1');
		expect(result.structuredContent).toEqual({
			available: true,
			gatewayUrl: 'https://gateway.example.com',
			token: 'jwt-token',
			expiresAt: '2026-11-18T12:00:00.000Z',
		});
	});

	test('reports unavailable without minting a token when Gateway credits are off', async () => {
		const { aiGatewayService, telemetry } = makeMocks(false);
		const tool = createGetN8nGatewayAccessTool(user, aiGatewayService, telemetry);

		const result = await tool.handler({}, {} as never);

		expect(aiGatewayService.getUserGatewayAccess).not.toHaveBeenCalled();
		expect(result.structuredContent).toEqual({ available: false });
	});
});
