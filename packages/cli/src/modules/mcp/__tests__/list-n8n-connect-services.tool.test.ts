import type { AiGatewayConfigDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';

import { createListN8nConnectServicesTool } from '../tools/list-n8n-connect-services.tool';

const user = Object.assign(new User(), { id: 'user-1' });

const fullConfig: AiGatewayConfigDto = {
	nodes: ['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.lmChatOpenAi'],
	credentialTypes: ['openAiApi'],
	providerConfig: {
		openAiApi: { gatewayPath: '/v1/gateway/openai/v1', urlField: 'url', apiKeyField: 'apiKey' },
	},
	supportedActions: {
		'@n8n/n8n-nodes-langchain.openAi': {
			text: ['message', 'response'],
		},
	},
	minNodeTypeVersion: { '@n8n/n8n-nodes-langchain.openAi': 1.2 },
	hiddenNodeProperties: { '@n8n/n8n-nodes-langchain.openAi': ['baseURL'] },
} as AiGatewayConfigDto;

function makeMocks(opts: { available?: boolean; config?: AiGatewayConfigDto } = {}) {
	const aiGatewayService = mock<AiGatewayService>();
	if (opts.available === false) {
		aiGatewayService.isAvailable.mockResolvedValue({ available: false });
	} else {
		aiGatewayService.isAvailable.mockResolvedValue({
			available: true,
			config: opts.config ?? fullConfig,
		});
	}
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	return { aiGatewayService, telemetry };
}

describe('list_n8n_connect_services MCP tool', () => {
	test('registers under the name list_n8n_connect_services', () => {
		const { aiGatewayService, telemetry } = makeMocks();
		const tool = createListN8nConnectServicesTool(user, aiGatewayService, telemetry);
		expect(tool.name).toBe('list_n8n_connect_services');
		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		});
	});

	test('returns full coverage payload when available', async () => {
		const { aiGatewayService, telemetry } = makeMocks({ available: true });
		const tool = createListN8nConnectServicesTool(user, aiGatewayService, telemetry);
		const result = await tool.handler({}, {} as never);
		expect(result.structuredContent).toEqual({
			available: true,
			credentialTypes: ['openAiApi'],
			nodes: ['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.lmChatOpenAi'],
			supportedActions: {
				'@n8n/n8n-nodes-langchain.openAi': { text: ['message', 'response'] },
			},
			minNodeTypeVersion: { '@n8n/n8n-nodes-langchain.openAi': 1.2 },
			hiddenNodeProperties: { '@n8n/n8n-nodes-langchain.openAi': ['baseURL'] },
		});
	});

	test('returns { available: false } when unavailable', async () => {
		const { aiGatewayService, telemetry } = makeMocks({ available: false });
		const tool = createListN8nConnectServicesTool(user, aiGatewayService, telemetry);
		const result = await tool.handler({}, {} as never);
		expect(result.structuredContent).toEqual({ available: false });
	});

	test('emits USER_CALLED_MCP_TOOL_EVENT with tool_name and success', async () => {
		const { aiGatewayService, telemetry } = makeMocks();
		const tool = createListN8nConnectServicesTool(user, aiGatewayService, telemetry);
		await tool.handler({}, {} as never);
		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'list_n8n_connect_services',
				results: { success: true, data: { available: true } },
			}),
		);
	});
});
