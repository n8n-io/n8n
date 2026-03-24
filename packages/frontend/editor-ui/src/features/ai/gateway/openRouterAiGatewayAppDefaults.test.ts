import { describe, expect, it } from 'vitest';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	isOpenRouterAiGatewayAppNode,
	getAiGatewayDefaultModelForResource,
	AI_GATEWAY_MODEL_DEFAULTS,
} from './openRouterAiGatewayAppDefaults';

describe('openRouterAiGatewayAppDefaults', () => {
	it('detects app node by description name or workflow type', () => {
		expect(
			isOpenRouterAiGatewayAppNode(
				{ name: 'n8n-nodes-langchain.openRouterAiGateway' } as INodeTypeDescription,
				'@n8n/n8n-nodes-langchain.openRouterAiGateway',
			),
		).toBe(true);
		expect(
			isOpenRouterAiGatewayAppNode(
				{ name: 'openRouterAiGateway' } as INodeTypeDescription,
				'@n8n/n8n-nodes-langchain.openRouterAiGateway',
			),
		).toBe(true);
		expect(
			isOpenRouterAiGatewayAppNode(
				{ name: 'googleGemini' } as INodeTypeDescription,
				'@n8n/n8n-nodes-langchain.googleGemini',
			),
		).toBe(false);
	});

	it('returns null for unknown nodeType', () => {
		expect(isOpenRouterAiGatewayAppNode(null, 'any')).toBe(false);
	});

	it('returns per-resource default model', () => {
		expect(getAiGatewayDefaultModelForResource('text')).toBe(AI_GATEWAY_MODEL_DEFAULTS.text);
		expect(getAiGatewayDefaultModelForResource('image')).toBe(AI_GATEWAY_MODEL_DEFAULTS.image);
		expect(getAiGatewayDefaultModelForResource('file')).toBe(AI_GATEWAY_MODEL_DEFAULTS.file);
		expect(getAiGatewayDefaultModelForResource('audio')).toBe(AI_GATEWAY_MODEL_DEFAULTS.audio);
		expect(getAiGatewayDefaultModelForResource('unknown')).toBeUndefined();
	});
});
