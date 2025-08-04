import request from 'supertest';
import express from 'express';
import { AiHelpersController } from '@/controllers/ai-helpers.controller';
import { AiHelpersService } from '@/services/ai-helpers.service';
import { NodeTypes } from '@/node-types';
import { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

// Mock the AI workflow builder module
jest.mock('@n8n/ai-workflow-builder', () => ({
	AiWorkflowBuilderService: jest.fn().mockImplementation(() => ({
		suggestNodes: jest.fn().mockResolvedValue([
			{
				nodeType: 'n8n-nodes-base.if',
				displayName: 'If',
				description: 'AI suggested conditional logic',
				category: 'logic',
				confidence: 0.95,
				reasoning: 'AI analysis suggests conditional logic after HTTP Request',
			},
		]),
		mapParameters: jest.fn().mockResolvedValue({
			mappings: [
				{
					targetParameter: 'value',
					sourceExpression: '{{ $json.aiSuggestedField }}',
					sourceDescription: 'AI suggested mapping',
					confidence: 0.9,
					mappingType: 'direct',
				},
			],
			suggestions: ['AI suggests using expressions for data transformation'],
		}),
		provideAssistance: jest.fn().mockResolvedValue([
			{
				type: 'suggestion',
				title: 'AI Workflow Optimization',
				description: 'AI analysis suggests workflow improvements',
				actionable: true,
				priority: 'medium',
			},
		]),
	})),
}));

describe('AI Helpers Integration Tests', () => {
	let app: express.Application;
	let logger: jest.Mocked<Logger>;
	let nodeTypes: jest.Mocked<NodeTypes>;
	let aiHelpersService: AiHelpersService;
	let controller: AiHelpersController;

	const mockUser: IUser = {
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
	} as IUser;

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
			defaults: { name: 'HTTP Request' },
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
			defaults: { name: 'Set' },
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
			defaults: { name: 'If' },
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

		aiHelpersService = new AiHelpersService(logger, nodeTypes);
		controller = new AiHelpersController(logger, aiHelpersService);

		app = express();
		app.use(express.json());

		// Mock authentication middleware
		app.use((req: any, res, next) => {
			req.user = mockUser;
			next();
		});

		// Register routes
		app.post('/ai-helpers/suggest-nodes', async (req, res) => {
			try {
				const result = await controller.suggestNodes(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});

		app.post('/ai-helpers/map-parameters', async (req, res) => {
			try {
				const result = await controller.mapParameters(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});

		app.post('/ai-helpers/workflow-assistance', async (req, res) => {
			try {
				const result = await controller.workflowAssistance(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});

		app.get('/ai-helpers/node-recommendations', async (req, res) => {
			try {
				const result = await controller.getNodeRecommendations(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});

		app.post('/ai-helpers/optimize-workflow', async (req, res) => {
			try {
				const result = await controller.optimizeWorkflow(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});

		app.post('/ai-helpers/explain-workflow', async (req, res) => {
			try {
				const result = await controller.explainWorkflow(req as any, res);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});
	});

	describe('POST /ai-helpers/suggest-nodes', () => {
		it('should return node suggestions successfully', async () => {
			const response = await request(app)
				.post('/ai-helpers/suggest-nodes')
				.send({
					workflowData: mockWorkflowData,
					currentNodeId: 'node1',
					contextType: 'next_node',
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				suggestions: expect.any(Array),
				metadata: {
					contextType: 'next_node',
					currentNodeId: 'node1',
					suggestedAt: expect.any(String),
				},
			});

			expect(response.body.suggestions.length).toBeGreaterThan(0);
			expect(response.body.suggestions[0]).toHaveProperty('nodeType');
			expect(response.body.suggestions[0]).toHaveProperty('displayName');
			expect(response.body.suggestions[0]).toHaveProperty('confidence');
		});

		it('should return 500 for invalid workflow data', async () => {
			const response = await request(app)
				.post('/ai-helpers/suggest-nodes')
				.send({
					workflowData: {},
				})
				.expect(500);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('POST /ai-helpers/map-parameters', () => {
		it('should return parameter mappings successfully', async () => {
			const response = await request(app)
				.post('/ai-helpers/map-parameters')
				.send({
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					workflowData: mockWorkflowData,
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				mapping: {
					mappings: expect.any(Array),
					suggestions: expect.any(Array),
				},
				metadata: {
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					mappedAt: expect.any(String),
				},
			});
		});

		it('should return 500 for missing required parameters', async () => {
			const response = await request(app)
				.post('/ai-helpers/map-parameters')
				.send({
					sourceNodeId: 'node1',
				})
				.expect(500);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('POST /ai-helpers/workflow-assistance', () => {
		it('should return workflow assistance successfully', async () => {
			const response = await request(app)
				.post('/ai-helpers/workflow-assistance')
				.send({
					workflowData: mockWorkflowData,
					query: 'How can I improve my workflow?',
					context: {
						selectedNodeId: 'node1',
					},
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				assistance: expect.any(Array),
				metadata: {
					query: 'How can I improve my workflow?',
					context: {
						selectedNodeId: 'node1',
					},
					assistedAt: expect.any(String),
				},
			});
		});

		it('should handle error queries correctly', async () => {
			const response = await request(app)
				.post('/ai-helpers/workflow-assistance')
				.send({
					workflowData: mockWorkflowData,
					query: 'My workflow has errors',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.assistance).toHaveLength(1);
			expect(response.body.assistance[0].type).toBe('fix');
		});
	});

	describe('GET /ai-helpers/node-recommendations', () => {
		it('should return node recommendations successfully', async () => {
			const response = await request(app)
				.get('/ai-helpers/node-recommendations')
				.query({
					category: 'transform',
					difficulty: 'beginner',
					limit: '5',
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				recommendations: expect.any(Array),
				metadata: {
					category: 'transform',
					difficulty: 'beginner',
					limit: 5,
					recommendedAt: expect.any(String),
				},
			});

			expect(response.body.recommendations.length).toBeLessThanOrEqual(5);
		});

		it('should use default values for missing query parameters', async () => {
			const response = await request(app).get('/ai-helpers/node-recommendations').expect(200);

			expect(response.body.metadata).toMatchObject({
				difficulty: 'beginner',
				limit: 10,
			});
		});
	});

	describe('POST /ai-helpers/optimize-workflow', () => {
		it('should return workflow optimization successfully', async () => {
			const response = await request(app)
				.post('/ai-helpers/optimize-workflow')
				.send({
					workflowData: mockWorkflowData,
					optimizationType: 'performance',
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				optimization: {
					optimizations: expect.any(Array),
					estimatedImprovement: {
						performance: expect.any(Number),
						maintainability: expect.any(Number),
						reliability: expect.any(Number),
					},
				},
				metadata: {
					originalNodeCount: 2,
					optimizationType: 'performance',
					optimizedAt: expect.any(String),
				},
			});
		});

		it('should suggest error handling optimization', async () => {
			const response = await request(app)
				.post('/ai-helpers/optimize-workflow')
				.send({
					workflowData: mockWorkflowData,
				})
				.expect(200);

			const errorHandlingOptimization = response.body.optimization.optimizations.find(
				(opt: any) => opt.type === 'error_handling',
			);
			expect(errorHandlingOptimization).toBeDefined();
			expect(errorHandlingOptimization.title).toBe('Add Error Handling');
		});
	});

	describe('POST /ai-helpers/explain-workflow', () => {
		it('should return workflow explanation successfully', async () => {
			const response = await request(app)
				.post('/ai-helpers/explain-workflow')
				.send({
					workflowData: mockWorkflowData,
					explanationType: 'detailed',
					focusNodeId: 'node1',
				})
				.expect(200);

			expect(response.body).toMatchObject({
				success: true,
				explanation: {
					overview: expect.any(String),
					flow: expect.any(Array),
					complexity: expect.any(String),
					executionTime: expect.any(String),
					commonPatterns: expect.any(Array),
				},
				metadata: {
					nodeCount: 2,
					explanationType: 'detailed',
					focusNodeId: 'node1',
					explainedAt: expect.any(String),
				},
			});

			expect(response.body.explanation.flow).toHaveLength(1);
			expect(response.body.explanation.flow[0].nodeId).toBe('node1');
		});

		it('should provide overview explanation by default', async () => {
			const response = await request(app)
				.post('/ai-helpers/explain-workflow')
				.send({
					workflowData: mockWorkflowData,
				})
				.expect(200);

			expect(response.body.metadata.explanationType).toBe('overview');
			expect(response.body.explanation.flow).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle service errors gracefully', async () => {
			// Mock service to throw error
			const errorService = new AiHelpersService(logger, nodeTypes);
			jest.spyOn(errorService, 'suggestNodes').mockRejectedValue(new Error('Service error'));

			const errorController = new AiHelpersController(logger, errorService);

			app.post('/ai-helpers/suggest-nodes-error', async (req, res) => {
				try {
					await errorController.suggestNodes(req as any, res);
				} catch (error) {
					res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
				}
			});

			const response = await request(app)
				.post('/ai-helpers/suggest-nodes-error')
				.send({
					workflowData: mockWorkflowData,
				})
				.expect(500);

			expect(response.body.error).toContain('Node suggestion failed');
		});

		it('should validate required fields', async () => {
			const response = await request(app)
				.post('/ai-helpers/map-parameters')
				.send({
					sourceNodeId: 'node1',
					// Missing targetNodeId and workflowData
				})
				.expect(500);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('AI Integration Fallback', () => {
		it('should fall back to rule-based suggestions when AI fails', async () => {
			// The service should gracefully handle AI failures and provide rule-based fallbacks
			const response = await request(app)
				.post('/ai-helpers/suggest-nodes')
				.send({
					workflowData: mockWorkflowData,
					contextType: 'general',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.suggestions).toHaveLength(4); // Rule-based fallback provides popular nodes
		});

		it('should provide rule-based parameter mapping when AI unavailable', async () => {
			const response = await request(app)
				.post('/ai-helpers/map-parameters')
				.send({
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					workflowData: mockWorkflowData,
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.mapping.suggestions).toContain(
				'Consider using expressions to transform data between nodes',
			);
		});
	});
});
