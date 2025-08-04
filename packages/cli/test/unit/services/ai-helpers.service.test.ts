import { AiHelpersService } from '@/services/ai-helpers.service';
import { NodeTypes } from '@/node-types';
import { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

// Mock the AI workflow builder import
jest.mock('@n8n/ai-workflow-builder', () => ({
	AiWorkflowBuilderService: jest.fn().mockImplementation(() => ({
		suggestNodes: jest.fn(),
		mapParameters: jest.fn(),
		provideAssistance: jest.fn(),
	})),
}));

describe('AiHelpersService', () => {
	let service: AiHelpersService;
	let logger: jest.Mocked<Logger>;
	let nodeTypes: jest.Mocked<NodeTypes>;
	let user: IUser;

	const mockNodeTypes: INodeTypeDescription[] = [
		{
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes HTTP requests',
			properties: [
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
				},
			],
			group: ['transform'],
			version: 1,
			defaults: {
				name: 'HTTP Request',
			},
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-base.set',
			displayName: 'Set',
			description: 'Sets node values',
			properties: [
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
			group: ['transform'],
			version: 1,
			defaults: {
				name: 'Set',
			},
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-base.if',
			displayName: 'If',
			description: 'Conditional logic',
			properties: [],
			group: ['logic'],
			version: 1,
			defaults: {
				name: 'If',
			},
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			description: 'Execute custom code',
			properties: [],
			group: ['transform'],
			version: 1,
			defaults: {
				name: 'Code',
			},
			inputs: ['main'],
			outputs: ['main'],
		},
	];

	const mockWorkflowData = {
		nodes: [
			{ id: 'node1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', parameters: {} },
			{ id: 'node2', name: 'Set', type: 'n8n-nodes-base.set', parameters: {} },
		],
		connections: {},
	};

	beforeEach(() => {
		logger = mock<Logger>();
		nodeTypes = mock<NodeTypes>();
		nodeTypes.getAll.mockReturnValue(mockNodeTypes);
		nodeTypes.getByNameAndVersion.mockImplementation((name) =>
			mockNodeTypes.find((nt) => nt.name === name),
		);

		service = new AiHelpersService(logger, nodeTypes);

		user = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		} as IUser;
	});

	describe('suggestNodes', () => {
		it('should return rule-based suggestions when AI is unavailable', async () => {
			const suggestions = await service.suggestNodes(mockWorkflowData, user, {
				currentNodeId: 'node1',
				contextType: 'next_node',
			});

			expect(suggestions).toHaveLength(4);
			expect(suggestions[0]).toMatchObject({
				nodeType: 'n8n-nodes-base.set',
				displayName: 'Set',
				confidence: expect.any(Number),
				reasoning: 'Commonly used after n8n-nodes-base.httpRequest nodes',
			});
		});

		it('should return general popular node suggestions when no current node', async () => {
			const suggestions = await service.suggestNodes(mockWorkflowData, user, {
				contextType: 'general',
			});

			expect(suggestions).toHaveLength(4);
			expect(suggestions[0].reasoning).toBe('Commonly used in workflows');
		});

		it('should limit suggestions to 5 items', async () => {
			const suggestions = await service.suggestNodes(mockWorkflowData, user);

			expect(suggestions.length).toBeLessThanOrEqual(5);
		});

		it('should include connection hints for next_node context', async () => {
			const suggestions = await service.suggestNodes(mockWorkflowData, user, {
				currentNodeId: 'node1',
				contextType: 'next_node',
			});

			const suggestionWithHint = suggestions.find((s) => s.connectionHint);
			expect(suggestionWithHint?.connectionHint).toMatchObject({
				position: 'after',
				inputType: 'main',
				outputType: 'main',
			});
		});
	});

	describe('mapParameters', () => {
		it('should generate rule-based parameter mappings', async () => {
			const sourceNode = {
				id: 'node1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://api.example.com', method: 'GET' },
			};
			const targetNode = {
				id: 'node2',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {},
			};

			const workflowData = {
				nodes: [sourceNode, targetNode],
				connections: {},
			};

			const result = await service.mapParameters('node1', 'node2', workflowData, user);

			expect(result).toHaveProperty('mappings');
			expect(result).toHaveProperty('suggestions');
			expect(Array.isArray(result.mappings)).toBe(true);
			expect(Array.isArray(result.suggestions)).toBe(true);
			expect(result.suggestions.length).toBeGreaterThan(0);
		});

		it('should throw error when source node not found', async () => {
			await expect(
				service.mapParameters('nonexistent', 'node2', mockWorkflowData, user),
			).rejects.toThrow('Source or target node not found');
		});

		it('should throw error when target node not found', async () => {
			await expect(
				service.mapParameters('node1', 'nonexistent', mockWorkflowData, user),
			).rejects.toThrow('Source or target node not found');
		});
	});

	describe('provideWorkflowAssistance', () => {
		it('should provide error handling assistance', async () => {
			const assistance = await service.provideWorkflowAssistance(
				mockWorkflowData,
				'My workflow is failing with errors',
				user,
			);

			expect(assistance).toHaveLength(1);
			expect(assistance[0]).toMatchObject({
				type: 'fix',
				title: 'Add Error Handling',
				description: 'Consider adding error handling to prevent workflow failures',
				actionable: true,
				priority: 'high',
			});
			expect(assistance[0].actions).toHaveLength(1);
			expect(assistance[0].actions![0]).toMatchObject({
				type: 'add_node',
				nodeType: 'If',
			});
		});

		it('should provide performance assistance', async () => {
			const assistance = await service.provideWorkflowAssistance(
				mockWorkflowData,
				'My workflow is running slowly',
				user,
			);

			expect(assistance).toHaveLength(1);
			expect(assistance[0]).toMatchObject({
				type: 'optimization',
				title: 'Improve Performance',
				priority: 'medium',
			});
		});

		it('should provide data transformation assistance', async () => {
			const assistance = await service.provideWorkflowAssistance(
				mockWorkflowData,
				'How do I transform my data?',
				user,
			);

			expect(assistance).toHaveLength(1);
			expect(assistance[0]).toMatchObject({
				type: 'suggestion',
				title: 'Data Transformation',
				actionable: true,
			});
		});

		it('should return empty array for unrecognized queries', async () => {
			const assistance = await service.provideWorkflowAssistance(
				mockWorkflowData,
				'unrelated query',
				user,
			);

			expect(assistance).toHaveLength(0);
		});
	});

	describe('getNodeRecommendations', () => {
		it('should return filtered node recommendations', async () => {
			const recommendations = await service.getNodeRecommendations(user, {
				category: 'transform',
				difficulty: 'beginner',
				limit: 5,
			});

			expect(recommendations.length).toBeLessThanOrEqual(5);
			recommendations.forEach((rec) => {
				expect(rec).toHaveProperty('nodeType');
				expect(rec).toHaveProperty('displayName');
				expect(rec).toHaveProperty('category');
				expect(rec).toHaveProperty('difficulty');
				expect(rec).toHaveProperty('popularity');
				expect(rec).toHaveProperty('tags');
			});
		});

		it('should filter by category', async () => {
			const recommendations = await service.getNodeRecommendations(user, {
				category: 'logic',
			});

			recommendations.forEach((rec) => {
				expect(rec.category).toBe('logic');
			});
		});

		it('should filter by difficulty', async () => {
			const recommendations = await service.getNodeRecommendations(user, {
				difficulty: 'advanced',
			});

			recommendations.forEach((rec) => {
				expect(rec.difficulty).toBe('advanced');
			});
		});

		it('should respect limit parameter', async () => {
			const recommendations = await service.getNodeRecommendations(user, {
				limit: 2,
			});

			expect(recommendations.length).toBeLessThanOrEqual(2);
		});

		it('should enforce maximum limit of 50', async () => {
			const recommendations = await service.getNodeRecommendations(user, {
				limit: 100,
			});

			expect(recommendations.length).toBeLessThanOrEqual(50);
		});

		it('should exclude hidden nodes', async () => {
			const hiddenNodeType = {
				...mockNodeTypes[0],
				name: 'hidden-node',
				hidden: true,
			};
			nodeTypes.getAll.mockReturnValue([...mockNodeTypes, hiddenNodeType]);

			const recommendations = await service.getNodeRecommendations(user);

			expect(recommendations.find((rec) => rec.nodeType === 'hidden-node')).toBeUndefined();
		});
	});

	describe('optimizeWorkflow', () => {
		it('should analyze workflow and return optimizations', async () => {
			const optimization = await service.optimizeWorkflow(mockWorkflowData, user, {
				optimizationType: 'all',
			});

			expect(optimization).toHaveProperty('optimizations');
			expect(optimization).toHaveProperty('estimatedImprovement');
			expect(optimization.estimatedImprovement).toHaveProperty('performance');
			expect(optimization.estimatedImprovement).toHaveProperty('maintainability');
			expect(optimization.estimatedImprovement).toHaveProperty('reliability');
		});

		it('should suggest error handling for workflows without it', async () => {
			const optimization = await service.optimizeWorkflow(mockWorkflowData, user);

			const errorHandlingOptimization = optimization.optimizations.find(
				(opt) => opt.type === 'error_handling',
			);
			expect(errorHandlingOptimization).toBeDefined();
			expect(errorHandlingOptimization?.title).toBe('Add Error Handling');
		});

		it('should suggest breaking down large workflows', async () => {
			const largeWorkflow = {
				nodes: Array.from({ length: 15 }, (_, i) => ({
					id: `node${i}`,
					name: `Node ${i}`,
					type: 'n8n-nodes-base.set',
				})),
				connections: {},
			};

			const optimization = await service.optimizeWorkflow(largeWorkflow, user);

			const structureOptimization = optimization.optimizations.find(
				(opt) => opt.type === 'structure',
			);
			expect(structureOptimization).toBeDefined();
			expect(structureOptimization?.title).toBe('Consider Breaking Down Workflow');
		});
	});

	describe('explainWorkflow', () => {
		it('should provide workflow explanation with overview', async () => {
			const explanation = await service.explainWorkflow(mockWorkflowData, user, {
				explanationType: 'overview',
			});

			expect(explanation).toHaveProperty('overview');
			expect(explanation).toHaveProperty('flow');
			expect(explanation).toHaveProperty('complexity');
			expect(explanation).toHaveProperty('executionTime');
			expect(explanation).toHaveProperty('commonPatterns');
			expect(explanation.flow).toHaveLength(2);
		});

		it('should provide detailed explanation', async () => {
			const explanation = await service.explainWorkflow(mockWorkflowData, user, {
				explanationType: 'detailed',
			});

			expect(explanation.flow[0]).toHaveProperty('inputDescription');
			expect(explanation.flow[0]).toHaveProperty('outputDescription');
			expect(explanation.flow[0]).toHaveProperty('keyParameters');
			expect(explanation).toHaveProperty('potentialIssues');
		});

		it('should focus on specific node when focusNodeId provided', async () => {
			const explanation = await service.explainWorkflow(mockWorkflowData, user, {
				focusNodeId: 'node1',
			});

			expect(explanation.flow).toHaveLength(1);
			expect(explanation.flow[0].nodeId).toBe('node1');
		});

		it('should determine workflow complexity correctly', async () => {
			// Simple workflow (≤5 nodes)
			const explanation = await service.explainWorkflow(mockWorkflowData, user);
			expect(explanation.complexity).toBe('simple');

			// Complex workflow (>15 nodes)
			const largeWorkflow = {
				nodes: Array.from({ length: 20 }, (_, i) => ({
					id: `node${i}`,
					name: `Node ${i}`,
					type: 'n8n-nodes-base.set',
				})),
				connections: {},
			};
			const complexExplanation = await service.explainWorkflow(largeWorkflow, user);
			expect(complexExplanation.complexity).toBe('complex');
		});

		it('should estimate execution time based on node count and types', async () => {
			const explanation = await service.explainWorkflow(mockWorkflowData, user);
			expect(explanation.executionTime).toBe('Less than 5 seconds');

			// Workflow with HTTP nodes should have longer estimated time
			const httpWorkflow = {
				nodes: [
					{ id: 'node1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
					{ id: 'node2', name: 'HTTP Request 2', type: 'n8n-nodes-base.httpRequest' },
					{ id: 'node3', name: 'HTTP Request 3', type: 'n8n-nodes-base.httpRequest' },
				],
				connections: {},
			};
			const httpExplanation = await service.explainWorkflow(httpWorkflow, user);
			expect(httpExplanation.executionTime).toBe('5-30 seconds');
		});

		it('should identify common patterns', async () => {
			const webhookWorkflow = {
				nodes: [
					{ id: 'node1', name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					{ id: 'node2', name: 'If', type: 'n8n-nodes-base.if' },
				],
				connections: {},
			};

			const explanation = await service.explainWorkflow(webhookWorkflow, user);
			expect(explanation.commonPatterns).toContain('Webhook trigger pattern');
			expect(explanation.commonPatterns).toContain('Conditional logic pattern');
		});

		it('should identify potential issues', async () => {
			const explanation = await service.explainWorkflow(mockWorkflowData, user, {
				explanationType: 'detailed',
			});

			expect(explanation.potentialIssues).toContain('No error handling detected');
		});
	});

	describe('helper methods', () => {
		it('should categorize nodes correctly', async () => {
			const service = new AiHelpersService(logger, nodeTypes);

			// Access private method through any type casting for testing
			const getNodeCategory = (service as any).getNodeCategory.bind(service);

			const nodeType = mockNodeTypes[0];
			const category = getNodeCategory(nodeType);
			expect(category).toBe('transform');
		});

		it('should determine node difficulty correctly', async () => {
			const service = new AiHelpersService(logger, nodeTypes);
			const getNodeDifficulty = (service as any).getNodeDifficulty.bind(service);

			const setNode = mockNodeTypes.find((nt) => nt.name === 'n8n-nodes-base.set')!;
			expect(getNodeDifficulty(setNode)).toBe('beginner');

			const codeNode = mockNodeTypes.find((nt) => nt.name === 'n8n-nodes-base.code')!;
			expect(getNodeDifficulty(codeNode)).toBe('advanced');

			const httpNode = mockNodeTypes.find((nt) => nt.name === 'n8n-nodes-base.httpRequest')!;
			expect(getNodeDifficulty(httpNode)).toBe('intermediate');
		});

		it('should calculate node popularity correctly', async () => {
			const service = new AiHelpersService(logger, nodeTypes);
			const getNodePopularity = (service as any).getNodePopularity.bind(service);

			const httpNode = { name: 'HTTP Request' };
			expect(getNodePopularity(httpNode)).toBe(100);

			const unknownNode = { name: 'Unknown Node' };
			expect(getNodePopularity(unknownNode)).toBe(50);
		});
	});
});
