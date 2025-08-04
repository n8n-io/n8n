import { Post, RestController, Get } from '@n8n/decorators';
import { AuthenticatedRequest } from '@n8n/db';
import { ApplicationError } from 'n8n-workflow';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { Logger } from '@n8n/backend-common';
import { AiHelpersService } from '@/services/ai-helpers.service';

interface NodeSuggestionRequest {
	workflowData: {
		nodes: any[];
		connections: any;
	};
	currentNodeId?: string;
	contextType?: 'next_node' | 'previous_node' | 'general';
}

interface ParameterMappingRequest {
	sourceNodeId: string;
	targetNodeId: string;
	workflowData: {
		nodes: any[];
		connections: any;
	};
}

interface WorkflowAssistanceRequest {
	workflowData: {
		nodes: any[];
		connections: any;
	};
	query: string;
	context?: {
		selectedNodeId?: string;
		lastAction?: string;
	};
}

@RestController('/ai-helpers')
export class AiHelpersController {
	constructor(
		private readonly logger: Logger,
		private readonly aiHelpersService: AiHelpersService,
	) {}

	@Post('/suggest-nodes')
	async suggestNodes(req: AuthenticatedRequest<{}, {}, NodeSuggestionRequest>, _res: Response) {
		const { workflowData, currentNodeId, contextType = 'general' } = req.body;

		if (!workflowData?.nodes) {
			throw new BadRequestError('Workflow data with nodes is required');
		}

		this.logger.debug('AI node suggestions requested', {
			userId: req.user.id,
			nodeCount: workflowData.nodes.length,
			currentNodeId,
			contextType,
		});

		try {
			const suggestions = await this.aiHelpersService.suggestNodes(workflowData, req.user, {
				currentNodeId,
				contextType,
			});

			return {
				success: true,
				suggestions,
				metadata: {
					contextType,
					currentNodeId,
					suggestedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to generate node suggestions', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Node suggestion failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/map-parameters')
	async mapParameters(req: AuthenticatedRequest<{}, {}, ParameterMappingRequest>, _res: Response) {
		const { sourceNodeId, targetNodeId, workflowData } = req.body;

		if (!sourceNodeId || !targetNodeId || !workflowData?.nodes) {
			throw new BadRequestError('sourceNodeId, targetNodeId, and workflow data are required');
		}

		this.logger.debug('AI parameter mapping requested', {
			userId: req.user.id,
			sourceNodeId,
			targetNodeId,
		});

		try {
			const mapping = await this.aiHelpersService.mapParameters(
				sourceNodeId,
				targetNodeId,
				workflowData,
				req.user,
			);

			return {
				success: true,
				mapping,
				metadata: {
					sourceNodeId,
					targetNodeId,
					mappedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to generate parameter mapping', {
				userId: req.user.id,
				sourceNodeId,
				targetNodeId,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Parameter mapping failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/workflow-assistance')
	async workflowAssistance(
		req: AuthenticatedRequest<{}, {}, WorkflowAssistanceRequest>,
		_res: Response,
	) {
		const { workflowData, query, context } = req.body;

		if (!workflowData?.nodes || !query) {
			throw new BadRequestError('Workflow data and query are required');
		}

		this.logger.debug('AI workflow assistance requested', {
			userId: req.user.id,
			query: query.substring(0, 100),
			nodeCount: workflowData.nodes.length,
			context: context?.selectedNodeId,
		});

		try {
			const assistance = await this.aiHelpersService.provideWorkflowAssistance(
				workflowData,
				query,
				req.user,
				context,
			);

			return {
				success: true,
				assistance,
				metadata: {
					query: query.substring(0, 100),
					context,
					assistedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to provide workflow assistance', {
				userId: req.user.id,
				query: query.substring(0, 100),
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow assistance failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/node-recommendations')
	async getNodeRecommendations(
		req: AuthenticatedRequest<
			{},
			{},
			{},
			{
				category?: string;
				useCase?: string;
				difficulty?: 'beginner' | 'intermediate' | 'advanced';
				limit?: string;
			}
		>,
		_res: Response,
	) {
		const { category, useCase, difficulty = 'beginner', limit = '10' } = req.query;

		this.logger.debug('AI node recommendations requested', {
			userId: req.user.id,
			category,
			useCase,
			difficulty,
			limit,
		});

		try {
			const recommendations = await this.aiHelpersService.getNodeRecommendations(req.user, {
				category,
				useCase,
				difficulty,
				limit: parseInt(limit, 10),
			});

			return {
				success: true,
				recommendations,
				metadata: {
					category,
					useCase,
					difficulty,
					limit: parseInt(limit, 10),
					recommendedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to get node recommendations', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Node recommendations failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/optimize-workflow')
	async optimizeWorkflow(
		req: AuthenticatedRequest<
			{},
			{},
			{
				workflowData: {
					nodes: any[];
					connections: any;
				};
				optimizationType?: 'performance' | 'readability' | 'structure' | 'all';
			}
		>,
		_res: Response,
	) {
		const { workflowData, optimizationType = 'all' } = req.body;

		if (!workflowData?.nodes) {
			throw new BadRequestError('Workflow data with nodes is required');
		}

		this.logger.debug('AI workflow optimization requested', {
			userId: req.user.id,
			nodeCount: workflowData.nodes.length,
			optimizationType,
		});

		try {
			const optimization = await this.aiHelpersService.optimizeWorkflow(workflowData, req.user, {
				optimizationType,
			});

			return {
				success: true,
				optimization,
				metadata: {
					originalNodeCount: workflowData.nodes.length,
					optimizationType,
					optimizedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to optimize workflow', {
				userId: req.user.id,
				optimizationType,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow optimization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/explain-workflow')
	async explainWorkflow(
		req: AuthenticatedRequest<
			{},
			{},
			{
				workflowData: {
					nodes: any[];
					connections: any;
				};
				explanationType?: 'overview' | 'detailed' | 'technical';
				focusNodeId?: string;
			}
		>,
		_res: Response,
	) {
		const { workflowData, explanationType = 'overview', focusNodeId } = req.body;

		if (!workflowData?.nodes) {
			throw new BadRequestError('Workflow data with nodes is required');
		}

		this.logger.debug('AI workflow explanation requested', {
			userId: req.user.id,
			nodeCount: workflowData.nodes.length,
			explanationType,
			focusNodeId,
		});

		try {
			const explanation = await this.aiHelpersService.explainWorkflow(workflowData, req.user, {
				explanationType,
				focusNodeId,
			});

			return {
				success: true,
				explanation,
				metadata: {
					nodeCount: workflowData.nodes.length,
					explanationType,
					focusNodeId,
					explainedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to explain workflow', {
				userId: req.user.id,
				explanationType,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow explanation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
