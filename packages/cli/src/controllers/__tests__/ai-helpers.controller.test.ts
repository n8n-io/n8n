import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import { AiHelpersController } from '@/controllers/ai-helpers.controller';
import { AiHelpersService } from '@/services/ai-helpers.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

describe('AiHelpersController', () => {
	const logger = mockInstance(Logger);
	const aiHelpersService = mockInstance(AiHelpersService);
	let controller: AiHelpersController;

	const mockUser = {
		id: '123',
		email: 'test@example.com',
	};

	const mockResponse = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AiHelpersController(logger, aiHelpersService);
	});

	describe('suggestNodes', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, any>>({
			user: mockUser,
			body: {
				workflowData: {
					nodes: [{ id: 'node1', type: 'Set', parameters: {} }],
					connections: {},
				},
				currentNodeId: 'node1',
				contextType: 'next_node',
			},
		});

		it('should return node suggestions successfully', async () => {
			const mockSuggestions = [
				{
					nodeType: 'If',
					displayName: 'If',
					description: 'Conditional logic',
					category: 'utility',
					confidence: 0.9,
					reasoning: 'Commonly used after Set nodes',
				},
			];

			aiHelpersService.suggestNodes.mockResolvedValue(mockSuggestions);

			const result = await controller.suggestNodes(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				suggestions: mockSuggestions,
				metadata: {
					contextType: 'next_node',
					currentNodeId: 'node1',
					suggestedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.suggestNodes).toHaveBeenCalledWith(
				validRequest.body.workflowData,
				mockUser,
				{
					currentNodeId: 'node1',
					contextType: 'next_node',
				},
			);
		});

		it('should throw BadRequestError when workflow data is missing', async () => {
			const invalidRequest = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {},
			});

			await expect(controller.suggestNodes(invalidRequest, mockResponse)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should handle service errors gracefully', async () => {
			aiHelpersService.suggestNodes.mockRejectedValue(new Error('Service error'));

			await expect(controller.suggestNodes(validRequest, mockResponse)).rejects.toThrow(
				InternalServerError,
			);

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to generate node suggestions',
				expect.objectContaining({
					userId: mockUser.id,
					error: 'Service error',
				}),
			);
		});

		it('should use default contextType when not provided', async () => {
			const requestWithoutContext = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					workflowData: {
						nodes: [{ id: 'node1', type: 'Set', parameters: {} }],
						connections: {},
					},
				},
			});

			aiHelpersService.suggestNodes.mockResolvedValue([]);

			await controller.suggestNodes(requestWithoutContext, mockResponse);

			expect(aiHelpersService.suggestNodes).toHaveBeenCalledWith(expect.any(Object), mockUser, {
				currentNodeId: undefined,
				contextType: 'general',
			});
		});
	});

	describe('mapParameters', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, any>>({
			user: mockUser,
			body: {
				sourceNodeId: 'source',
				targetNodeId: 'target',
				workflowData: {
					nodes: [
						{ id: 'source', type: 'Set', parameters: { email: 'test@example.com' } },
						{ id: 'target', type: 'HTTP Request', parameters: {} },
					],
					connections: {},
				},
			},
		});

		it('should return parameter mappings successfully', async () => {
			const mockMapping = {
				mappings: [
					{
						targetParameter: 'email',
						sourceExpression: '{{ $json.email }}',
						sourceDescription: 'Map from source.email',
						confidence: 0.9,
						mappingType: 'direct' as const,
					},
				],
				suggestions: ['Use expressions to transform data'],
			};

			aiHelpersService.mapParameters.mockResolvedValue(mockMapping);

			const result = await controller.mapParameters(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				mapping: mockMapping,
				metadata: {
					sourceNodeId: 'source',
					targetNodeId: 'target',
					mappedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.mapParameters).toHaveBeenCalledWith(
				'source',
				'target',
				validRequest.body.workflowData,
				mockUser,
			);
		});

		it('should throw BadRequestError when required parameters are missing', async () => {
			const invalidRequest = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					sourceNodeId: 'source',
					// missing targetNodeId
					workflowData: { nodes: [], connections: {} },
				},
			});

			await expect(controller.mapParameters(invalidRequest, mockResponse)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should handle service errors gracefully', async () => {
			aiHelpersService.mapParameters.mockRejectedValue(new Error('Mapping failed'));

			await expect(controller.mapParameters(validRequest, mockResponse)).rejects.toThrow(
				InternalServerError,
			);

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to generate parameter mapping',
				expect.objectContaining({
					userId: mockUser.id,
					sourceNodeId: 'source',
					targetNodeId: 'target',
					error: 'Mapping failed',
				}),
			);
		});
	});

	describe('workflowAssistance', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, any>>({
			user: mockUser,
			body: {
				workflowData: {
					nodes: [{ id: 'node1', type: 'HTTP Request', parameters: {} }],
					connections: {},
				},
				query: 'How do I handle errors in my workflow?',
				context: {
					selectedNodeId: 'node1',
					lastAction: 'added_node',
				},
			},
		});

		it('should provide workflow assistance successfully', async () => {
			const mockAssistance = [
				{
					type: 'suggestion' as const,
					title: 'Add Error Handling',
					description: 'Add an If node to check for errors',
					actionable: true,
					priority: 'high' as const,
				},
			];

			aiHelpersService.provideWorkflowAssistance.mockResolvedValue(mockAssistance);

			const result = await controller.workflowAssistance(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				assistance: mockAssistance,
				metadata: {
					query: 'How do I handle errors in my workflow?',
					context: validRequest.body.context,
					assistedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.provideWorkflowAssistance).toHaveBeenCalledWith(
				validRequest.body.workflowData,
				validRequest.body.query,
				mockUser,
				validRequest.body.context,
			);
		});

		it('should throw BadRequestError when query is missing', async () => {
			const invalidRequest = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					workflowData: { nodes: [], connections: {} },
					// missing query
				},
			});

			await expect(controller.workflowAssistance(invalidRequest, mockResponse)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should truncate long queries in logs', async () => {
			const longQuery = 'a'.repeat(200);
			const requestWithLongQuery = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					workflowData: { nodes: [], connections: {} },
					query: longQuery,
				},
			});

			aiHelpersService.provideWorkflowAssistance.mockResolvedValue([]);

			await controller.workflowAssistance(requestWithLongQuery, mockResponse);

			expect(logger.debug).toHaveBeenCalledWith(
				'AI workflow assistance requested',
				expect.objectContaining({
					query: longQuery.substring(0, 100),
				}),
			);
		});
	});

	describe('getNodeRecommendations', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, {}, any>>({
			user: mockUser,
			query: {
				category: 'transform',
				useCase: 'data processing',
				difficulty: 'beginner',
				limit: '5',
			},
		});

		it('should return node recommendations successfully', async () => {
			const mockRecommendations = [
				{
					nodeType: 'Set',
					displayName: 'Set',
					description: 'Set node values',
					category: 'transform',
					useCase: 'data processing',
					difficulty: 'beginner' as const,
					popularity: 95,
					tags: ['utility', 'transform'],
				},
			];

			aiHelpersService.getNodeRecommendations.mockResolvedValue(mockRecommendations);

			const result = await controller.getNodeRecommendations(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				recommendations: mockRecommendations,
				metadata: {
					category: 'transform',
					useCase: 'data processing',
					difficulty: 'beginner',
					limit: 5,
					recommendedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.getNodeRecommendations).toHaveBeenCalledWith(mockUser, {
				category: 'transform',
				useCase: 'data processing',
				difficulty: 'beginner',
				limit: 5,
			});
		});

		it('should use default values when query parameters are missing', async () => {
			const requestWithoutQuery = mock<AuthenticatedRequest<{}, {}, {}, any>>({
				user: mockUser,
				query: {},
			});

			aiHelpersService.getNodeRecommendations.mockResolvedValue([]);

			await controller.getNodeRecommendations(requestWithoutQuery, mockResponse);

			expect(aiHelpersService.getNodeRecommendations).toHaveBeenCalledWith(mockUser, {
				category: undefined,
				useCase: undefined,
				difficulty: 'beginner',
				limit: 10,
			});
		});
	});

	describe('optimizeWorkflow', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, any>>({
			user: mockUser,
			body: {
				workflowData: {
					nodes: [{ id: 'node1', type: 'Set', parameters: {} }],
					connections: {},
				},
				optimizationType: 'performance',
			},
		});

		it('should return workflow optimization successfully', async () => {
			const mockOptimization = {
				optimizations: [
					{
						type: 'performance' as const,
						title: 'Optimize HTTP Requests',
						description: 'Batch HTTP requests for better performance',
						impact: 'high' as const,
						effort: 'medium' as const,
						changes: [],
					},
				],
				estimatedImprovement: {
					performance: 25,
					maintainability: 15,
					reliability: 10,
				},
			};

			aiHelpersService.optimizeWorkflow.mockResolvedValue(mockOptimization);

			const result = await controller.optimizeWorkflow(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				optimization: mockOptimization,
				metadata: {
					originalNodeCount: 1,
					optimizationType: 'performance',
					optimizedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.optimizeWorkflow).toHaveBeenCalledWith(
				validRequest.body.workflowData,
				mockUser,
				{
					optimizationType: 'performance',
				},
			);
		});

		it('should use default optimization type when not provided', async () => {
			const requestWithoutOptimizationType = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					workflowData: { nodes: [], connections: {} },
				},
			});

			aiHelpersService.optimizeWorkflow.mockResolvedValue({
				optimizations: [],
				estimatedImprovement: { performance: 0, maintainability: 0, reliability: 0 },
			});

			await controller.optimizeWorkflow(requestWithoutOptimizationType, mockResponse);

			expect(aiHelpersService.optimizeWorkflow).toHaveBeenCalledWith(expect.any(Object), mockUser, {
				optimizationType: 'all',
			});
		});
	});

	describe('explainWorkflow', () => {
		const validRequest = mock<AuthenticatedRequest<{}, {}, any>>({
			user: mockUser,
			body: {
				workflowData: {
					nodes: [{ id: 'node1', type: 'Set', parameters: {} }],
					connections: {},
				},
				explanationType: 'detailed',
				focusNodeId: 'node1',
			},
		});

		it('should return workflow explanation successfully', async () => {
			const mockExplanation = {
				overview: 'This workflow processes data using a Set node',
				flow: [
					{
						nodeId: 'node1',
						nodeName: 'Set Values',
						purpose: 'Sets node values',
					},
				],
				complexity: 'simple' as const,
				executionTime: 'Less than 5 seconds',
				commonPatterns: ['data transformation'],
			};

			aiHelpersService.explainWorkflow.mockResolvedValue(mockExplanation);

			const result = await controller.explainWorkflow(validRequest, mockResponse);

			expect(result).toMatchObject({
				success: true,
				explanation: mockExplanation,
				metadata: {
					nodeCount: 1,
					explanationType: 'detailed',
					focusNodeId: 'node1',
					explainedAt: expect.any(String),
				},
			});

			expect(aiHelpersService.explainWorkflow).toHaveBeenCalledWith(
				validRequest.body.workflowData,
				mockUser,
				{
					explanationType: 'detailed',
					focusNodeId: 'node1',
				},
			);
		});

		it('should use default explanation type when not provided', async () => {
			const requestWithoutExplanationType = mock<AuthenticatedRequest<{}, {}, any>>({
				user: mockUser,
				body: {
					workflowData: { nodes: [], connections: {} },
				},
			});

			aiHelpersService.explainWorkflow.mockResolvedValue({
				overview: '',
				flow: [],
				complexity: 'simple',
				executionTime: '',
				commonPatterns: [],
			});

			await controller.explainWorkflow(requestWithoutExplanationType, mockResponse);

			expect(aiHelpersService.explainWorkflow).toHaveBeenCalledWith(expect.any(Object), mockUser, {
				explanationType: 'overview',
				focusNodeId: undefined,
			});
		});
	});
});
