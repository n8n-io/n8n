'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.AiHelpersController = void 0;
const decorators_1 = require('@n8n/decorators');
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const backend_common_1 = require('@n8n/backend-common');
const ai_helpers_service_1 = require('@/services/ai-helpers.service');
let AiHelpersController = class AiHelpersController {
	constructor(logger, aiHelpersService) {
		this.logger = logger;
		this.aiHelpersService = aiHelpersService;
	}
	async suggestNodes(req, _res) {
		const { workflowData, currentNodeId, contextType = 'general' } = req.body;
		if (!workflowData?.nodes) {
			throw new bad_request_error_1.BadRequestError('Workflow data with nodes is required');
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Node suggestion failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async mapParameters(req, _res) {
		const { sourceNodeId, targetNodeId, workflowData } = req.body;
		if (!sourceNodeId || !targetNodeId || !workflowData?.nodes) {
			throw new bad_request_error_1.BadRequestError(
				'sourceNodeId, targetNodeId, and workflow data are required',
			);
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Parameter mapping failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async workflowAssistance(req, _res) {
		const { workflowData, query, context } = req.body;
		if (!workflowData?.nodes || !query) {
			throw new bad_request_error_1.BadRequestError('Workflow data and query are required');
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow assistance failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getNodeRecommendations(req, _res) {
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Node recommendations failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async optimizeWorkflow(req, _res) {
		const { workflowData, optimizationType = 'all' } = req.body;
		if (!workflowData?.nodes) {
			throw new bad_request_error_1.BadRequestError('Workflow data with nodes is required');
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow optimization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async explainWorkflow(req, _res) {
		const { workflowData, explanationType = 'overview', focusNodeId } = req.body;
		if (!workflowData?.nodes) {
			throw new bad_request_error_1.BadRequestError('Workflow data with nodes is required');
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow explanation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
};
exports.AiHelpersController = AiHelpersController;
__decorate(
	[
		(0, decorators_1.Post)('/suggest-nodes'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'suggestNodes',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/map-parameters'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'mapParameters',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/workflow-assistance'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'workflowAssistance',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/node-recommendations'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'getNodeRecommendations',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/optimize-workflow'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'optimizeWorkflow',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/explain-workflow'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AiHelpersController.prototype,
	'explainWorkflow',
	null,
);
exports.AiHelpersController = AiHelpersController = __decorate(
	[
		(0, decorators_1.RestController)('/ai-helpers'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			ai_helpers_service_1.AiHelpersService,
		]),
	],
	AiHelpersController,
);
//# sourceMappingURL=ai-helpers.controller.js.map
