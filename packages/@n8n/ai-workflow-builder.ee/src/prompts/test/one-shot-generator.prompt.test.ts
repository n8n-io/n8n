import type { NodeWithDiscriminators } from '../../utils/node-type-parser';
import {
	buildAvailableNodesSection,
	buildOneShotGeneratorPrompt,
	buildRawSystemPrompt,
} from '../one-shot-generator.prompt';

describe('one-shot-generator.prompt', () => {
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

	describe('buildOneShotGeneratorPrompt', () => {
		it('should return a ChatPromptTemplate', () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			// ChatPromptTemplate has invoke method
			expect(result).toHaveProperty('invoke');
			expect(typeof result.invoke).toBe('function');
		});

		it('should NOT include SDK API reference in the prompt (commented out for Sonnet 4.5)', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			// Format the prompt to check contents
			const formatted = await result.format({ userMessage: 'test message' });

			// SDK reference should NOT be present in Sonnet 4.5 optimized prompt
			expect(formatted).not.toContain('<sdk_api_reference>');
			expect(formatted).not.toContain('</sdk_api_reference>');
		});

		it('should include available nodes section in the prompt', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<available_nodes>');
			expect(formatted).toContain('</available_nodes>');
		});

		it('should include workflow patterns in the prompt', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			// Check for key workflow patterns from the optimized prompt
			expect(formatted).toContain('Linear Chain');
			expect(formatted).toContain('Conditional Branching');
		});

		it('should include mandatory workflow instructions', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('get_nodes');
		});

		it('should include output format instructions', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('workflowCode');
		});

		it('should include planning section instruction', async () => {
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode);

			const formatted = await result.format({ userMessage: 'test message' });

			// The optimized Sonnet prompt has a <planning> tags instruction
			expect(formatted).toContain('<planning>');
		});

		it('should include current workflow context when provided', async () => {
			const currentWorkflow = "return workflow('test', 'Test Workflow').add(trigger({...}));";
			const result = buildOneShotGeneratorPrompt(mockNodeIds, mockSdkSourceCode, currentWorkflow);

			const formatted = await result.format({ userMessage: 'test message' });

			expect(formatted).toContain('<current_workflow>');
			expect(formatted).toContain('Test Workflow');
		});
	});

	describe('buildRawSystemPrompt', () => {
		it('should return a string', () => {
			const result = buildRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			expect(typeof result).toBe('string');
		});

		it('should NOT include SDK API reference (commented out for Sonnet 4.5)', () => {
			const result = buildRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			// SDK reference should NOT be present in Sonnet 4.5 optimized prompt
			expect(result).not.toContain('<sdk_api_reference>');
		});

		it('should include all major sections', () => {
			const result = buildRawSystemPrompt(mockNodeIds, mockSdkSourceCode);

			expect(result).toContain('<available_nodes>');
			expect(result).toContain('get_nodes');
			expect(result).toContain('workflowCode');
		});
	});

	describe('buildAvailableNodesSection', () => {
		it('should format nodes without discriminators as simple list items', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' }],
				core: [{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' }],
				ai: [],
				other: [],
			};

			const result = buildAvailableNodesSection(nodeIds);

			expect(result).toContain('n8n-nodes-base.manualTrigger');
			expect(result).toContain('n8n-nodes-base.httpRequest');
		});

		it('should include resource/operation discriminators in output', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [],
				core: [],
				ai: [],
				other: [
					{
						id: 'n8n-nodes-base.freshservice',
						displayName: 'Freshservice',
						discriminators: {
							type: 'resource_operation',
							resources: [
								{ value: 'ticket', operations: ['get', 'create', 'delete'] },
								{ value: 'agent', operations: ['get', 'list'] },
							],
						},
					},
				],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// Should include node ID
			expect(result).toContain('n8n-nodes-base.freshservice');

			// Should include discriminator section
			expect(result).toMatch(/resource.*ticket/i);
			expect(result).toMatch(/resource.*agent/i);

			// Should show operations
			expect(result).toContain('get');
			expect(result).toContain('create');
			expect(result).toContain('delete');
			expect(result).toContain('list');

			// Should include usage hint for get_nodes
			expect(result).toContain('get_nodes');
		});

		it('should include mode discriminators in output', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [],
				core: [
					{
						id: 'n8n-nodes-base.code',
						displayName: 'Code',
						discriminators: {
							type: 'mode',
							modes: ['runOnceForAllItems', 'runOnceForEachItem'],
						},
					},
				],
				ai: [],
				other: [],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// Should include node ID
			expect(result).toContain('n8n-nodes-base.code');

			// Should include mode discriminator
			expect(result).toContain('mode');
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('runOnceForEachItem');

			// Should include usage hint
			expect(result).toContain('get_nodes');
		});

		it('should mix nodes with and without discriminators', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' }],
				core: [
					{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' },
					{
						id: 'n8n-nodes-base.code',
						displayName: 'Code',
						discriminators: {
							type: 'mode',
							modes: ['runOnceForAllItems', 'runOnceForEachItem'],
						},
					},
				],
				ai: [],
				other: [
					{
						id: 'n8n-nodes-base.freshservice',
						displayName: 'Freshservice',
						discriminators: {
							type: 'resource_operation',
							resources: [{ value: 'ticket', operations: ['get', 'create'] }],
						},
					},
				],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// All nodes should be present
			expect(result).toContain('n8n-nodes-base.manualTrigger');
			expect(result).toContain('n8n-nodes-base.httpRequest');
			expect(result).toContain('n8n-nodes-base.code');
			expect(result).toContain('n8n-nodes-base.freshservice');

			// Discriminators should be present for nodes that have them
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('ticket');
		});

		it('should limit triggers to first 20 and other to first 50', () => {
			// Create more than 20 triggers and 50 other nodes
			const triggers: NodeWithDiscriminators[] = Array.from({ length: 25 }, (_, i) => ({
				id: `n8n-nodes-base.trigger${i}`,
				displayName: `Trigger ${i}`,
			}));
			const other: NodeWithDiscriminators[] = Array.from({ length: 60 }, (_, i) => ({
				id: `n8n-nodes-base.node${i}`,
				displayName: `Node ${i}`,
			}));

			const result = buildAvailableNodesSection({
				triggers,
				core: [],
				ai: [],
				other,
			});

			// Should have first 20 triggers, not all 25
			expect(result).toContain('n8n-nodes-base.trigger0');
			expect(result).toContain('n8n-nodes-base.trigger19');
			expect(result).not.toContain('n8n-nodes-base.trigger24');

			// Should have first 50 other nodes, not all 60
			expect(result).toContain('n8n-nodes-base.node0');
			expect(result).toContain('n8n-nodes-base.node49');
			expect(result).not.toContain('n8n-nodes-base.node59');

			// Should indicate more nodes exist
			expect(result).toContain('more integration nodes');
		});
	});
});
