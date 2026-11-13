import { AiGatewayConfigDto } from '../ai-gateway-config-response.dto';

const baseConfig = {
	nodes: ['@n8n/n8n-nodes-langchain.googleGemini'],
	credentialTypes: ['googlePalmApi'],
	providerConfig: {
		googlePalmApi: { gatewayPath: '/v1/gateway/google', urlField: 'host', apiKeyField: 'apiKey' },
	},
};

describe('AiGatewayConfigDto', () => {
	it('parses a config without promotions', () => {
		const result = AiGatewayConfigDto.safeParse(baseConfig);

		expect(result.success).toBe(true);
		expect(result.data?.promotions).toBeUndefined();
	});

	it('keeps valid promotions', () => {
		const promotions = [
			{
				text: 'Free until December 1, 2026.',
				nodes: ['@n8n/n8n-nodes-langchain.googleGemini'],
				startsAt: '2026-11-01T00:00:00.000Z',
				endsAt: '2026-12-01T00:00:00.000Z',
			},
			{ text: 'Free this week.', nodes: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'] },
		];

		const result = AiGatewayConfigDto.safeParse({ ...baseConfig, promotions });

		expect(result.success).toBe(true);
		expect(result.data?.promotions).toEqual(promotions);
	});

	it.each([
		['a non-string text', { text: 42, nodes: ['@n8n/n8n-nodes-langchain.googleGemini'] }],
		['no nodes', { text: 'Free this week.' }],
		['empty nodes', { text: 'Free this week.', nodes: [] }],
	])('drops a promotion with %s and keeps the valid ones', (_, invalid) => {
		const valid = {
			text: 'Free until December 1, 2026.',
			nodes: ['@n8n/n8n-nodes-langchain.googleGemini'],
		};

		const result = AiGatewayConfigDto.safeParse({ ...baseConfig, promotions: [invalid, valid] });

		expect(result.success).toBe(true);
		expect(result.data?.promotions).toEqual([valid]);
	});

	it('drops promotions that are not a list and keeps the rest of the config', () => {
		const result = AiGatewayConfigDto.safeParse({ ...baseConfig, promotions: { text: 'Free' } });

		expect(result.success).toBe(true);
		expect(result.data?.promotions).toBeUndefined();
		expect(result.data?.nodes).toEqual(baseConfig.nodes);
	});
});
