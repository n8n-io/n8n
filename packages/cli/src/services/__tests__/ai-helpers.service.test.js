'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const node_types_1 = require('@/node-types');
const ai_helpers_service_1 = require('@/services/ai-helpers.service');
describe('AiHelpersService', () => {
	const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
	let aiHelpersService;
	const mockUser = (0, jest_mock_extended_1.mock)({
		id: '123',
		email: 'test@example.com',
	});
	const mockNodeType = (0, jest_mock_extended_1.mock)({
		name: 'Set',
		displayName: 'Set',
		description: 'Sets node values',
		group: ['transform'],
		properties: [
			{
				displayName: 'Value1',
				name: 'value1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
		],
	});
	beforeEach(() => {
		jest.clearAllMocks();
		aiHelpersService = new ai_helpers_service_1.AiHelpersService(logger, nodeTypes);
		nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType);
		nodeTypes.getAll.mockReturnValue([mockNodeType]);
	});
	describe('suggestNodes', () => {
		const workflowData = {
			nodes: [
				{
					id: 'node1',
					name: 'Start',
					type: 'Manual Trigger',
					typeVersion: 1,
					parameters: {},
				},
			],
			connections: {},
		};
		it('should return node suggestions for general context', async () => {
			const suggestions = await aiHelpersService.suggestNodes(workflowData, mockUser);
			expect(suggestions).toBeDefined();
			expect(Array.isArray(suggestions)).toBe(true);
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0]).toMatchObject({
				nodeType: expect.any(String),
				displayName: expect.any(String),
				description: expect.any(String),
				category: expect.any(String),
				confidence: expect.any(Number),
				reasoning: expect.any(String),
			});
		});
		it('should return suggestions for next_node context', async () => {
			const suggestions = await aiHelpersService.suggestNodes(workflowData, mockUser, {
				currentNodeId: 'node1',
				contextType: 'next_node',
			});
			expect(suggestions).toBeDefined();
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0].connectionHint?.position).toBe('after');
		});
		it('should handle empty workflow data gracefully', async () => {
			const emptyWorkflow = { nodes: [], connections: {} };
			const suggestions = await aiHelpersService.suggestNodes(emptyWorkflow, mockUser);
			expect(suggestions).toBeDefined();
			expect(Array.isArray(suggestions)).toBe(true);
		});
	});
	describe('mapParameters', () => {
		const workflowData = {
			nodes: [
				{
					id: 'source',
					name: 'Source Node',
					type: 'Set',
					typeVersion: 1,
					parameters: { value1: 'test', email: 'user@example.com' },
				},
				{
					id: 'target',
					name: 'Target Node',
					type: 'Set',
					typeVersion: 1,
					parameters: {},
				},
			],
			connections: {},
		};
		it('should generate parameter mappings between nodes', async () => {
			const result = await aiHelpersService.mapParameters(
				'source',
				'target',
				workflowData,
				mockUser,
			);
			expect(result).toBeDefined();
			expect(result.mappings).toBeDefined();
			expect(result.suggestions).toBeDefined();
			expect(Array.isArray(result.mappings)).toBe(true);
			expect(Array.isArray(result.suggestions)).toBe(true);
		});
		it('should handle email field mapping with high confidence', async () => {
			const result = await aiHelpersService.mapParameters(
				'source',
				'target',
				workflowData,
				mockUser,
			);
			const emailMapping = result.mappings.find((m) => m.targetParameter === 'email');
			expect(emailMapping).toBeDefined();
			expect(emailMapping?.confidence).toBeGreaterThan(0.8);
			expect(emailMapping?.mappingType).toBe('direct');
		});
		it('should throw error for non-existent nodes', async () => {
			await expect(
				aiHelpersService.mapParameters('invalid', 'target', workflowData, mockUser),
			).rejects.toThrow('Source or target node not found');
		});
	});
	describe('provideWorkflowAssistance', () => {
		const workflowData = {
			nodes: [
				{
					id: 'node1',
					name: 'HTTP Request',
					type: 'HTTP Request',
					typeVersion: 1,
					parameters: {},
				},
			],
			connections: {},
		};
		it('should provide error handling suggestions for error queries', async () => {
			const assistance = await aiHelpersService.provideWorkflowAssistance(
				workflowData,
				'My workflow is failing with errors',
				mockUser,
			);
			expect(assistance).toBeDefined();
			expect(Array.isArray(assistance)).toBe(true);
			expect(assistance.some((a) => a.type === 'fix')).toBe(true);
			expect(assistance.some((a) => a.title.includes('Error Handling'))).toBe(true);
		});
		it('should provide performance suggestions for performance queries', async () => {
			const assistance = await aiHelpersService.provideWorkflowAssistance(
				workflowData,
				'My workflow is running slow',
				mockUser,
			);
			expect(assistance).toBeDefined();
			expect(assistance.some((a) => a.type === 'optimization')).toBe(true);
		});
		it('should provide data transformation suggestions', async () => {
			const assistance = await aiHelpersService.provideWorkflowAssistance(
				workflowData,
				'How do I transform my data?',
				mockUser,
			);
			expect(assistance).toBeDefined();
			expect(assistance.some((a) => a.type === 'suggestion')).toBe(true);
		});
	});
	describe('getNodeRecommendations', () => {
		it('should return filtered node recommendations', async () => {
			const recommendations = await aiHelpersService.getNodeRecommendations(mockUser, {
				category: 'transform',
				difficulty: 'beginner',
				limit: 5,
			});
			expect(recommendations).toBeDefined();
			expect(Array.isArray(recommendations)).toBe(true);
			expect(recommendations.length).toBeLessThanOrEqual(5);
			expect(recommendations[0]).toMatchObject({
				nodeType: expect.any(String),
				displayName: expect.any(String),
				description: expect.any(String),
				category: expect.any(String),
				difficulty: expect.any(String),
				popularity: expect.any(Number),
				tags: expect.any(Array),
			});
		});
		it('should respect limit parameter', async () => {
			const recommendations = await aiHelpersService.getNodeRecommendations(mockUser, {
				limit: 3,
			});
			expect(recommendations.length).toBeLessThanOrEqual(3);
		});
		it('should handle empty criteria', async () => {
			const recommendations = await aiHelpersService.getNodeRecommendations(mockUser);
			expect(recommendations).toBeDefined();
			expect(Array.isArray(recommendations)).toBe(true);
		});
	});
	describe('optimizeWorkflow', () => {
		const complexWorkflowData = {
			nodes: Array.from({ length: 15 }, (_, i) => ({
				id: `node${i}`,
				name: `Node ${i}`,
				type: 'Set',
				typeVersion: 1,
				parameters: {},
			})),
			connections: {},
		};
		it('should identify workflow optimization opportunities', async () => {
			const optimization = await aiHelpersService.optimizeWorkflow(complexWorkflowData, mockUser);
			expect(optimization).toBeDefined();
			expect(optimization.optimizations).toBeDefined();
			expect(optimization.estimatedImprovement).toBeDefined();
			expect(Array.isArray(optimization.optimizations)).toBe(true);
		});
		it('should suggest breaking down large workflows', async () => {
			const optimization = await aiHelpersService.optimizeWorkflow(complexWorkflowData, mockUser);
			expect(optimization.optimizations.some((opt) => opt.title.includes('Breaking Down'))).toBe(
				true,
			);
		});
		it('should calculate improvement estimates', async () => {
			const optimization = await aiHelpersService.optimizeWorkflow(complexWorkflowData, mockUser);
			expect(optimization.estimatedImprovement.performance).toBeGreaterThanOrEqual(0);
			expect(optimization.estimatedImprovement.maintainability).toBeGreaterThanOrEqual(0);
			expect(optimization.estimatedImprovement.reliability).toBeGreaterThanOrEqual(0);
		});
	});
	describe('explainWorkflow', () => {
		const workflowData = {
			nodes: [
				{
					id: 'trigger',
					name: 'Manual Trigger',
					type: 'Manual Trigger',
					typeVersion: 1,
					parameters: {},
				},
				{
					id: 'set',
					name: 'Set Values',
					type: 'Set',
					typeVersion: 1,
					parameters: { value1: 'test' },
				},
			],
			connections: { trigger: { main: [[{ node: 'set', type: 'main', index: 0 }]] } },
		};
		it('should provide workflow explanation', async () => {
			const explanation = await aiHelpersService.explainWorkflow(workflowData, mockUser);
			expect(explanation).toBeDefined();
			expect(explanation.overview).toBeDefined();
			expect(explanation.flow).toBeDefined();
			expect(explanation.complexity).toBeDefined();
			expect(explanation.executionTime).toBeDefined();
			expect(explanation.commonPatterns).toBeDefined();
			expect(Array.isArray(explanation.flow)).toBe(true);
			expect(explanation.flow.length).toBe(2);
		});
		it('should determine workflow complexity correctly', async () => {
			const explanation = await aiHelpersService.explainWorkflow(workflowData, mockUser);
			expect(['simple', 'moderate', 'complex']).toContain(explanation.complexity);
		});
		it('should support detailed explanation type', async () => {
			const explanation = await aiHelpersService.explainWorkflow(workflowData, mockUser, {
				explanationType: 'detailed',
			});
			expect(explanation.flow[0].keyParameters).toBeDefined();
		});
		it('should focus on specific node when requested', async () => {
			const explanation = await aiHelpersService.explainWorkflow(workflowData, mockUser, {
				focusNodeId: 'set',
			});
			expect(explanation.flow.length).toBe(1);
			expect(explanation.flow[0].nodeId).toBe('set');
		});
	});
	describe('field similarity calculation', () => {
		it('should calculate exact match correctly', () => {
			const similarity = aiHelpersService.calculateFieldSimilarity('email', 'email');
			expect(similarity).toBe(1.0);
		});
		it('should calculate substring match correctly', () => {
			const similarity = aiHelpersService.calculateFieldSimilarity('emailAddress', 'email');
			expect(similarity).toBe(0.8);
		});
		it('should calculate common word match correctly', () => {
			const similarity = aiHelpersService.calculateFieldSimilarity('userId', 'customId');
			expect(similarity).toBe(0.7);
		});
		it('should handle completely different fields', () => {
			const similarity = aiHelpersService.calculateFieldSimilarity('email', 'phone');
			expect(similarity).toBeLessThan(0.5);
		});
	});
	describe('mapping confidence calculation', () => {
		it('should calculate confidence based on type compatibility', () => {
			const sourceNodeType = (0, jest_mock_extended_1.mock)({
				group: ['transform'],
			});
			const targetNodeType = (0, jest_mock_extended_1.mock)({
				group: ['transform'],
			});
			const targetProperty = { type: 'string', name: 'email' };
			const confidence = aiHelpersService.calculateMappingConfidence(
				sourceNodeType,
				targetNodeType,
				'email',
				targetProperty,
			);
			expect(confidence).toBeGreaterThan(0.5);
			expect(confidence).toBeLessThanOrEqual(1.0);
		});
	});
	describe('data processing node detection', () => {
		it('should identify data processing nodes correctly', () => {
			const dataProcessingNodeType = (0, jest_mock_extended_1.mock)({
				group: ['transform'],
			});
			const isDataProcessing = aiHelpersService.isDataProcessingNode(dataProcessingNodeType);
			expect(isDataProcessing).toBe(true);
		});
		it('should identify non-data processing nodes correctly', () => {
			const triggerNodeType = (0, jest_mock_extended_1.mock)({
				group: ['trigger'],
			});
			const isDataProcessing = aiHelpersService.isDataProcessingNode(triggerNodeType);
			expect(isDataProcessing).toBe(false);
		});
	});
});
//# sourceMappingURL=ai-helpers.service.test.js.map
