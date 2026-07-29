import type { INodeTypeDescription, INode, IConnections } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import type { ProgrammaticViolation } from '@/validation/types';

import { autoFixConnections } from '../auto-fix-connections';

describe('autoFixConnections', () => {
	// Mock node types
	const mockAgentNodeType: INodeTypeDescription = {
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		group: ['transform'],
		version: 1,
		inputs: [
			NodeConnectionTypes.Main,
			{ type: 'ai_languageModel', required: true, displayName: 'Model', maxConnections: 1 },
			{ type: 'ai_tool', required: false, displayName: 'Tools' },
			{ type: 'ai_memory', required: false, displayName: 'Memory', maxConnections: 1 },
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'AI Agent' },
		description: '',
	};

	const mockChatModelNodeType: INodeTypeDescription = {
		displayName: 'OpenAI Chat Model',
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		group: ['output'],
		version: 1,
		inputs: [],
		outputs: ['ai_languageModel'],
		properties: [],
		defaults: { name: 'OpenAI Chat Model' },
		description: '',
	};

	const mockVectorStoreNodeType: INodeTypeDescription = {
		displayName: 'Vector Store',
		name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
		group: ['transform'],
		version: 1,
		inputs: [
			NodeConnectionTypes.Main,
			{ type: 'ai_embedding', required: true, displayName: 'Embeddings', maxConnections: 1 },
			{ type: 'ai_document', required: false, displayName: 'Documents' },
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'Vector Store' },
		description: '',
	};

	const mockEmbeddingsNodeType: INodeTypeDescription = {
		displayName: 'OpenAI Embeddings',
		name: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
		group: ['output'],
		version: 1,
		inputs: [],
		outputs: ['ai_embedding'],
		properties: [],
		defaults: { name: 'OpenAI Embeddings' },
		description: '',
	};

	const mockTriggerNodeType: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'n8n-nodes-base.manualTrigger',
		group: ['trigger'],
		version: 1,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'Manual Trigger' },
		description: '',
	};

	const mockNodeTypes = [
		mockAgentNodeType,
		mockChatModelNodeType,
		mockVectorStoreNodeType,
		mockEmbeddingsNodeType,
		mockTriggerNodeType,
	];

	// Helper to create nodes
	function createNode(overrides: Partial<INode> & { name: string; type: string }): INode {
		return {
			id: overrides.id ?? `id-${overrides.name}`,
			name: overrides.name,
			type: overrides.type,
			typeVersion: overrides.typeVersion ?? 1,
			position: overrides.position ?? [0, 0],
			parameters: overrides.parameters ?? {},
			disabled: overrides.disabled ?? false,
		};
	}

	// Helper to create workflow
	function createWorkflow(nodes: INode[], connections: IConnections = {}): SimpleWorkflow {
		return {
			name: 'Test Workflow',
			nodes,
			connections,
		};
	}

	describe('Pass 1: Fix nodes missing required inputs', () => {
		it('should auto-fix when exactly one sub-node can provide the missing input', () => {
			const workflow = createWorkflow(
				[
					createNode({ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
					createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				],
				{
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
				},
			);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
				{
					name: 'sub-node-not-connected',
					type: 'critical',
					description:
						'Sub-node OpenAI Model (@n8n/n8n-nodes-langchain.lmChatOpenAi) provides ai_languageModel but is not connected to a root node.',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'OpenAI Model',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						outputType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(1);
			expect(result.fixed[0]).toMatchObject({
				sourceNodeName: 'OpenAI Model',
				targetNodeName: 'AI Agent',
				connectionType: 'ai_languageModel',
			});
			expect(result.unfixable).toHaveLength(0);
			expect(result.updatedConnections['OpenAI Model']?.ai_languageModel).toBeDefined();
		});

		it('should report unfixable when multiple sub-nodes can provide the same input', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({ name: 'OpenAI Model 1', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				createNode({ name: 'OpenAI Model 2', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(1);
			expect(result.unfixable[0].reason).toContain('Multiple sub-nodes');
			expect(result.unfixable[0].candidateCount).toBe(2);
		});

		it('should report unfixable when no sub-node can provide the input', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(1);
			expect(result.unfixable[0].reason).toContain('No available sub-node');
			expect(result.unfixable[0].candidateCount).toBe(0);
		});

		it('should skip disabled nodes when searching for candidates', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					disabled: true,
				}),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(1);
			expect(result.unfixable[0].reason).toContain('No available sub-node');
		});

		it('should allow a sub-node to connect to multiple root nodes', () => {
			const workflow = createWorkflow(
				[
					createNode({ name: 'AI Agent 1', type: '@n8n/n8n-nodes-langchain.agent' }),
					createNode({ name: 'AI Agent 2', type: '@n8n/n8n-nodes-langchain.agent' }),
					createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				],
				{
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent 1', type: 'ai_languageModel', index: 0 }]],
					},
				},
			);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent 2 (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent 2',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// Sub-node is connected to Agent 1 but can still connect to Agent 2
			expect(result.fixed).toHaveLength(1);
			expect(result.fixed[0]).toMatchObject({
				sourceNodeName: 'OpenAI Model',
				targetNodeName: 'AI Agent 2',
				connectionType: 'ai_languageModel',
			});
			expect(result.unfixable).toHaveLength(0);
		});

		it('should fix Vector Store missing embeddings', () => {
			const workflow = createWorkflow([
				createNode({ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
				createNode({ name: 'Vector Store', type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory' }),
				createNode({ name: 'Embeddings', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory) is missing required input of type ai_embedding',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'Vector Store',
						nodeType: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
						missingType: 'ai_embedding',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(1);
			expect(result.fixed[0]).toMatchObject({
				sourceNodeName: 'Embeddings',
				targetNodeName: 'Vector Store',
				connectionType: 'ai_embedding',
			});
		});
	});

	describe('Pass 2: Fix disconnected sub-nodes', () => {
		it('should connect orphaned sub-node to only available target', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			]);

			// Only sub-node-not-connected violation, no node-missing-required-input
			const violations: ProgrammaticViolation[] = [
				{
					name: 'sub-node-not-connected',
					type: 'critical',
					description:
						'Sub-node OpenAI Model (@n8n/n8n-nodes-langchain.lmChatOpenAi) provides ai_languageModel but is not connected to a root node.',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'OpenAI Model',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						outputType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(1);
			expect(result.fixed[0]).toMatchObject({
				sourceNodeName: 'OpenAI Model',
				targetNodeName: 'AI Agent',
				connectionType: 'ai_languageModel',
			});
		});

		it('should report unfixable when multiple targets accept the same input', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent 1', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({ name: 'AI Agent 2', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'sub-node-not-connected',
					type: 'critical',
					description:
						'Sub-node OpenAI Model (@n8n/n8n-nodes-langchain.lmChatOpenAi) provides ai_languageModel but is not connected to a root node.',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'OpenAI Model',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						outputType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(1);
			expect(result.unfixable[0].reason).toContain('Multiple targets');
		});

		it('should skip sub-node already fixed in Pass 1', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			]);

			// Both violations - Pass 1 should fix, Pass 2 should skip
			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
				{
					name: 'sub-node-not-connected',
					type: 'critical',
					description:
						'Sub-node OpenAI Model (@n8n/n8n-nodes-langchain.lmChatOpenAi) provides ai_languageModel but is not connected to a root node.',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'OpenAI Model',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						outputType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// Should only have 1 fix, not 2
			expect(result.fixed).toHaveLength(1);
			expect(result.unfixable).toHaveLength(0);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty violations array', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			]);

			const result = autoFixConnections(workflow, mockNodeTypes, []);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(0);
		});

		it('should handle empty workflow', () => {
			const workflow = createWorkflow([]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(0);
		});

		it('should only fix AI connections (skip main)', () => {
			const workflow = createWorkflow([
				createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type main',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'main',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// main connections are not auto-fixed
			expect(result.fixed).toHaveLength(0);
			expect(result.unfixable).toHaveLength(0);
		});

		it('should not create duplicate connections', () => {
			const workflow = createWorkflow(
				[
					createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
					createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				],
				{
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
				},
			);

			// Violation says missing, but connection already exists
			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// Sub-node is already connected to this target, so no fix needed
			expect(result.fixed).toHaveLength(0);
			// Reports unfixable because the only candidate is already connected to this target
			expect(result.unfixable).toHaveLength(1);
			expect(result.unfixable[0].reason).toContain('No available sub-node');
		});

		it('should handle unknown node types gracefully', () => {
			const workflow = createWorkflow([
				createNode({ name: 'Unknown Node', type: 'n8n-nodes-base.unknown' }),
				createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			]);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node Unknown Node (n8n-nodes-base.unknown) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'Unknown Node',
						nodeType: 'n8n-nodes-base.unknown',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// Auto-fix should still work based on the metadata
			// The node type doesn't need to be known since the metadata already tells us what input is needed
			expect(result.fixed).toHaveLength(1);
			expect(result.fixed[0].targetNodeName).toBe('Unknown Node');
			expect(result.fixed[0].connectionType).toBe('ai_languageModel');
		});

		it('should preserve existing connections when adding new ones', () => {
			const existingConnections: IConnections = {
				'Manual Trigger': {
					main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
				},
			};

			const workflow = createWorkflow(
				[
					createNode({ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					createNode({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
					createNode({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				],
				existingConnections,
			);

			const violations: ProgrammaticViolation[] = [
				{
					name: 'node-missing-required-input',
					type: 'critical',
					description:
						'Node AI Agent (@n8n/n8n-nodes-langchain.agent) is missing required input of type ai_languageModel',
					pointsDeducted: 50,
					metadata: {
						nodeName: 'AI Agent',
						nodeType: '@n8n/n8n-nodes-langchain.agent',
						missingType: 'ai_languageModel',
					},
				},
			];

			const result = autoFixConnections(workflow, mockNodeTypes, violations);

			// Existing connection should be preserved
			expect(result.updatedConnections['Manual Trigger']).toBeDefined();
			expect(result.updatedConnections['Manual Trigger'].main[0]?.[0].node).toBe('AI Agent');

			// New connection should be added
			expect(result.updatedConnections['OpenAI Model']).toBeDefined();
			expect(result.fixed).toHaveLength(1);
		});
	});
});
