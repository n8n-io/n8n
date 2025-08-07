'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const ai_helpers_controller_1 = require('@/controllers/ai-helpers.controller');
const jest_mock_extended_1 = require('jest-mock-extended');
describe('AiHelpersController', () => {
	let controller;
	let aiHelpersService;
	let logger;
	let req;
	let res;
	let user;
	const mockWorkflowData = {
		nodes: [
			{ id: 'node1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
			{ id: 'node2', name: 'Set', type: 'n8n-nodes-base.set' },
		],
		connections: {},
	};
	beforeEach(() => {
		aiHelpersService = (0, jest_mock_extended_1.mock)();
		logger = (0, jest_mock_extended_1.mock)();
		controller = new ai_helpers_controller_1.AiHelpersController(logger, aiHelpersService);
		user = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
		req = {
			user,
			body: {},
			query: {},
		};
		res = (0, jest_mock_extended_1.mock)();
	});
	describe('suggestNodes', () => {
		beforeEach(() => {
			req.body = {
				workflowData: mockWorkflowData,
				currentNodeId: 'node1',
				contextType: 'next_node',
			};
		});
		it('should return node suggestions successfully', async () => {
			const mockSuggestions = [
				{
					nodeType: 'n8n-nodes-base.if',
					displayName: 'If',
					description: 'Conditional logic',
					category: 'logic',
					confidence: 0.9,
					reasoning: 'Commonly used after HTTP Request',
					connectionHint: {
						position: 'after',
						inputType: 'main',
						outputType: 'main',
					},
				},
			];
			aiHelpersService.suggestNodes.mockResolvedValue(mockSuggestions);
			const result = await controller.suggestNodes(req, res);
			expect(result).toEqual({
				success: true,
				suggestions: mockSuggestions,
				metadata: {
					contextType: 'next_node',
					currentNodeId: 'node1',
					suggestedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.suggestNodes).toHaveBeenCalledWith(mockWorkflowData, user, {
				currentNodeId: 'node1',
				contextType: 'next_node',
			});
		});
		it('should use default contextType when not provided', async () => {
			delete req.body.contextType;
			aiHelpersService.suggestNodes.mockResolvedValue([]);
			await controller.suggestNodes(req, res);
			expect(aiHelpersService.suggestNodes).toHaveBeenCalledWith(mockWorkflowData, user, {
				currentNodeId: 'node1',
				contextType: 'general',
			});
		});
		it('should throw BadRequestError when workflow data is missing', async () => {
			req.body = {};
			await expect(controller.suggestNodes(req, res)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should throw BadRequestError when nodes array is missing', async () => {
			req.body = { workflowData: {} };
			await expect(controller.suggestNodes(req, res)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should handle service errors and throw InternalServerError', async () => {
			const serviceError = new Error('Service unavailable');
			aiHelpersService.suggestNodes.mockRejectedValue(serviceError);
			await expect(controller.suggestNodes(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to generate node suggestions',
				expect.objectContaining({
					userId: user.id,
					error: serviceError.message,
				}),
			);
		});
	});
	describe('mapParameters', () => {
		beforeEach(() => {
			req.body = {
				sourceNodeId: 'node1',
				targetNodeId: 'node2',
				workflowData: mockWorkflowData,
			};
		});
		it('should return parameter mappings successfully', async () => {
			const mockMapping = {
				mappings: [
					{
						targetParameter: 'value',
						sourceExpression: '{{ $json.data }}',
						sourceDescription: 'Map from HTTP Request.data',
						confidence: 0.8,
						mappingType: 'direct',
					},
				],
				suggestions: ['Consider using expressions to transform data'],
			};
			aiHelpersService.mapParameters.mockResolvedValue(mockMapping);
			const result = await controller.mapParameters(req, res);
			expect(result).toEqual({
				success: true,
				mapping: mockMapping,
				metadata: {
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					mappedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.mapParameters).toHaveBeenCalledWith(
				'node1',
				'node2',
				mockWorkflowData,
				user,
			);
		});
		it('should throw BadRequestError when required parameters are missing', async () => {
			req.body = { sourceNodeId: 'node1' };
			await expect(controller.mapParameters(req, res)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should handle service errors', async () => {
			const serviceError = new Error('Mapping failed');
			aiHelpersService.mapParameters.mockRejectedValue(serviceError);
			await expect(controller.mapParameters(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('workflowAssistance', () => {
		beforeEach(() => {
			req.body = {
				workflowData: mockWorkflowData,
				query: 'How can I handle errors in my workflow?',
				context: {
					selectedNodeId: 'node1',
					lastAction: 'add_node',
				},
			};
		});
		it('should return workflow assistance successfully', async () => {
			const mockAssistance = [
				{
					type: 'fix',
					title: 'Add Error Handling',
					description: 'Consider adding error handling to prevent workflow failures',
					actionable: true,
					actions: [
						{
							type: 'add_node',
							nodeType: 'n8n-nodes-base.if',
							parameters: {
								conditions: {
									string: [{ value1: '={{ $json.error }}', operation: 'exists' }],
								},
							},
						},
					],
					priority: 'high',
				},
			];
			aiHelpersService.provideWorkflowAssistance.mockResolvedValue(mockAssistance);
			const result = await controller.workflowAssistance(req, res);
			expect(result).toEqual({
				success: true,
				assistance: mockAssistance,
				metadata: {
					query: req.body.query,
					context: req.body.context,
					assistedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.provideWorkflowAssistance).toHaveBeenCalledWith(
				mockWorkflowData,
				req.body.query,
				user,
				req.body.context,
			);
		});
		it('should throw BadRequestError when query is missing', async () => {
			req.body = { workflowData: mockWorkflowData };
			await expect(controller.workflowAssistance(req, res)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should handle service errors', async () => {
			const serviceError = new Error('Assistance failed');
			aiHelpersService.provideWorkflowAssistance.mockRejectedValue(serviceError);
			await expect(controller.workflowAssistance(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('getNodeRecommendations', () => {
		beforeEach(() => {
			req.query = {
				category: 'data',
				useCase: 'transformation',
				difficulty: 'beginner',
				limit: '5',
			};
		});
		it('should return node recommendations successfully', async () => {
			const mockRecommendations = [
				{
					nodeType: 'n8n-nodes-base.set',
					displayName: 'Set',
					description: 'Set node values',
					category: 'data',
					useCase: 'data transformation',
					difficulty: 'beginner',
					popularity: 95,
					tags: ['data', 'utility'],
				},
			];
			aiHelpersService.getNodeRecommendations.mockResolvedValue(mockRecommendations);
			const result = await controller.getNodeRecommendations(req, res);
			expect(result).toEqual({
				success: true,
				recommendations: mockRecommendations,
				metadata: {
					category: 'data',
					useCase: 'transformation',
					difficulty: 'beginner',
					limit: 5,
					recommendedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.getNodeRecommendations).toHaveBeenCalledWith(user, {
				category: 'data',
				useCase: 'transformation',
				difficulty: 'beginner',
				limit: 5,
			});
		});
		it('should use default values when query parameters are not provided', async () => {
			req.query = {};
			aiHelpersService.getNodeRecommendations.mockResolvedValue([]);
			const result = await controller.getNodeRecommendations(req, res);
			expect(result.metadata).toMatchObject({
				difficulty: 'beginner',
				limit: 10,
			});
		});
		it('should handle service errors', async () => {
			const serviceError = new Error('Recommendations failed');
			aiHelpersService.getNodeRecommendations.mockRejectedValue(serviceError);
			await expect(controller.getNodeRecommendations(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('optimizeWorkflow', () => {
		beforeEach(() => {
			req.body = {
				workflowData: mockWorkflowData,
				optimizationType: 'performance',
			};
		});
		it('should return workflow optimization successfully', async () => {
			const mockOptimization = {
				optimizations: [
					{
						type: 'performance',
						title: 'Reduce HTTP Calls',
						description: 'Combine multiple HTTP requests',
						impact: 'high',
						effort: 'medium',
						changes: [
							{
								nodeId: 'node1',
								changeType: 'modify',
								description: 'Add batch processing',
								parameters: { batch: true },
							},
						],
					},
				],
				estimatedImprovement: {
					performance: 25,
					maintainability: 10,
					reliability: 15,
				},
			};
			aiHelpersService.optimizeWorkflow.mockResolvedValue(mockOptimization);
			const result = await controller.optimizeWorkflow(req, res);
			expect(result).toEqual({
				success: true,
				optimization: mockOptimization,
				metadata: {
					originalNodeCount: 2,
					optimizationType: 'performance',
					optimizedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.optimizeWorkflow).toHaveBeenCalledWith(mockWorkflowData, user, {
				optimizationType: 'performance',
			});
		});
		it('should use default optimization type when not provided', async () => {
			delete req.body.optimizationType;
			aiHelpersService.optimizeWorkflow.mockResolvedValue({
				optimizations: [],
				estimatedImprovement: { performance: 0, maintainability: 0, reliability: 0 },
			});
			await controller.optimizeWorkflow(req, res);
			expect(aiHelpersService.optimizeWorkflow).toHaveBeenCalledWith(mockWorkflowData, user, {
				optimizationType: 'all',
			});
		});
		it('should handle service errors', async () => {
			const serviceError = new Error('Optimization failed');
			aiHelpersService.optimizeWorkflow.mockRejectedValue(serviceError);
			await expect(controller.optimizeWorkflow(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('explainWorkflow', () => {
		beforeEach(() => {
			req.body = {
				workflowData: mockWorkflowData,
				explanationType: 'detailed',
				focusNodeId: 'node1',
			};
		});
		it('should return workflow explanation successfully', async () => {
			const mockExplanation = {
				overview: 'This workflow processes HTTP requests and sets data',
				flow: [
					{
						nodeId: 'node1',
						nodeName: 'HTTP Request',
						purpose: 'Fetches data from API',
						inputDescription: 'Receives trigger data',
						outputDescription: 'Returns API response',
						keyParameters: [
							{
								name: 'url',
								value: 'https://api.example.com',
								explanation: 'API endpoint URL',
							},
						],
					},
				],
				complexity: 'simple',
				executionTime: 'Less than 5 seconds',
				commonPatterns: ['API integration pattern'],
				potentialIssues: ['No error handling detected'],
			};
			aiHelpersService.explainWorkflow.mockResolvedValue(mockExplanation);
			const result = await controller.explainWorkflow(req, res);
			expect(result).toEqual({
				success: true,
				explanation: mockExplanation,
				metadata: {
					nodeCount: 2,
					explanationType: 'detailed',
					focusNodeId: 'node1',
					explainedAt: expect.any(String),
				},
			});
			expect(aiHelpersService.explainWorkflow).toHaveBeenCalledWith(mockWorkflowData, user, {
				explanationType: 'detailed',
				focusNodeId: 'node1',
			});
		});
		it('should use default explanation type when not provided', async () => {
			delete req.body.explanationType;
			aiHelpersService.explainWorkflow.mockResolvedValue({
				overview: '',
				flow: [],
				complexity: 'simple',
				executionTime: '',
				commonPatterns: [],
			});
			await controller.explainWorkflow(req, res);
			expect(aiHelpersService.explainWorkflow).toHaveBeenCalledWith(mockWorkflowData, user, {
				explanationType: 'overview',
			});
		});
		it('should handle service errors', async () => {
			const serviceError = new Error('Explanation failed');
			aiHelpersService.explainWorkflow.mockRejectedValue(serviceError);
			await expect(controller.explainWorkflow(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
});
//# sourceMappingURL=ai-helpers.controller.test.js.map
