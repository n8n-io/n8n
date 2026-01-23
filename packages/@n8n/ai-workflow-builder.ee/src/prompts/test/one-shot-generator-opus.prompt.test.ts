import type { NodeWithDiscriminators } from '../../utils/node-type-parser';
import {
	buildOpusOneShotGeneratorPrompt,
	buildOpusRawSystemPrompt,
} from '../one-shot-generator-opus.prompt';

describe('one-shot-generator-opus.prompt', () => {
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

	describe('buildOpusOneShotGeneratorPrompt', () => {
		it('should return a ChatPromptTemplate', () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			// ChatPromptTemplate has invoke method
			expect(result).toHaveProperty('invoke');
			expect(typeof result.invoke).toBe('function');
		});

		it('should include SDK API reference in the prompt', async () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			// Format the prompt to check contents
			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<sdk_api_reference>');
			expect(formatted).toContain('</sdk_api_reference>');
		});

		it('should include available nodes section in the prompt', async () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<available_nodes>');
			expect(formatted).toContain('</available_nodes>');
		});

		it('should include workflow examples in the prompt', async () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<workflow_examples>');
		});

		it('should include mandatory workflow instructions', async () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<mandatory_workflow>');
			expect(formatted).toContain('get_nodes');
		});

		it('should include output format instructions', async () => {
			const result = buildOpusOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<output_format>');
			expect(formatted).toContain('workflowCode');
		});

		it('should include current workflow context when provided', async () => {
			const currentWorkflow = "return workflow('test', 'Test Workflow').add(trigger({...}));";
			const result = buildOpusOneShotGeneratorPrompt(
				mockNodeIds,
				mockSdkSourceCode,
				currentWorkflow,
			);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<current_workflow>');
			expect(formatted).toContain('Test Workflow');
		});
	});

	describe('buildOpusRawSystemPrompt', () => {
		it('should return a string', () => {
			const result = buildOpusRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			expect(typeof result).toBe('string');
		});

		it('should include SDK API reference', () => {
			const result = buildOpusRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			expect(result).toContain('<sdk_api_reference>');
			expect(result).toContain(mockSdkSourceCode);
		});

		it('should include all major sections', () => {
			const result = buildOpusRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			expect(result).toContain('<role>');
			expect(result).toContain('<available_nodes>');
			expect(result).toContain('<workflow_rules>');
			expect(result).toContain('<ai_patterns>');
			expect(result).toContain('<workflow_examples>');
			expect(result).toContain('<mandatory_workflow>');
			expect(result).toContain('<output_format>');
		});
	});
});
