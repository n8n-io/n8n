import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import { checkAiGatewayEligibility } from '../tools/workflow-builder/ai-gateway-eligibility';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'n1',
		name: 'Test',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeConfig(overrides: Partial<AiGatewayConfigDto> = {}): AiGatewayConfigDto {
	return {
		nodes: ['@n8n/n8n-nodes-langchain.openAi'],
		credentialTypes: ['openAiApi'],
		providerConfig: {
			openAiApi: { gatewayPath: '/v1/gateway/openai/v1', urlField: 'url', apiKeyField: 'apiKey' },
		},
		...overrides,
	} as AiGatewayConfigDto;
}

describe('checkAiGatewayEligibility', () => {
	describe('node coverage', () => {
		it('returns nodeNotCovered when nodeType not in config.nodes (and stripped form also missing)', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: 'n8n-nodes-base.slack' }),
				'slackApi',
				makeConfig(),
			);
			expect(result).toEqual({ eligible: false, reason: 'nodeNotCovered' });
		});

		it('accepts bare node type present in config.nodes', () => {
			const result = checkAiGatewayEligibility(makeNode(), 'openAiApi', makeConfig());
			expect(result).toEqual({ eligible: true });
		});

		it('accepts a node when only its tool-suffix-stripped form is in config.nodes', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: '@n8n/n8n-nodes-langchain.openAiTool' }),
				'openAiApi',
				makeConfig(),
			);
			expect(result).toEqual({ eligible: true });
		});
	});

	describe('credential type coverage', () => {
		it('returns credentialTypeNotCovered when credentialType is not in config.credentialTypes', () => {
			const result = checkAiGatewayEligibility(
				makeNode(),
				'openAiOAuth2',
				makeConfig({ credentialTypes: ['openAiApi'] }),
			);
			expect(result).toEqual({ eligible: false, reason: 'credentialTypeNotCovered' });
		});
	});

	describe('version floor', () => {
		it('returns versionTooLow when typeVersion is below minNodeTypeVersion', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ typeVersion: 1 }),
				'openAiApi',
				makeConfig({
					minNodeTypeVersion: { '@n8n/n8n-nodes-langchain.openAi': 1.2 },
				}),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'versionTooLow' });
		});

		it('passes when typeVersion equals minNodeTypeVersion', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ typeVersion: 1.2 }),
				'openAiApi',
				makeConfig({
					minNodeTypeVersion: { '@n8n/n8n-nodes-langchain.openAi': 1.2 },
				}),
			);
			expect(result).toEqual({ eligible: true });
		});

		it('passes when no minNodeTypeVersion entry for this node', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ typeVersion: 1 }),
				'openAiApi',
				makeConfig(),
			);
			expect(result).toEqual({ eligible: true });
		});

		it('uses stripToolSuffix fallback for minNodeTypeVersion lookup', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: '@n8n/n8n-nodes-langchain.openAiTool', typeVersion: 1 }),
				'openAiApi',
				makeConfig({
					minNodeTypeVersion: { '@n8n/n8n-nodes-langchain.openAi': 1.2 },
				}),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'versionTooLow' });
		});
	});

	describe('hidden properties', () => {
		it('returns hiddenPropertySet when a listed hidden property is set on the node', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { baseURL: 'https://custom.example.com' } }),
				'openAiApi',
				makeConfig({
					hiddenNodeProperties: { '@n8n/n8n-nodes-langchain.openAi': ['baseURL'] },
				}),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'hiddenPropertySet' });
		});

		it('passes when hidden properties list exists but none are set on the node', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { model: 'gpt-4' } }),
				'openAiApi',
				makeConfig({
					hiddenNodeProperties: { '@n8n/n8n-nodes-langchain.openAi': ['baseURL'] },
				}),
			);
			expect(result).toEqual({ eligible: true });
		});

		it('does not disqualify when a hidden property is only present via resolvedParameters (default)', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: {} }),
				'openAiApi',
				makeConfig({
					hiddenNodeProperties: { '@n8n/n8n-nodes-langchain.openAi': ['baseURL'] },
				}),
				{ baseURL: 'https://api.openai.com/v1' },
			);
			expect(result).toEqual({ eligible: true });
		});

		it('returns hiddenPropertySet when a hidden property is nested inside a collection', () => {
			const result = checkAiGatewayEligibility(
				makeNode({
					type: 'n8n-nodes-browserbase.browserbase',
					parameters: { modelOptions: { modelSource: 'openai' } },
				}),
				'browserbaseApi',
				makeConfig({
					nodes: ['n8n-nodes-browserbase.browserbase'],
					credentialTypes: ['browserbaseApi'],
					hiddenNodeProperties: { 'n8n-nodes-browserbase.browserbase': ['modelSource'] },
				}),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'hiddenPropertySet' });
		});
	});

	describe('supportedActions (with resource/operation)', () => {
		const supportedActions = {
			'@n8n/n8n-nodes-langchain.openAi': {
				text: ['message', 'response'],
				image: ['generate'],
			},
		};

		it('passes when resource+operation is in the allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { resource: 'text', operation: 'message' } }),
				'openAiApi',
				makeConfig({ supportedActions }),
			);
			expect(result).toEqual({ eligible: true });
		});

		it('returns unsupportedAction when operation is not in the resource allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { resource: 'text', operation: 'classify' } }),
				'openAiApi',
				makeConfig({ supportedActions }),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'unsupportedAction' });
		});

		it('returns unsupportedAction when the resource is not in the actions map', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { resource: 'audio', operation: 'transcribe' } }),
				'openAiApi',
				makeConfig({ supportedActions }),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'unsupportedAction' });
		});

		it('returns unsupportedAction when operation is missing but the resource has an allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { resource: 'text' } }),
				'openAiApi',
				makeConfig({ supportedActions }),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'unsupportedAction' });
		});

		it('reads resource/operation from resolvedParameters (defaults) when the node omits them', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: {} }),
				'openAiApi',
				makeConfig({ supportedActions }),
				{ resource: 'text', operation: 'message' },
			);
			expect(result).toEqual({ eligible: true });
		});

		it('returns unsupportedAction when the defaulted action is not in the allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: {} }),
				'openAiApi',
				makeConfig({ supportedActions }),
				{ resource: 'text', operation: 'classify' },
			);
			expect(result).toMatchObject({ eligible: false, reason: 'unsupportedAction' });
		});

		it('passes when no supportedActions entry exists for this node (missing = no filter)', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ parameters: { resource: 'text', operation: 'message' } }),
				'openAiApi',
				makeConfig(),
			);
			expect(result).toEqual({ eligible: true });
		});
	});

	describe('supportedActions (flat __operation_only__ sentinel)', () => {
		const supportedActions = {
			'n8n-nodes-brave.braveSearch': {
				__operation_only__: ['webSearch', 'imageSearch'],
			},
		};

		it('passes when operation is in the flat allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: 'n8n-nodes-brave.braveSearch', parameters: { operation: 'webSearch' } }),
				'braveSearchApi',
				makeConfig({
					nodes: ['n8n-nodes-brave.braveSearch'],
					credentialTypes: ['braveSearchApi'],
					supportedActions,
				}),
			);
			expect(result).toEqual({ eligible: true });
		});

		it('reads operation from resolvedParameters (defaults) for operation-only nodes', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: 'n8n-nodes-brave.braveSearch', parameters: {} }),
				'braveSearchApi',
				makeConfig({
					nodes: ['n8n-nodes-brave.braveSearch'],
					credentialTypes: ['braveSearchApi'],
					supportedActions,
				}),
				{ operation: 'webSearch' },
			);
			expect(result).toEqual({ eligible: true });
		});

		it('returns unsupportedAction when operation is not in the flat allowlist', () => {
			const result = checkAiGatewayEligibility(
				makeNode({ type: 'n8n-nodes-brave.braveSearch', parameters: { operation: 'newsSearch' } }),
				'braveSearchApi',
				makeConfig({
					nodes: ['n8n-nodes-brave.braveSearch'],
					credentialTypes: ['braveSearchApi'],
					supportedActions,
				}),
			);
			expect(result).toMatchObject({ eligible: false, reason: 'unsupportedAction' });
		});
	});
});
