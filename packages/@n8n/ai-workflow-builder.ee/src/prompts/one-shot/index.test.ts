import type { ChatPromptTemplate } from '@langchain/core/prompts';

import type { NodeWithDiscriminators } from '../../utils/node-type-parser';

import {
	AVAILABLE_PROMPT_VERSIONS,
	DEFAULT_PROMPT_VERSION,
	PROMPT_VERSIONS,
	type PromptVersionId,
	type PromptVersionDefinition,
	buildOneShotGeneratorPrompt,
	buildRawSystemPrompt,
	buildOpusOneShotGeneratorPrompt,
	buildOpusRawSystemPrompt,
} from './index';

describe('prompt version registry', () => {
	const mockNodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	} = {
		triggers: [{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' }],
		core: [{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' }],
		ai: [{ id: '@n8n/n8n-nodes-langchain.agent', displayName: 'AI Agent' }],
		other: [{ id: 'n8n-nodes-base.slack', displayName: 'Slack' }],
	};

	const mockSdkSourceCode = '// Mock SDK source code for testing';

	describe('PROMPT_VERSIONS registry', () => {
		it('should have v1-sonnet version defined', () => {
			expect(PROMPT_VERSIONS['v1-sonnet']).toBeDefined();
			expect(PROMPT_VERSIONS['v1-sonnet'].id).toBe('v1-sonnet');
			expect(PROMPT_VERSIONS['v1-sonnet'].name).toBe('Sonnet Optimized (v1)');
		});

		it('should have v2-opus version defined', () => {
			expect(PROMPT_VERSIONS['v2-opus']).toBeDefined();
			expect(PROMPT_VERSIONS['v2-opus'].id).toBe('v2-opus');
			expect(PROMPT_VERSIONS['v2-opus'].name).toBe('Opus Full SDK (v2)');
		});

		it('should have buildPrompt function for each version', () => {
			for (const version of Object.values(PROMPT_VERSIONS)) {
				expect(typeof version.buildPrompt).toBe('function');
			}
		});

		it('should have recommended models for each version', () => {
			expect(PROMPT_VERSIONS['v1-sonnet'].recommendedModels).toContain('claude-sonnet-4.5');
			expect(PROMPT_VERSIONS['v2-opus'].recommendedModels).toContain('claude-opus-4.5');
		});
	});

	describe('DEFAULT_PROMPT_VERSION', () => {
		it('should default to v1-sonnet', () => {
			expect(DEFAULT_PROMPT_VERSION).toBe('v1-sonnet');
		});

		it('should be a valid prompt version', () => {
			expect(PROMPT_VERSIONS[DEFAULT_PROMPT_VERSION]).toBeDefined();
		});
	});

	describe('AVAILABLE_PROMPT_VERSIONS', () => {
		it('should contain all registered versions', () => {
			expect(AVAILABLE_PROMPT_VERSIONS).toContain('v1-sonnet');
			expect(AVAILABLE_PROMPT_VERSIONS).toContain('v2-opus');
		});

		it('should match the keys of PROMPT_VERSIONS', () => {
			const registryKeys = Object.keys(PROMPT_VERSIONS);
			expect(AVAILABLE_PROMPT_VERSIONS.length).toBe(registryKeys.length);
			for (const key of registryKeys) {
				expect(AVAILABLE_PROMPT_VERSIONS).toContain(key);
			}
		});
	});

	describe('re-exported prompt builders', () => {
		it('should export buildOneShotGeneratorPrompt from v1-sonnet', () => {
			expect(typeof buildOneShotGeneratorPrompt).toBe('function');
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);
			expect(result).toHaveProperty('invoke');
		});

		it('should export buildRawSystemPrompt from v1-sonnet', () => {
			expect(typeof buildRawSystemPrompt).toBe('function');
			const result = buildRawSystemPrompt(mockNodeIds, mockSdkSourceCode);
			expect(typeof result).toBe('string');
		});

		it('should export buildOpusOneShotGeneratorPrompt from v2-opus', () => {
			expect(typeof buildOpusOneShotGeneratorPrompt).toBe('function');
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);
			expect(result).toHaveProperty('invoke');
		});

		it('should export buildOpusRawSystemPrompt from v2-opus', () => {
			expect(typeof buildOpusRawSystemPrompt).toBe('function');
			const result = buildOpusRawSystemPrompt(mockNodeIds, mockSdkSourceCode);
			expect(typeof result).toBe('string');
		});
	});

	describe('PromptVersionDefinition.buildPrompt', () => {
		it('should build prompt for v1-sonnet via registry', () => {
			const version = PROMPT_VERSIONS['v1-sonnet'];
			const result = version.buildPrompt(mockNodeIds, mockSdkSourceCode);
			expect(result).toHaveProperty('invoke');
		});

		it('should build prompt for v2-opus via registry', () => {
			const version = PROMPT_VERSIONS['v2-opus'];
			const result = version.buildPrompt(mockNodeIds, mockSdkSourceCode);
			expect(result).toHaveProperty('invoke');
		});

		it('should accept optional currentWorkflow parameter', () => {
			const currentWorkflow = "return workflow('test', 'Test Workflow').add(trigger({...}));";
			const version = PROMPT_VERSIONS['v1-sonnet'];
			const result = version.buildPrompt(mockNodeIds, mockSdkSourceCode, currentWorkflow);
			expect(result).toHaveProperty('invoke');
		});
	});

	describe('PromptVersionDefinition.buildRawPrompt', () => {
		it('should build raw prompt for v1-sonnet via registry', () => {
			const version = PROMPT_VERSIONS['v1-sonnet'];
			expect(version.buildRawPrompt).toBeDefined();
			const result = version.buildRawPrompt!(mockNodeIds, mockSdkSourceCode);
			expect(typeof result).toBe('string');
		});

		it('should build raw prompt for v2-opus via registry', () => {
			const version = PROMPT_VERSIONS['v2-opus'];
			expect(version.buildRawPrompt).toBeDefined();
			const result = version.buildRawPrompt!(mockNodeIds, mockSdkSourceCode);
			expect(typeof result).toBe('string');
		});
	});
});
