'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowsController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const axios_1 = __importDefault(require('axios'));
const express_1 = __importDefault(require('express'));
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const generic_helpers_1 = require('@/generic-helpers');
const license_1 = require('@/license');
const middlewares_1 = require('@/middlewares');
const node_types_1 = require('@/node-types');
const ResponseHelper = __importStar(require('@/response-helper'));
const folder_service_1 = require('@/services/folder.service');
const naming_service_1 = require('@/services/naming.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const tag_service_1 = require('@/services/tag.service');
const email_1 = require('@/user-management/email');
const utils = __importStar(require('@/utils'));
const WorkflowHelpers = __importStar(require('@/workflow-helpers'));
const workflow_execution_service_1 = require('./workflow-execution.service');
const workflow_finder_service_1 = require('./workflow-finder.service');
const workflow_history_service_ee_1 = require('./workflow-history.ee/workflow-history.service.ee');
const workflow_service_1 = require('./workflow.service');
const workflow_service_ee_1 = require('./workflow.service.ee');
const credentials_service_1 = require('../credentials/credentials.service');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const batch_processing_service_1 = require('./batch-processing.service');
const workflow_search_service_1 = require('@/services/workflow-search.service');
const saved_search_service_1 = require('@/services/saved-search.service');
const expression_docs_service_1 = require('@/services/expression-docs.service');
const ai_helpers_service_1 = require('@/services/ai-helpers.service');
let WorkflowsController = class WorkflowsController {
	constructor(
		logger,
		externalHooks,
		tagRepository,
		enterpriseWorkflowService,
		workflowHistoryService,
		tagService,
		namingService,
		workflowRepository,
		workflowService,
		workflowExecutionService,
		sharedWorkflowRepository,
		license,
		mailer,
		credentialsService,
		projectRepository,
		projectService,
		projectRelationRepository,
		eventService,
		globalConfig,
		folderService,
		workflowFinderService,
		nodeTypes,
		activeWorkflowManager,
		batchProcessingService,
		workflowSearchService,
		savedSearchService,
		expressionDocsService,
		aiHelpersService,
	) {
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.tagRepository = tagRepository;
		this.enterpriseWorkflowService = enterpriseWorkflowService;
		this.workflowHistoryService = workflowHistoryService;
		this.tagService = tagService;
		this.namingService = namingService;
		this.workflowRepository = workflowRepository;
		this.workflowService = workflowService;
		this.workflowExecutionService = workflowExecutionService;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.license = license;
		this.mailer = mailer;
		this.credentialsService = credentialsService;
		this.projectRepository = projectRepository;
		this.projectService = projectService;
		this.projectRelationRepository = projectRelationRepository;
		this.eventService = eventService;
		this.globalConfig = globalConfig;
		this.folderService = folderService;
		this.workflowFinderService = workflowFinderService;
		this.nodeTypes = nodeTypes;
		this.activeWorkflowManager = activeWorkflowManager;
		this.batchProcessingService = batchProcessingService;
		this.workflowSearchService = workflowSearchService;
		this.savedSearchService = savedSearchService;
		this.expressionDocsService = expressionDocsService;
		this.aiHelpersService = aiHelpersService;
	}
	convertToExpressionFunctionDto(func) {
		return {
			...func,
			args: func.parameters,
			examples: func.examples?.map((ex) => ({
				example: ex.code,
				evaluated: ex.result,
				description: ex.description,
			})),
		};
	}
	convertToExpressionVariableDto(variable) {
		return {
			...variable,
			context: variable.category,
			examples: variable.examples?.map((ex) => ({
				example: ex.code,
				description: ex.description,
			})),
		};
	}
	convertToExpressionCategoryDto(category) {
		return {
			name: category.name,
			description:
				category.description ||
				`${category.name.charAt(0).toUpperCase() + category.name.slice(1)} functions`,
			functionCount: category.functionCount || 0,
		};
	}
	async create(req) {
		delete req.body.id;
		delete req.body.shared;
		const newWorkflow = new db_1.WorkflowEntity();
		Object.assign(newWorkflow, req.body);
		newWorkflow.versionId = (0, uuid_1.v4)();
		await (0, generic_helpers_1.validateEntity)(newWorkflow);
		await this.externalHooks.run('workflow.create', [newWorkflow]);
		const { tags: tagIds } = req.body;
		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}
		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);
		WorkflowHelpers.addNodeIds(newWorkflow);
		if (this.license.isSharingEnabled()) {
			const allCredentials = await this.credentialsService.getMany(req.user);
			try {
				this.enterpriseWorkflowService.validateCredentialPermissionsToUser(
					newWorkflow,
					allCredentials,
				);
			} catch (error) {
				throw new bad_request_error_1.BadRequestError(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			}
		}
		const { manager: dbManager } = this.projectRepository;
		let project;
		const savedWorkflow = await dbManager.transaction(async (transactionManager) => {
			const workflow = await transactionManager.save(newWorkflow);
			const { projectId, parentFolderId } = req.body;
			project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUser(req.user.id, transactionManager)
					: await this.projectService.getProjectWithScope(
							req.user,
							projectId,
							['workflow:create'],
							transactionManager,
						);
			if (typeof projectId === 'string' && project === null) {
				throw new bad_request_error_1.BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}
			if (project === null) {
				throw new n8n_workflow_1.UnexpectedError('No personal project found');
			}
			if (parentFolderId) {
				try {
					const parentFolder = await this.folderService.findFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
					await transactionManager.update(
						db_1.WorkflowEntity,
						{ id: workflow.id },
						{ parentFolder },
					);
				} catch {}
			}
			const newSharedWorkflow = this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: project.id,
				workflow,
			});
			await transactionManager.save(newSharedWorkflow);
			return await this.workflowFinderService.findWorkflowForUser(
				workflow.id,
				req.user,
				['workflow:read'],
				{ em: transactionManager, includeTags: true, includeParentFolder: true },
			);
		});
		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: req.user.id });
			throw new internal_server_error_1.InternalServerError('Failed to save workflow');
		}
		await this.workflowHistoryService.saveVersion(req.user, savedWorkflow, savedWorkflow.id);
		if (tagIds && !this.globalConfig.tags.disabled && savedWorkflow.tags) {
			savedWorkflow.tags = this.tagService.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}
		const savedWorkflowWithMetaData =
			this.enterpriseWorkflowService.addOwnerAndSharings(savedWorkflow);
		delete savedWorkflowWithMetaData.shared;
		await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		this.eventService.emit('workflow-created', {
			user: req.user,
			workflow: newWorkflow,
			publicApi: false,
			projectId: project.id,
			projectType: project.type,
		});
		const scopes = await this.workflowService.getWorkflowScopes(req.user, savedWorkflow.id);
		return { ...savedWorkflowWithMetaData, scopes };
	}
	async getAll(req, res) {
		try {
			const { workflows: data, count } = await this.workflowService.getMany(
				req.user,
				req.listQueryOptions,
				!!req.query.includeScopes,
				!!req.query.includeFolders,
				!!req.query.onlySharedWithMe,
			);
			res.json({ count, data });
		} catch (maybeError) {
			const error = utils.toError(maybeError);
			ResponseHelper.reportError(error);
			ResponseHelper.sendErrorResponse(res, error);
		}
	}
	async getNewName(req) {
		const requestedName = req.query.name ?? this.globalConfig.workflows.defaultName;
		const name = await this.namingService.getUniqueWorkflowName(requestedName);
		return { name };
	}
	async getFromUrl(_req, _res, query) {
		let workflowData;
		try {
			const { data } = await axios_1.default.get(query.url);
			workflowData = data;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError('The URL does not point to valid JSON file!');
		}
		if (
			workflowData?.nodes === undefined ||
			!Array.isArray(workflowData.nodes) ||
			workflowData.connections === undefined ||
			typeof workflowData.connections !== 'object' ||
			Array.isArray(workflowData.connections)
		) {
			throw new bad_request_error_1.BadRequestError(
				'The data in the file does not seem to be a n8n workflow JSON file!',
			);
		}
		return workflowData;
	}
	async getWorkflow(req) {
		const { workflowId } = req.params;
		if (this.license.isSharingEnabled()) {
			const relations = {
				shared: {
					project: {
						projectRelations: true,
					},
				},
			};
			if (!this.globalConfig.tags.disabled) {
				relations.tags = true;
			}
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:read'],
				{ includeTags: !this.globalConfig.tags.disabled, includeParentFolder: true },
			);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError(
					`Workflow with ID "${workflowId}" does not exist`,
				);
			}
			const enterpriseWorkflowService = this.enterpriseWorkflowService;
			const workflowWithMetaData = enterpriseWorkflowService.addOwnerAndSharings(workflow);
			await enterpriseWorkflowService.addCredentialsToWorkflow(workflowWithMetaData, req.user);
			delete workflowWithMetaData.shared;
			const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
			return { ...workflowWithMetaData, scopes };
		}
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:read'],
			{ includeTags: !this.globalConfig.tags.disabled, includeParentFolder: true },
		);
		if (!workflow) {
			this.logger.warn('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new not_found_error_1.NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}
		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
		return { ...workflow, scopes };
	}
	async update(req) {
		const { workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';
		let updateData = new db_1.WorkflowEntity();
		const { tags, parentFolderId, ...rest } = req.body;
		Object.assign(updateData, rest);
		const isSharingEnabled = this.license.isSharingEnabled();
		if (isSharingEnabled) {
			updateData = await this.enterpriseWorkflowService.preventTampering(
				updateData,
				workflowId,
				req.user,
			);
		}
		const updatedWorkflow = await this.workflowService.update(
			req.user,
			updateData,
			workflowId,
			tags,
			parentFolderId,
			isSharingEnabled ? forceSave : true,
		);
		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
		return { ...updatedWorkflow, scopes };
	}
	async delete(req, _res, workflowId) {
		const workflow = await this.workflowService.delete(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new forbidden_error_1.ForbiddenError(
				'Could not delete the workflow - workflow was not found in your projects',
			);
		}
		return true;
	}
	async archive(req, _res, workflowId) {
		const workflow = await this.workflowService.archive(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to archive a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new forbidden_error_1.ForbiddenError(
				'Could not archive the workflow - workflow was not found in your projects',
			);
		}
		return workflow;
	}
	async unarchive(req, _res, workflowId) {
		const workflow = await this.workflowService.unarchive(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to unarchive a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new forbidden_error_1.ForbiddenError(
				'Could not unarchive the workflow - workflow was not found in your projects',
			);
		}
		return workflow;
	}
	async runManually(req, _res, query) {
		if (!req.body.workflowData.id) {
			throw new n8n_workflow_1.UnexpectedError('You cannot execute a workflow without an ID');
		}
		if (req.params.workflowId !== req.body.workflowData.id) {
			throw new n8n_workflow_1.UnexpectedError(
				'Workflow ID in body does not match workflow ID in URL',
			);
		}
		if (this.license.isSharingEnabled()) {
			const workflow = this.workflowRepository.create(req.body.workflowData);
			const safeWorkflow = await this.enterpriseWorkflowService.preventTampering(
				workflow,
				workflow.id,
				req.user,
			);
			req.body.workflowData.nodes = safeWorkflow.nodes;
		}
		return await this.workflowExecutionService.executeManually(
			req.body,
			req.user,
			req.headers['push-ref'],
			query.partialExecutionVersion,
		);
	}
	async executePartial(req) {
		const { workflowId } = req.params;
		const { startNodes = [], endNodes = [], inputData = {}, mode = 'manual' } = req.body;
		this.logger.debug('Partial workflow execution requested', {
			workflowId,
			userId: req.user.id,
			startNodes,
			endNodes,
			inputDataCount: Object.keys(inputData).length,
		});
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:execute',
			]);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError(
					`Workflow with ID "${workflowId}" does not exist`,
				);
			}
			const workflowNodeNames = workflow.nodes.map((node) => node.name);
			for (const nodeName of [...startNodes, ...endNodes]) {
				if (!workflowNodeNames.includes(nodeName)) {
					throw new bad_request_error_1.BadRequestError(
						`Node "${nodeName}" does not exist in workflow`,
					);
				}
			}
			const workflowData = {
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.active,
				settings: workflow.settings || {},
				createdAt: workflow.createdAt,
				updatedAt: workflow.updatedAt,
				isArchived: false,
			};
			const startNodeData = startNodes.map((name) => ({ name, sourceData: null }));
			const manualRunData = {
				workflowData,
				runData: {},
				startNodes: startNodeData,
				destinationNode: endNodes.length > 0 ? endNodes[0] : undefined,
			};
			if (Object.keys(inputData).length > 0) {
			}
			const executionResult = await this.workflowExecutionService.executeManually(
				manualRunData,
				req.user,
				req.headers['push-ref'],
			);
			this.logger.debug('Partial workflow execution completed', {
				workflowId,
				userId: req.user.id,
				executionId: executionResult?.executionId,
			});
			const result = {
				success: true,
				workflowId,
				executionId: 'executionId' in executionResult ? executionResult.executionId : undefined,
				waitingForWebhook:
					'waitingForWebhook' in executionResult ? executionResult.waitingForWebhook : false,
				startNodes,
				endNodes,
				metadata: {
					executedAt: new Date(),
					mode,
					startNodesCount: startNodes.length,
					endNodesCount: endNodes.length,
					totalNodes: workflow.nodes.length,
				},
			};
			return result;
		} catch (error) {
			this.logger.error('Partial workflow execution failed', {
				workflowId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Partial execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async share(req) {
		const { workflowId } = req.params;
		const { shareWithIds } = req.body;
		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new bad_request_error_1.BadRequestError('Bad request');
		}
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:share',
		]);
		if (!workflow) {
			throw new forbidden_error_1.ForbiddenError();
		}
		let newShareeIds = [];
		const { manager: dbManager } = this.projectRepository;
		await dbManager.transaction(async (trx) => {
			const currentPersonalProjectIDs = workflow.shared
				.filter((sw) => sw.role === 'workflow:editor')
				.map((sw) => sw.projectId);
			const newPersonalProjectIDs = shareWithIds;
			const toShare = utils.rightDiff(
				[currentPersonalProjectIDs, (id) => id],
				[newPersonalProjectIDs, (id) => id],
			);
			const toUnshare = utils.rightDiff(
				[newPersonalProjectIDs, (id) => id],
				[currentPersonalProjectIDs, (id) => id],
			);
			await trx.delete(db_1.SharedWorkflow, {
				workflowId,
				projectId: (0, typeorm_1.In)(toUnshare),
			});
			await this.enterpriseWorkflowService.shareWithProjects(workflow.id, toShare, trx);
			newShareeIds = toShare;
		});
		this.eventService.emit('workflow-sharing-updated', {
			workflowId,
			userIdSharer: req.user.id,
			userIdList: shareWithIds,
		});
		const projectsRelations = await this.projectRelationRepository.findBy({
			projectId: (0, typeorm_1.In)(newShareeIds),
			role: 'project:personalOwner',
		});
		await this.mailer.notifyWorkflowShared({
			sharer: req.user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			workflow,
		});
	}
	async transfer(req, _res, workflowId, body) {
		return await this.enterpriseWorkflowService.transferWorkflow(
			req.user,
			workflowId,
			body.destinationProjectId,
			body.shareCredentials,
			body.destinationParentFolderId,
		);
	}
	async getWorkflowsWithNodesIncluded(req, res) {
		try {
			const hasPermission =
				req.user.role === api_types_1.ROLE.Owner || req.user.role === api_types_1.ROLE.Admin;
			if (!hasPermission) {
				res.json({ data: [], count: 0 });
				return;
			}
			const { nodeTypes } = req.body;
			const workflows = await this.workflowService.getWorkflowsWithNodesIncluded(
				req.user,
				nodeTypes,
			);
			res.json({
				data: workflows,
				count: workflows.length,
			});
		} catch (maybeError) {
			const error = utils.toError(maybeError);
			ResponseHelper.reportError(error);
			ResponseHelper.sendErrorResponse(res, error);
		}
	}
	async getAvailableVariables(req) {
		const { workflowId, nodeId, includeFunctions = true, includeNodeContext = true } = req.query;
		this.logger.debug('Workflow variables discovery requested', {
			workflowId,
			nodeId,
			userId: req.user.id,
			includeFunctions,
			includeNodeContext,
		});
		try {
			const variables = {
				core: {
					$data: {
						type: 'object',
						description: 'JSON data from the current item',
						example: '$data.propertyName',
					},
					$json: {
						type: 'object',
						description: 'Alias for $data - JSON data from the current item',
						example: '$json.id',
					},
					$binary: {
						type: 'object',
						description: 'Binary data from the current item',
						example: '$binary.fileName',
					},
					$item: {
						type: 'function',
						description: 'Access data from a specific item index',
						example: '$item(0).json.propertyName',
						parameters: [
							{ name: 'itemIndex', type: 'number', description: 'Index of the item to access' },
							{
								name: 'runIndex',
								type: 'number',
								optional: true,
								description: 'Run index (optional)',
							},
						],
					},
					$items: {
						type: 'function',
						description: 'Access all items from a node',
						example: '$items("nodeName")',
						parameters: [
							{
								name: 'nodeName',
								type: 'string',
								optional: true,
								description: 'Node name (optional, defaults to previous node)',
							},
							{
								name: 'outputIndex',
								type: 'number',
								optional: true,
								description: 'Output index (optional)',
							},
							{
								name: 'runIndex',
								type: 'number',
								optional: true,
								description: 'Run index (optional)',
							},
						],
					},
					$node: {
						type: 'object',
						description: 'Access data from any node in the workflow',
						example: '$node["Node Name"].json.property',
						properties: {
							json: { type: 'object', description: 'JSON data from the node' },
							binary: { type: 'object', description: 'Binary data from the node' },
							context: { type: 'object', description: 'Context data from the node' },
							parameter: { type: 'object', description: 'Parameter values from the node' },
							runIndex: { type: 'number', description: 'Current run index of the node' },
						},
					},
					$prevNode: {
						type: 'object',
						description: 'Information about the previous node',
						properties: {
							name: { type: 'string', description: 'Name of the previous node' },
							outputIndex: { type: 'number', description: 'Output index used' },
							runIndex: { type: 'number', description: 'Run index used' },
						},
					},
					$workflow: {
						type: 'object',
						description: 'Information about the current workflow',
						properties: {
							id: { type: 'string', description: 'Workflow ID' },
							name: { type: 'string', description: 'Workflow name' },
							active: { type: 'boolean', description: 'Whether workflow is active' },
						},
					},
					$parameter: {
						type: 'object',
						description: 'Access parameter values from the current node',
						example: '$parameter.parameterName',
					},
					$rawParameter: {
						type: 'object',
						description:
							'Access raw parameter values (unresolved expressions) from the current node',
						example: '$rawParameter.parameterName',
					},
					$self: {
						type: 'object',
						description: 'Access to self-data set by the node',
						example: '$self.propertyName',
					},
				},
				execution: {
					$runIndex: {
						type: 'number',
						description: 'Current run index',
						example: '$runIndex',
					},
					$itemIndex: {
						type: 'number',
						description: 'Current item index',
						example: '$itemIndex',
					},
					$mode: {
						type: 'string',
						description: 'Current execution mode (manual, trigger, webhook, etc.)',
						example: '$mode',
					},
					$now: {
						type: 'DateTime',
						description: 'Current date and time as DateTime object',
						example: '$now.toISO()',
					},
					$today: {
						type: 'DateTime',
						description: 'Current date at midnight as DateTime object',
						example: '$today.toFormat("yyyy-MM-dd")',
					},
				},
				utility: {
					$env: {
						type: 'object',
						description: 'Access environment variables',
						example: '$env.MY_ENV_VAR',
					},
					$jmesPath: {
						type: 'function',
						description: 'Query JSON data using JMESPath',
						example: '$jmesPath($json, "items[*].name")',
						parameters: [
							{ name: 'data', type: 'object', description: 'Data to query' },
							{ name: 'query', type: 'string', description: 'JMESPath query string' },
						],
					},
					$evaluateExpression: {
						type: 'function',
						description: 'Evaluate an expression dynamically',
						example: '$evaluateExpression("1 + 1")',
						parameters: [
							{ name: 'expression', type: 'string', description: 'Expression to evaluate' },
							{
								name: 'itemIndex',
								type: 'number',
								optional: true,
								description: 'Item index (optional)',
							},
						],
					},
					$getPairedItem: {
						type: 'function',
						description: 'Get paired item from previous nodes',
						example: '$getPairedItem()',
						parameters: [
							{
								name: 'destinationNodeName',
								type: 'string',
								optional: true,
								description: 'Target node name',
							},
						],
					},
				},
				...(includeNodeContext && workflowId
					? await this.getNodeSpecificContext(workflowId, nodeId, req.user)
					: {}),
			};
			if (includeFunctions) {
				variables.functions = await this.getAvailableFunctions();
			}
			this.logger.debug('Workflow variables discovery completed', {
				workflowId,
				nodeId,
				userId: req.user.id,
				variableCount: Object.keys(variables).length,
			});
			return {
				success: true,
				variables,
				metadata: {
					workflowId,
					nodeId,
					requestedAt: new Date().toISOString(),
					includeFunctions,
					includeNodeContext,
				},
			};
		} catch (error) {
			this.logger.error('Workflow variables discovery failed', {
				workflowId,
				nodeId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Variables discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getAvailableFunctions(req) {
		if (req) {
			this.logger.debug('Function documentation requested', {
				functionName: req.query?.functionName,
				category: req.query?.category,
				userId: req.user.id,
			});
		}
		try {
			const functionName = req?.query?.functionName;
			const category = req?.query?.category;
			const functionDocs = this.expressionDocsService.getFunctionDocumentation(functionName);
			let data;
			if (Array.isArray(functionDocs)) {
				const filteredDocs = category
					? functionDocs.filter((func) => func.category === category)
					: functionDocs;
				data = filteredDocs.map((func) => this.convertToExpressionFunctionDto(func));
			} else if (functionDocs) {
				data = this.convertToExpressionFunctionDto(functionDocs);
			} else {
				data = null;
			}
			const response = {
				success: true,
				data: data || [],
				metadata: {
					requestedAt: new Date().toISOString(),
					functionName,
					category,
					totalCount: Array.isArray(data) ? data.length : data ? 1 : 0,
				},
			};
			if (req) {
				this.logger.debug('Function documentation completed', {
					functionName,
					category,
					userId: req.user.id,
					totalCount: response.metadata.totalCount,
				});
			}
			return response;
		} catch (error) {
			if (req) {
				this.logger.error('Function documentation failed', {
					functionName: req.query?.functionName,
					category: req.query?.category,
					userId: req.user.id,
					error: error instanceof Error ? error.message : String(error),
				});
				if (error instanceof n8n_workflow_1.ApplicationError) {
					throw error;
				}
				throw new internal_server_error_1.InternalServerError(
					`Function documentation failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			throw error;
		}
	}
	async getVariableDocumentation(req) {
		this.logger.debug('Variable documentation requested', {
			variableName: req.query?.variableName,
			category: req.query?.category,
			userId: req.user.id,
		});
		try {
			const variableName = req.query?.variableName;
			const category = req.query?.category;
			const variableDocs = this.expressionDocsService.getVariableDocumentation(variableName);
			let data;
			if (Array.isArray(variableDocs)) {
				const filteredDocs = category
					? variableDocs.filter((variable) => variable.category === category)
					: variableDocs;
				data = filteredDocs.map((variable) => this.convertToExpressionVariableDto(variable));
			} else if (variableDocs) {
				data = this.convertToExpressionVariableDto(variableDocs);
			} else {
				data = null;
			}
			const response = {
				success: true,
				data: data || [],
				metadata: {
					requestedAt: new Date().toISOString(),
					variableName,
					category,
					context: req.query?.context,
					totalCount: Array.isArray(data) ? data.length : data ? 1 : 0,
				},
			};
			this.logger.debug('Variable documentation completed', {
				variableName,
				category,
				userId: req.user.id,
				totalCount: response.metadata.totalCount,
			});
			return response;
		} catch (error) {
			this.logger.error('Variable documentation failed', {
				variableName: req.query?.variableName,
				category: req.query?.category,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Variable documentation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getExpressionSyntaxDocumentation(req) {
		this.logger.debug('Expression syntax documentation requested', {
			topic: req.query?.topic,
			userId: req.user.id,
		});
		try {
			const topic = req.query?.topic;
			const syntaxDocs = this.expressionDocsService.getExpressionSyntaxDocs(topic);
			const response = {
				success: true,
				data: syntaxDocs || [],
				metadata: {
					requestedAt: new Date().toISOString(),
					topic,
					totalCount: Array.isArray(syntaxDocs) ? syntaxDocs.length : syntaxDocs ? 1 : 0,
				},
			};
			this.logger.debug('Expression syntax documentation completed', {
				topic,
				userId: req.user.id,
				totalCount: response.metadata.totalCount,
			});
			return response;
		} catch (error) {
			this.logger.error('Expression syntax documentation failed', {
				topic: req.query?.topic,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Expression syntax documentation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getContextualHelp(req) {
		const { nodeType } = req.params;
		this.logger.debug('Contextual help requested', {
			nodeType,
			context: req.query?.context,
			userId: req.user.id,
		});
		try {
			const context = req.query?.context;
			const contextualDocs = this.expressionDocsService.getContextualDocumentation(
				nodeType,
				context,
			);
			const response = {
				success: true,
				data: contextualDocs,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeType,
					context,
					totalFunctions: contextualDocs.relevantFunctions.length,
					totalVariables: contextualDocs.relevantVariables.length,
					totalTips: contextualDocs.contextSpecificTips.length,
				},
			};
			this.logger.debug('Contextual help completed', {
				nodeType,
				context,
				userId: req.user.id,
				totalFunctions: response.metadata.totalFunctions,
				totalVariables: response.metadata.totalVariables,
				totalTips: response.metadata.totalTips,
			});
			return response;
		} catch (error) {
			this.logger.error('Contextual help failed', {
				nodeType,
				context: req.query?.context,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Contextual help failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async searchDocumentation(req) {
		this.logger.debug('Documentation search requested', {
			query: req.query.query,
			type: req.query?.type,
			userId: req.user.id,
		});
		try {
			const startTime = Date.now();
			const { query, type, limit } = req.query;
			const searchResults = this.expressionDocsService.searchDocumentation(query, type);
			if (limit) {
				if (searchResults.functions.length > limit) {
					searchResults.functions = searchResults.functions.slice(0, limit);
				}
				if (searchResults.variables.length > limit) {
					searchResults.variables = searchResults.variables.slice(0, limit);
				}
				if (searchResults.syntax.length > limit) {
					searchResults.syntax = searchResults.syntax.slice(0, limit);
				}
			}
			const totalResults =
				searchResults.functions.length +
				searchResults.variables.length +
				searchResults.syntax.length;
			const response = {
				success: true,
				data: searchResults,
				metadata: {
					requestedAt: new Date().toISOString(),
					query,
					type,
					totalResults,
					searchTimeMs: Date.now() - startTime,
				},
			};
			this.logger.debug('Documentation search completed', {
				query,
				type,
				userId: req.user.id,
				totalResults,
				searchTimeMs: response.metadata.searchTimeMs,
			});
			return response;
		} catch (error) {
			this.logger.error('Documentation search failed', {
				query: req.query.query,
				type: req.query?.type,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Documentation search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getWorkflowExecutionContext(req) {
		const { workflowId } = req.params;
		const { nodeId, includeNodeDetails = true, includeConnections = true } = req.query;
		this.logger.debug('Workflow execution context requested', {
			workflowId,
			nodeId,
			userId: req.user.id,
			includeNodeDetails,
			includeConnections,
		});
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:read'],
				{ includeTags: false, includeParentFolder: false },
			);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError(
					`Workflow with ID "${workflowId}" does not exist`,
				);
			}
			const context = {
				workflow: {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
					createdAt: workflow.createdAt,
					updatedAt: workflow.updatedAt,
					settings: workflow.settings || {},
				},
				nodes: workflow.nodes.map((node) => ({
					id: node.id,
					name: node.name,
					type: node.type,
					typeVersion: node.typeVersion,
					position: node.position,
					disabled: node.disabled || false,
					...(includeNodeDetails && {
						parameters: node.parameters,
						credentials: node.credentials ? Object.keys(node.credentials) : [],
					}),
				})),
				...(includeConnections && {
					connections: workflow.connections,
				}),
				...(nodeId && {
					focusNode: workflow.nodes.find((n) => n.id === nodeId || n.name === nodeId),
				}),
			};
			if (nodeId) {
				const targetNode = workflow.nodes.find((n) => n.id === nodeId || n.name === nodeId);
				if (targetNode) {
					context.nodeContext = await this.getNodeExecutionContext(workflow, targetNode);
				}
			}
			this.logger.debug('Workflow execution context completed', {
				workflowId,
				nodeId,
				userId: req.user.id,
				nodeCount: workflow.nodes.length,
			});
			return {
				success: true,
				context,
				metadata: {
					workflowId,
					nodeId,
					requestedAt: new Date().toISOString(),
					includeNodeDetails,
					includeConnections,
					totalNodes: workflow.nodes.length,
				},
			};
		} catch (error) {
			this.logger.error('Workflow execution context failed', {
				workflowId,
				nodeId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Context discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getWorkflowVariables(req) {
		const { workflowId } = req.params;
		const { nodeType, context } = req.query;
		this.logger.debug('Workflow variables requested', {
			workflowId,
			nodeType,
			context,
			userId: req.user.id,
		});
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError(
					`Workflow with ID "${workflowId}" does not exist`,
				);
			}
			const variables = this.expressionDocsService.getVariableDocumentation();
			let contextualData = null;
			if (nodeType) {
				contextualData = this.expressionDocsService.getContextualDocumentation(nodeType, context);
			}
			const workflowVariables = {
				$workflow: {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
				},
				nodes: workflow.nodes.map((node) => ({
					name: node.name,
					type: node.type,
					parameters: Object.keys(node.parameters || {}),
				})),
			};
			return {
				success: true,
				workflowId,
				variables: {
					core: variables,
					workflow: workflowVariables,
					contextual: contextualData?.relevantVariables || [],
				},
				metadata: {
					nodeType,
					context,
					totalCoreVariables: Array.isArray(variables) ? variables.length : 0,
					totalNodes: workflow.nodes.length,
					requestedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Workflow variables discovery failed', {
				workflowId,
				nodeType,
				context,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow variables discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getWorkflowFunctions(req) {
		const { workflowId } = req.params;
		const { category, nodeType, search } = req.query;
		this.logger.debug('Workflow functions requested', {
			workflowId,
			category,
			nodeType,
			search,
			userId: req.user.id,
		});
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError(
					`Workflow with ID "${workflowId}" does not exist`,
				);
			}
			let functions = this.expressionDocsService.getFunctionDocumentation();
			if (!Array.isArray(functions)) {
				functions = [];
			}
			if (category) {
				functions = functions.filter((func) => func.category === category);
			}
			if (search) {
				const searchTerm = search.toLowerCase();
				functions = functions.filter(
					(func) =>
						func.name.toLowerCase().includes(searchTerm) ||
						func.description.toLowerCase().includes(searchTerm) ||
						func.category.toLowerCase().includes(searchTerm),
				);
			}
			let contextualData = null;
			if (nodeType) {
				contextualData = this.expressionDocsService.getContextualDocumentation(nodeType);
				functions = [...functions, ...contextualData.relevantFunctions];
			}
			const uniqueFunctions = functions.reduce((acc, func) => {
				if (!acc.find((f) => f.name === func.name)) {
					acc.push(func);
				}
				return acc;
			}, []);
			return {
				success: true,
				workflowId,
				functions: uniqueFunctions,
				metadata: {
					category,
					nodeType,
					search,
					totalFunctions: uniqueFunctions.length,
					availableCategories: [...new Set(uniqueFunctions.map((f) => f.category))],
					workflowNodes: workflow.nodes.length,
					requestedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Workflow functions discovery failed', {
				workflowId,
				category,
				nodeType,
				search,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow functions discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getNodeSpecificContext(workflowId, nodeId, user) {
		if (!nodeId) return {};
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:read',
			]);
			if (!workflow) return {};
			const node = workflow.nodes.find((n) => n.id === nodeId || n.name === nodeId);
			if (!node) return {};
			return {
				nodeSpecific: {
					currentNode: {
						type: 'object',
						description: `Context specific to node "${node.name}"`,
						properties: {
							name: { type: 'string', value: node.name },
							type: { type: 'string', value: node.type },
							typeVersion: { type: 'number', value: node.typeVersion },
							parameters: { type: 'object', value: node.parameters },
							position: { type: 'array', value: node.position },
							disabled: { type: 'boolean', value: node.disabled || false },
						},
					},
					connectedNodes: {
						type: 'array',
						description: 'Nodes connected to this node',
						value: this.getConnectedNodes(workflow, node.name),
					},
					availableInputs: {
						type: 'object',
						description: 'Available input data based on connected nodes',
						value: this.getAvailableInputs(workflow, node.name),
					},
				},
			};
		} catch (error) {
			this.logger.debug('Failed to get node-specific context', { workflowId, nodeId, error });
			return {};
		}
	}
	getConnectedNodes(workflow, nodeName) {
		const connections = [];
		if (workflow.connections) {
			for (const [sourceNodeName, sourceConnections] of Object.entries(workflow.connections)) {
				if (sourceConnections && typeof sourceConnections === 'object') {
					const mainConnections = sourceConnections.main;
					if (Array.isArray(mainConnections)) {
						for (const connectionGroup of mainConnections) {
							if (Array.isArray(connectionGroup)) {
								for (const connection of connectionGroup) {
									if (connection.node === nodeName) {
										connections.push({
											source: sourceNodeName,
											target: nodeName,
											type: 'input',
											sourceIndex: connection.sourceIndex || 0,
											targetIndex: connection.targetIndex || 0,
										});
									}
								}
							}
						}
					}
				}
			}
		}
		if (workflow.connections && workflow.connections[nodeName]) {
			const nodeConnections = workflow.connections[nodeName];
			if (nodeConnections.main && Array.isArray(nodeConnections.main)) {
				for (let outputIndex = 0; outputIndex < nodeConnections.main.length; outputIndex++) {
					const outputConnections = nodeConnections.main[outputIndex];
					if (Array.isArray(outputConnections)) {
						for (const connection of outputConnections) {
							connections.push({
								source: nodeName,
								target: connection.node,
								type: 'output',
								sourceIndex: outputIndex,
								targetIndex: connection.targetIndex || 0,
							});
						}
					}
				}
			}
		}
		return connections;
	}
	getAvailableInputs(workflow, nodeName) {
		const inputs = {};
		const connectedNodes = this.getConnectedNodes(workflow, nodeName);
		const inputNodes = connectedNodes.filter((conn) => conn.type === 'input');
		for (const conn of inputNodes) {
			const sourceNode = workflow.nodes.find((n) => n.name === conn.source);
			if (sourceNode) {
				inputs[conn.source] = {
					nodeType: sourceNode.type,
					available: true,
					connectionIndex: conn.sourceIndex,
					example: `$node["${conn.source}"].json`,
				};
			}
		}
		return inputs;
	}
	async getNodeExecutionContext(workflow, node) {
		const nodeType = await this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return {
			node: {
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
				displayName: nodeType?.description?.displayName || node.type,
				description: nodeType?.description?.description || '',
				parameters: node.parameters,
				position: node.position,
				disabled: node.disabled || false,
			},
			nodeType: nodeType
				? {
						displayName: nodeType.description.displayName,
						description: nodeType.description.description,
						version: nodeType.description.version,
						defaults: nodeType.description.defaults,
						inputs: nodeType.description.inputs,
						outputs: nodeType.description.outputs,
						properties:
							nodeType.description.properties?.map((prop) => ({
								name: prop.name,
								displayName: prop.displayName,
								type: prop.type,
								required: prop.required,
								description: prop.description,
							})) || [],
					}
				: null,
			availableVariables: {
				$parameter: Object.keys(node.parameters || {}),
				$node: this.getConnectedNodes(workflow, node.name).map((conn) =>
					conn.type === 'input' ? conn.source : conn.target,
				),
			},
		};
	}
	async bulkActivate(req) {
		const { workflowIds, forceActivation = false } = req.body;
		const startTime = Date.now();
		this.logger.debug('Bulk workflow activation requested', {
			workflowIds,
			userId: req.user.id,
			forceActivation,
			count: workflowIds.length,
		});
		const results = {
			success: [],
			errors: [],
			totalProcessed: workflowIds.length,
			successCount: 0,
			errorCount: 0,
			metadata: {
				processedAt: new Date().toISOString(),
				forceActivation,
				processingTimeMs: 0,
			},
		};
		const concurrency = Math.min(10, workflowIds.length);
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}
		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					const workflow = await this.workflowFinderService.findWorkflowForUser(
						workflowId,
						req.user,
						['workflow:update'],
					);
					if (!workflow) {
						results.errors.push({
							workflowId,
							name: 'Unknown',
							error: 'Workflow not found or insufficient permissions',
							code: 'NOT_FOUND',
						});
						return;
					}
					if (workflow.active && !forceActivation) {
						results.success.push({
							workflowId,
							name: workflow.name,
							activated: false,
							message: 'Workflow already active',
							activatedAt: undefined,
						});
						return;
					}
					await this.activeWorkflowManager.add(workflowId, 'activate');
					await this.workflowRepository.update(workflowId, { active: true });
					results.success.push({
						workflowId,
						name: workflow.name,
						activated: true,
						message: 'Workflow activated successfully',
						activatedAt: new Date().toISOString(),
					});
					this.eventService.emit('workflow-activated', {
						user: req.user,
						workflowId,
						workflowName: workflow.name,
					});
				} catch (error) {
					this.logger.error('Failed to activate workflow in bulk operation', {
						workflowId,
						userId: req.user.id,
						error: error instanceof Error ? error.message : String(error),
					});
					const workflow = await this.workflowRepository.findOne({
						where: { id: workflowId },
						select: ['name'],
					});
					results.errors.push({
						workflowId,
						name: workflow?.name || 'Unknown',
						error: error instanceof Error ? error.message : String(error),
						code: 'ACTIVATION_FAILED',
					});
				}
			});
			await Promise.all(promises);
		}
		results.successCount = results.success.length;
		results.errorCount = results.errors.length;
		results.metadata.processingTimeMs = Date.now() - startTime;
		this.logger.info('Bulk workflow activation completed', {
			userId: req.user.id,
			totalProcessed: results.totalProcessed,
			successCount: results.successCount,
			errorCount: results.errorCount,
			processingTimeMs: results.metadata.processingTimeMs,
		});
		return results;
	}
	async bulkDeactivate(req) {
		const { workflowIds, forceDeactivation = false } = req.body;
		const startTime = Date.now();
		this.logger.debug('Bulk workflow deactivation requested', {
			workflowIds,
			userId: req.user.id,
			forceDeactivation,
			count: workflowIds.length,
		});
		const results = {
			success: [],
			errors: [],
			totalProcessed: workflowIds.length,
			successCount: 0,
			errorCount: 0,
			metadata: {
				processedAt: new Date().toISOString(),
				forceDeactivation,
				processingTimeMs: 0,
			},
		};
		const concurrency = Math.min(10, workflowIds.length);
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}
		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					const workflow = await this.workflowFinderService.findWorkflowForUser(
						workflowId,
						req.user,
						['workflow:update'],
					);
					if (!workflow) {
						results.errors.push({
							workflowId,
							name: 'Unknown',
							error: 'Workflow not found or insufficient permissions',
							code: 'NOT_FOUND',
						});
						return;
					}
					if (!workflow.active && !forceDeactivation) {
						results.success.push({
							workflowId,
							name: workflow.name,
							deactivated: false,
							message: 'Workflow already inactive',
							deactivatedAt: undefined,
						});
						return;
					}
					await this.activeWorkflowManager.remove(workflowId);
					await this.workflowRepository.update(workflowId, { active: false });
					results.success.push({
						workflowId,
						name: workflow.name,
						deactivated: true,
						message: 'Workflow deactivated successfully',
						deactivatedAt: new Date().toISOString(),
					});
					this.eventService.emit('workflow-deactivated', {
						user: req.user,
						workflowId,
						workflowName: workflow.name,
					});
				} catch (error) {
					this.logger.error('Failed to deactivate workflow in bulk operation', {
						workflowId,
						userId: req.user.id,
						error: error instanceof Error ? error.message : String(error),
					});
					const workflow = await this.workflowRepository.findOne({
						where: { id: workflowId },
						select: ['name'],
					});
					results.errors.push({
						workflowId,
						name: workflow?.name || 'Unknown',
						error: error instanceof Error ? error.message : String(error),
						code: 'DEACTIVATION_FAILED',
					});
				}
			});
			await Promise.all(promises);
		}
		results.successCount = results.success.length;
		results.errorCount = results.errors.length;
		results.metadata.processingTimeMs = Date.now() - startTime;
		this.logger.info('Bulk workflow deactivation completed', {
			userId: req.user.id,
			totalProcessed: results.totalProcessed,
			successCount: results.successCount,
			errorCount: results.errorCount,
			processingTimeMs: results.metadata.processingTimeMs,
		});
		return results;
	}
	async bulkUpdate(req) {
		const { workflowIds, updates, updateMode = 'merge' } = req.body;
		const startTime = Date.now();
		this.logger.debug('Bulk workflow update requested', {
			workflowIds,
			userId: req.user.id,
			updates,
			updateMode,
			count: workflowIds.length,
		});
		const results = {
			success: [],
			errors: [],
			totalProcessed: workflowIds.length,
			successCount: 0,
			errorCount: 0,
			metadata: {
				processedAt: new Date().toISOString(),
				updateMode,
				processingTimeMs: 0,
				appliedUpdates: updates,
			},
		};
		const concurrency = Math.min(5, workflowIds.length);
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}
		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					const workflow = await this.workflowFinderService.findWorkflowForUser(
						workflowId,
						req.user,
						['workflow:update'],
					);
					if (!workflow) {
						results.errors.push({
							workflowId,
							name: 'Unknown',
							error: 'Workflow not found or insufficient permissions',
							code: 'NOT_FOUND',
						});
						return;
					}
					const changes = [];
					const updateData = {};
					if (updates.active !== undefined && updates.active !== workflow.active) {
						if (updates.active) {
							await this.activeWorkflowManager.add(workflowId, 'activate');
							changes.push('activated');
						} else {
							await this.activeWorkflowManager.remove(workflowId);
							changes.push('deactivated');
						}
						updateData.active = updates.active;
					}
					if (updates.name && updates.name !== workflow.name) {
						updateData.name = updates.name;
						changes.push('name');
					}
					if (updates.settings) {
						if (updateMode === 'merge') {
							updateData.settings = { ...workflow.settings, ...updates.settings };
						} else {
							updateData.settings = updates.settings;
						}
						changes.push('settings');
					}
					if (updates.tags && !this.globalConfig.tags.disabled) {
						const tags = await this.tagRepository.findMany(updates.tags);
						workflow.tags = tags;
						changes.push('tags');
					}
					if (updates.projectId || updates.parentFolderId) {
						if (updates.projectId) {
							changes.push('project');
						}
						if (updates.parentFolderId) {
							changes.push('folder');
						}
					}
					if (Object.keys(updateData).length > 0) {
						await this.workflowRepository.update(workflowId, updateData);
					}
					if (updates.tags && !this.globalConfig.tags.disabled) {
						await this.workflowRepository.save(workflow);
					}
					results.success.push({
						workflowId,
						name: updateData.name || workflow.name,
						updated: changes.length > 0,
						message: changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'No changes applied',
						updatedAt: changes.length > 0 ? new Date().toISOString() : undefined,
						changes,
					});
					if (changes.length > 0) {
						this.eventService.emit('workflow-updated', {
							user: req.user,
							workflowId,
							workflowName: updateData.name || workflow.name,
							changes,
						});
					}
				} catch (error) {
					this.logger.error('Failed to update workflow in bulk operation', {
						workflowId,
						userId: req.user.id,
						error: error instanceof Error ? error.message : String(error),
					});
					const workflow = await this.workflowRepository.findOne({
						where: { id: workflowId },
						select: ['name'],
					});
					results.errors.push({
						workflowId,
						name: workflow?.name || 'Unknown',
						error: error instanceof Error ? error.message : String(error),
						code: 'UPDATE_FAILED',
					});
				}
			});
			await Promise.all(promises);
		}
		results.successCount = results.success.length;
		results.errorCount = results.errors.length;
		results.metadata.processingTimeMs = Date.now() - startTime;
		this.logger.info('Bulk workflow update completed', {
			userId: req.user.id,
			totalProcessed: results.totalProcessed,
			successCount: results.successCount,
			errorCount: results.errorCount,
			processingTimeMs: results.metadata.processingTimeMs,
		});
		return results;
	}
	async searchWorkflows(req) {
		this.logger.debug('Workflow search requested', {
			userId: req.user.id,
			query: req.query.query,
			searchIn: req.query.searchIn,
		});
		try {
			const searchQuery = this.validateSearchQuery(req.query);
			const result = await this.workflowSearchService.searchWorkflows(searchQuery, req.user);
			try {
				const { SearchAnalyticsService } = await Promise.resolve().then(() =>
					__importStar(require('@/services/search-analytics.service')),
				);
				const searchAnalyticsService = di_1.Container.get(SearchAnalyticsService);
				await searchAnalyticsService.recordSearchQuery({
					query: searchQuery.query || '',
					userId: req.user.id,
					searchTimeMs: result.metadata.searchTimeMs,
					resultCount: result.results.length,
					searchMethod: result.metadata.searchEngine?.used ? 'search_engine' : 'database',
					searchEngine: result.metadata.searchEngine?.name,
					filters: result.query.appliedFilters || {},
					timestamp: new Date(),
					userAgent: req.headers['user-agent'],
					sessionId: req.sessionID,
				});
			} catch (analyticsError) {
				this.logger.warn('Failed to record search analytics', {
					error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
				});
			}
			this.logger.debug('Workflow search completed', {
				userId: req.user.id,
				resultsCount: result.results.length,
				totalCount: result.pagination.total,
				searchTimeMs: result.metadata.searchTimeMs,
			});
			return result;
		} catch (error) {
			this.logger.error('Workflow search failed', {
				userId: req.user.id,
				query: req.query.query,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Workflow search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async advancedSearchWorkflows(req) {
		this.logger.debug('Advanced workflow search requested', {
			userId: req.user.id,
			queryStructure: {
				mustClauses: req.body.query?.must?.length || 0,
				shouldClauses: req.body.query?.should?.length || 0,
				mustNotClauses: req.body.query?.mustNot?.length || 0,
			},
		});
		try {
			const result = await this.workflowSearchService.advancedSearch(req.body, req.user);
			try {
				const { SearchAnalyticsService } = await Promise.resolve().then(() =>
					__importStar(require('@/services/search-analytics.service')),
				);
				const searchAnalyticsService = di_1.Container.get(SearchAnalyticsService);
				await searchAnalyticsService.recordSearchQuery({
					query: 'advanced',
					userId: req.user.id,
					searchTimeMs: result.metadata.searchTimeMs,
					resultCount: result.results.length,
					searchMethod: result.metadata.searchEngine?.used ? 'search_engine' : 'database',
					searchEngine: result.metadata.searchEngine?.name,
					filters: { advanced: true, ...result.query.appliedFilters },
					timestamp: new Date(),
					userAgent: req.headers['user-agent'],
					sessionId: req.sessionID,
				});
			} catch (analyticsError) {
				this.logger.warn('Failed to record advanced search analytics', {
					error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
				});
			}
			this.logger.debug('Advanced workflow search completed', {
				userId: req.user.id,
				resultsCount: result.results.length,
				totalCount: result.pagination.total,
				searchTimeMs: result.metadata.searchTimeMs,
			});
			return result;
		} catch (error) {
			this.logger.error('Advanced workflow search failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Advanced workflow search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSearchSuggestions(req) {
		this.logger.debug('Search suggestions requested', {
			userId: req.user.id,
			query: req.query.query,
			type: req.query.type,
		});
		try {
			const result = await this.workflowSearchService.getSearchSuggestions(req.query, req.user);
			this.logger.debug('Search suggestions completed', {
				userId: req.user.id,
				suggestionsCount: result.suggestions.length,
				query: req.query.query,
			});
			return result;
		} catch (error) {
			this.logger.error('Search suggestions failed', {
				userId: req.user.id,
				query: req.query.query,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				suggestions: [],
				query: req.query.query || '',
				type: req.query.type || 'workflows',
			};
		}
	}
	async getSearchFacets(req) {
		this.logger.debug('Search facets requested', {
			userId: req.user.id,
			projectId: req.query.projectId,
			folderId: req.query.folderId,
		});
		try {
			const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
				req.user,
				['workflow:read'],
				req.query.folderId,
				req.query.projectId,
			);
			const nodeTypes = new Map();
			const tags = new Map();
			const projects = new Map();
			const folders = new Map();
			let activeCount = 0;
			let inactiveCount = 0;
			for (const workflow of workflows) {
				if (workflow.active) {
					activeCount++;
				} else {
					inactiveCount++;
				}
				if (workflow.nodes) {
					const uniqueNodeTypes = new Set(workflow.nodes.map((n) => n.type));
					uniqueNodeTypes.forEach((nodeType) => {
						nodeTypes.set(nodeType, (nodeTypes.get(nodeType) || 0) + 1);
					});
				}
				if (workflow.tags) {
					workflow.tags.forEach((tag) => {
						tags.set(tag.name, (tags.get(tag.name) || 0) + 1);
					});
				}
				if (workflow.projectId) {
					const existing = projects.get(workflow.projectId);
					if (existing) {
						existing.count++;
					} else {
						projects.set(workflow.projectId, { name: 'Project', count: 1 });
					}
				}
			}
			const facets = {
				tags: Array.from(tags.entries())
					.map(([name, count]) => ({ name, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 20),
				nodeTypes: Array.from(nodeTypes.entries())
					.map(([type, count]) => ({ type, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 20),
				projects: Array.from(projects.entries()).map(([id, data]) => ({
					id,
					name: data.name,
					count: data.count,
				})),
				activeStatus: {
					active: activeCount,
					inactive: inactiveCount,
				},
			};
			this.logger.debug('Search facets completed', {
				userId: req.user.id,
				totalWorkflows: workflows.length,
				tagsCount: facets.tags.length,
				nodeTypesCount: facets.nodeTypes.length,
			});
			return {
				facets,
				metadata: {
					totalWorkflows: workflows.length,
					generatedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Search facets failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get search facets: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSearchAnalytics(req) {
		this.logger.debug('Search analytics requested', {
			userId: req.user.id,
			days: req.query.days,
		});
		try {
			const days = req.query.days ? parseInt(req.query.days, 10) : 7;
			if (days < 1 || days > 90) {
				throw new n8n_workflow_1.ApplicationError('Days parameter must be between 1 and 90');
			}
			const { SearchAnalyticsService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/search-analytics.service')),
			);
			const searchAnalyticsService = di_1.Container.get(SearchAnalyticsService);
			const [analytics, performance, suggestions] = await Promise.all([
				searchAnalyticsService.getSearchAnalytics(days),
				searchAnalyticsService.getPerformanceMetrics(),
				searchAnalyticsService.getOptimizationSuggestions(),
			]);
			const response = {
				analytics,
				performance,
				suggestions,
			};
			this.logger.debug('Search analytics completed', {
				userId: req.user.id,
				totalSearches: analytics.totalSearches,
				avgResponseTime: analytics.averageResponseTimeMs,
				suggestionsCount: suggestions.length,
			});
			return response;
		} catch (error) {
			this.logger.error('Search analytics failed', {
				userId: req.user.id,
				days: req.query.days,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to get search analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getPopularSearchQueries(req) {
		this.logger.debug('Popular search queries requested', {
			userId: req.user.id,
			limit: req.query.limit,
		});
		try {
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
			if (limit < 1 || limit > 100) {
				throw new n8n_workflow_1.ApplicationError('Limit parameter must be between 1 and 100');
			}
			const { SearchAnalyticsService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/search-analytics.service')),
			);
			const searchAnalyticsService = di_1.Container.get(SearchAnalyticsService);
			const queries = await searchAnalyticsService.getPopularQueries(limit);
			const response = {
				queries,
				metadata: {
					totalQueries: queries.length,
					dateRange: 'Last 7 days',
				},
			};
			this.logger.debug('Popular search queries completed', {
				userId: req.user.id,
				queriesCount: queries.length,
			});
			return response;
		} catch (error) {
			this.logger.error('Popular search queries failed', {
				userId: req.user.id,
				limit: req.query.limit,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to get popular search queries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSearchEngineHealth(req) {
		this.logger.debug('Search engine health check requested', {
			userId: req.user.id,
		});
		try {
			const { SearchEngineService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/search-engine.service')),
			);
			const { WorkflowIndexingService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/workflow-indexing.service')),
			);
			const { SearchAnalyticsService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/search-analytics.service')),
			);
			const [searchEngineService, workflowIndexingService, searchAnalyticsService] = [
				di_1.Container.get(SearchEngineService),
				di_1.Container.get(WorkflowIndexingService),
				di_1.Container.get(SearchAnalyticsService),
			];
			const [searchEngineHealth, indexingHealth, performanceMetrics] = await Promise.all([
				searchEngineService.getHealth(),
				workflowIndexingService.getIndexingHealth(),
				searchAnalyticsService.getPerformanceMetrics(),
			]);
			let status = 'healthy';
			if (searchEngineHealth.status === 'error' || !indexingHealth.indexExists) {
				status = 'unhealthy';
			} else if (
				searchEngineHealth.status === 'yellow' ||
				performanceMetrics.averageResponseTime > 2000 ||
				performanceMetrics.searchEngineHealthScore < 50
			) {
				status = 'degraded';
			}
			const response = {
				searchEngine: {
					available: searchEngineService.isAvailable(),
					...searchEngineHealth,
				},
				indexing: indexingHealth,
				performance: performanceMetrics,
				status,
			};
			this.logger.debug('Search engine health check completed', {
				userId: req.user.id,
				status,
				searchEngineAvailable: searchEngineService.isAvailable(),
				indexExists: indexingHealth.indexExists,
			});
			return response;
		} catch (error) {
			this.logger.error('Search engine health check failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				searchEngine: {
					available: false,
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
				},
				indexing: {
					indexExists: false,
					documentCount: 0,
				},
				performance: {
					averageResponseTime: 0,
					searchEngineHealthScore: 0,
				},
				status: 'unhealthy',
			};
		}
	}
	async triggerReindexing(req) {
		this.logger.debug('Manual reindexing triggered', {
			userId: req.user.id,
			force: req.body.force,
		});
		try {
			const { WorkflowIndexingService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/workflow-indexing.service')),
			);
			const workflowIndexingService = di_1.Container.get(WorkflowIndexingService);
			const stats = await workflowIndexingService.reindexAllWorkflows({
				refresh: true,
			});
			const response = {
				success: true,
				stats,
				message: `Reindexing completed. Processed ${stats.totalProcessed} workflows with ${stats.successCount} successes and ${stats.errorCount} errors.`,
			};
			this.logger.info('Manual reindexing completed', {
				userId: req.user.id,
				...stats,
			});
			this.eventService.emit('search-reindexing-completed', {
				user: req.user,
				triggeredManually: true,
				stats: {
					totalWorkflows: stats.totalProcessed,
					indexedWorkflows: stats.successCount,
					failedWorkflows: stats.errorCount,
					indexingTimeMs: stats.processingTimeMs,
					searchEngineHealthCheck: stats.errorCount === 0,
				},
			});
			return response;
		} catch (error) {
			this.logger.error('Manual reindexing failed', {
				userId: req.user.id,
				force: req.body.force,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to trigger reindexing: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async createSavedSearch(req) {
		this.logger.debug('Create saved search requested', {
			userId: req.user.id,
			name: req.body.name,
		});
		try {
			const result = await this.savedSearchService.createSavedSearch(req.body, req.user);
			this.logger.debug('Saved search created successfully', {
				userId: req.user.id,
				savedSearchId: result.id,
				name: result.name,
			});
			return result;
		} catch (error) {
			this.logger.error('Create saved search failed', {
				userId: req.user.id,
				name: req.body.name,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to create saved search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSavedSearches(req) {
		this.logger.debug('Get saved searches requested', {
			userId: req.user.id,
			includePublic: req.query.includePublic,
			pinnedOnly: req.query.pinnedOnly,
			limit: req.query.limit,
		});
		try {
			const result = await this.savedSearchService.getSavedSearches(req.user, req.query);
			this.logger.debug('Saved searches retrieved successfully', {
				userId: req.user.id,
				count: result.searches.length,
				totalCount: result.pagination?.total || 0,
			});
			return result;
		} catch (error) {
			this.logger.error('Get saved searches failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to get saved searches: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSavedSearchById(req) {
		this.logger.debug('Get saved search by ID requested', {
			userId: req.user.id,
			savedSearchId: req.params.id,
		});
		try {
			const result = await this.savedSearchService.getSavedSearch(req.params.id, req.user);
			this.logger.debug('Saved search retrieved successfully', {
				userId: req.user.id,
				savedSearchId: req.params.id,
			});
			return result;
		} catch (error) {
			this.logger.error('Get saved search failed', {
				userId: req.user.id,
				savedSearchId: req.params.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to get saved search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async updateSavedSearch(req) {
		this.logger.debug('Update saved search requested', {
			userId: req.user.id,
			savedSearchId: req.params.id,
		});
		try {
			const result = await this.savedSearchService.updateSavedSearch(
				req.params.id,
				req.body,
				req.user,
			);
			this.logger.debug('Saved search updated successfully', {
				userId: req.user.id,
				savedSearchId: req.params.id,
			});
			return result;
		} catch (error) {
			this.logger.error('Update saved search failed', {
				userId: req.user.id,
				savedSearchId: req.params.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to update saved search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async deleteSavedSearch(req) {
		this.logger.debug('Delete saved search requested', {
			userId: req.user.id,
			savedSearchId: req.params.id,
		});
		try {
			await this.savedSearchService.deleteSavedSearch(req.params.id, req.user);
			this.logger.debug('Saved search deleted successfully', {
				userId: req.user.id,
				savedSearchId: req.params.id,
			});
			return { success: true };
		} catch (error) {
			this.logger.error('Delete saved search failed', {
				userId: req.user.id,
				savedSearchId: req.params.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to delete saved search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async executeSavedSearch(req) {
		this.logger.debug('Execute saved search requested', {
			userId: req.user.id,
			savedSearchId: req.params.id,
		});
		try {
			const savedSearch = await this.savedSearchService.getSavedSearch(req.params.id, req.user);
			const result = await this.workflowSearchService.searchWorkflows(savedSearch.query, req.user);
			await this.savedSearchService.updateExecutionStats(req.params.id, req.user, {
				resultsCount: result.results.length,
			});
			try {
				const { SearchAnalyticsService } = await Promise.resolve().then(() =>
					__importStar(require('@/services/search-analytics.service')),
				);
				const searchAnalyticsService = di_1.Container.get(SearchAnalyticsService);
				await searchAnalyticsService.recordSearchQuery({
					query: `saved_search:${savedSearch.name}`,
					userId: req.user.id,
					searchTimeMs: result.metadata.searchTimeMs,
					resultCount: result.results.length,
					searchMethod: result.metadata.searchEngine?.used ? 'search_engine' : 'database',
					searchEngine: result.metadata.searchEngine?.name,
					filters: { saved_search_id: req.params.id, ...result.query.appliedFilters },
					timestamp: new Date(),
					userAgent: req.headers['user-agent'],
					sessionId: req.sessionID,
				});
			} catch (analyticsError) {
				this.logger.warn('Failed to record saved search analytics', {
					savedSearchId: req.params.id,
					error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
				});
			}
			this.logger.debug('Saved search executed successfully', {
				userId: req.user.id,
				savedSearchId: req.params.id,
				resultsCount: result.results.length,
			});
			return result;
		} catch (error) {
			this.logger.error('Execute saved search failed', {
				userId: req.user.id,
				savedSearchId: req.params.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to execute saved search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getSavedSearchStats(req) {
		this.logger.debug('Get saved search stats requested', {
			userId: req.user.id,
		});
		try {
			const result = await this.savedSearchService.getSavedSearchStats(req.user);
			this.logger.debug('Saved search stats retrieved successfully', {
				userId: req.user.id,
				totalSavedSearches: result.totalSavedSearches,
			});
			return result;
		} catch (error) {
			this.logger.error('Get saved search stats failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError(
				`Failed to get saved search stats: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	validateSearchQuery(query) {
		const validatedQuery = {
			query: query.query ? String(query.query).trim() : undefined,
			searchIn: Array.isArray(query.searchIn)
				? query.searchIn
				: query.searchIn
					? [query.searchIn]
					: ['all'],
			active: query.active !== undefined ? Boolean(query.active) : undefined,
			tags: Array.isArray(query.tags) ? query.tags : query.tags ? [query.tags] : undefined,
			nodeTypes: Array.isArray(query.nodeTypes)
				? query.nodeTypes
				: query.nodeTypes
					? [query.nodeTypes]
					: undefined,
			projectId: query.projectId ? String(query.projectId) : undefined,
			folderId: query.folderId ? String(query.folderId) : undefined,
			isArchived: query.isArchived !== undefined ? Boolean(query.isArchived) : undefined,
			createdAfter: query.createdAfter ? String(query.createdAfter) : undefined,
			createdBefore: query.createdBefore ? String(query.createdBefore) : undefined,
			updatedAfter: query.updatedAfter ? String(query.updatedAfter) : undefined,
			updatedBefore: query.updatedBefore ? String(query.updatedBefore) : undefined,
			hasWebhooks: query.hasWebhooks !== undefined ? Boolean(query.hasWebhooks) : undefined,
			hasCronTriggers:
				query.hasCronTriggers !== undefined ? Boolean(query.hasCronTriggers) : undefined,
			fuzzySearch: query.fuzzySearch !== undefined ? Boolean(query.fuzzySearch) : false,
			caseSensitive: query.caseSensitive !== undefined ? Boolean(query.caseSensitive) : false,
			exactMatch: query.exactMatch !== undefined ? Boolean(query.exactMatch) : false,
			executionCount: query.executionCount
				? {
						min: query.executionCount.min ? Number(query.executionCount.min) : undefined,
						max: query.executionCount.max ? Number(query.executionCount.max) : undefined,
					}
				: undefined,
			sortBy: query.sortBy || 'relevance',
			sortOrder: query.sortOrder || 'desc',
			page: query.page ? Math.max(1, Number(query.page)) : 1,
			limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20,
			includeContent: query.includeContent !== undefined ? Boolean(query.includeContent) : false,
			includeStats: query.includeStats !== undefined ? Boolean(query.includeStats) : false,
			includeHighlights:
				query.includeHighlights !== undefined ? Boolean(query.includeHighlights) : true,
		};
		const validSearchInValues = ['name', 'description', 'nodes', 'tags', 'all'];
		validatedQuery.searchIn = validatedQuery.searchIn?.filter((value) =>
			validSearchInValues.includes(value),
		) || ['all'];
		const validSortValues = ['name', 'createdAt', 'updatedAt', 'relevance', 'executionCount'];
		if (!validSortValues.includes(validatedQuery.sortBy)) {
			validatedQuery.sortBy = 'relevance';
		}
		if (!['asc', 'desc'].includes(validatedQuery.sortOrder)) {
			validatedQuery.sortOrder = 'desc';
		}
		return validatedQuery;
	}
	async enterpriseBatchProcess(req) {
		const { operations, priority = 'normal', scheduledFor, webhook } = req.body;
		const startTime = Date.now();
		this.logger.debug('Enterprise batch processing requested', {
			userId: req.user.id,
			operationCount: operations.length,
			priority,
			scheduledFor,
			totalWorkflows: operations.reduce((sum, op) => sum + op.workflowIds.length, 0),
		});
		try {
			const result = await this.batchProcessingService.queueBatchOperation(req.user, {
				operations,
				priority,
				scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
				webhook,
			});
			this.logger.info('Enterprise batch job created', {
				userId: req.user.id,
				batchId: result.batchId,
				operationCount: operations.length,
				priority,
				processingTimeMs: Date.now() - startTime,
			});
			return result;
		} catch (error) {
			this.logger.error('Enterprise batch processing failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
				operationCount: operations.length,
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getBatchStatus(req, _res, batchId) {
		this.logger.debug('Batch status requested', {
			userId: req.user.id,
			batchId,
		});
		try {
			const status = await this.batchProcessingService.getBatchStatus(batchId);
			if (!status) {
				throw new not_found_error_1.NotFoundError(`Batch operation with ID "${batchId}" not found`);
			}
			return status;
		} catch (error) {
			this.logger.error('Failed to get batch status', {
				userId: req.user.id,
				batchId,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get batch status: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getExpressionCategories(req, _res) {
		this.logger.debug('Expression categories requested', {
			userId: req.user.id,
		});
		try {
			const categories = this.expressionDocsService.getCategories();
			const convertedCategories = categories.map((category) =>
				this.convertToExpressionCategoryDto(category),
			);
			return {
				categories: convertedCategories,
				total: convertedCategories.length,
			};
		} catch (error) {
			this.logger.error('Failed to get expression categories', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new internal_server_error_1.InternalServerError(
				`Failed to get expression categories: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getExpressionFunctions(req, _res, category, queryDto) {
		this.logger.debug('Expression functions requested', {
			userId: req.user.id,
			category,
			search: queryDto.search,
		});
		try {
			let functions = this.expressionDocsService.getFunctionsByCategory(category);
			if (queryDto.search) {
				const searchTerm = queryDto.search.toLowerCase();
				functions = functions.filter(
					(func) =>
						func.name.toLowerCase().includes(searchTerm) ||
						func.description?.toLowerCase().includes(searchTerm) ||
						func.aliases?.some((alias) => alias.toLowerCase().includes(searchTerm)),
				);
			}
			const convertedFunctions = functions.map((func) => this.convertToExpressionFunctionDto(func));
			return {
				functions: convertedFunctions,
				category,
				total: functions.length,
			};
		} catch (error) {
			this.logger.error('Failed to get expression functions', {
				userId: req.user.id,
				category,
				search: queryDto.search,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new internal_server_error_1.InternalServerError(
				`Failed to get expression functions: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getExpressionVariables(req, _res, queryDto) {
		this.logger.debug('Expression variables requested', {
			userId: req.user.id,
			context: queryDto.context,
		});
		try {
			const variables = this.expressionDocsService.getContextVariables(queryDto.context);
			const convertedVariables = variables.map((variable) =>
				this.convertToExpressionVariableDto(variable),
			);
			return {
				variables: convertedVariables,
				context: queryDto.context,
				total: convertedVariables.length,
			};
		} catch (error) {
			this.logger.error('Failed to get expression variables', {
				userId: req.user.id,
				context: queryDto.context,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new internal_server_error_1.InternalServerError(
				`Failed to get expression variables: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async suggestConnections(req, _res, workflowId) {
		const { currentNodeId, contextType = 'general' } = req.body;
		this.logger.debug('AI connection suggestions requested', {
			userId: req.user.id,
			workflowId,
			currentNodeId,
			contextType,
		});
		try {
			const workflow = await this.workflowFinderService.findForUser(req.user, workflowId, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError('Workflow not found');
			}
			const workflowData = {
				nodes: workflow.nodes,
				connections: workflow.connections,
			};
			const suggestions = await this.aiHelpersService.suggestNodes(workflowData, req.user, {
				currentNodeId,
				contextType,
			});
			return {
				success: true,
				workflowId,
				suggestions,
				metadata: {
					contextType,
					currentNodeId,
					suggestedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to generate connection suggestions', {
				userId: req.user.id,
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Connection suggestions failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getOptimizationSuggestions(req, _res, workflowId, queryDto) {
		const { optimizationType = 'all' } = queryDto;
		this.logger.debug('AI optimization suggestions requested', {
			userId: req.user.id,
			workflowId,
			optimizationType,
		});
		try {
			const workflow = await this.workflowFinderService.findForUser(req.user, workflowId, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new not_found_error_1.NotFoundError('Workflow not found');
			}
			const workflowData = {
				nodes: workflow.nodes,
				connections: workflow.connections,
			};
			const optimization = await this.aiHelpersService.optimizeWorkflow(workflowData, req.user, {
				optimizationType,
			});
			return {
				success: true,
				workflowId,
				optimization,
				metadata: {
					originalNodeCount: workflow.nodes.length,
					optimizationType,
					optimizedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to generate optimization suggestions', {
				userId: req.user.id,
				workflowId,
				optimizationType,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Optimization suggestions failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
};
exports.WorkflowsController = WorkflowsController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'create',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/', { middlewares: middlewares_1.listQueryMiddleware }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getAll',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/new'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getNewName',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/from-url'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.ImportWorkflowFromUrlDto]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getFromUrl',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getWorkflow',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:workflowId'),
		(0, decorators_1.ProjectScope)('workflow:update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'update',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:workflowId'),
		(0, decorators_1.ProjectScope)('workflow:delete'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, String]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'delete',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/archive'),
		(0, decorators_1.ProjectScope)('workflow:delete'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, String]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'archive',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/unarchive'),
		(0, decorators_1.ProjectScope)('workflow:delete'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, String]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'unarchive',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/run'),
		(0, decorators_1.ProjectScope)('workflow:execute'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.ManualRunQueryDto]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'runManually',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/execute-partial'),
		(0, decorators_1.ProjectScope)('workflow:execute'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'executePartial',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:sharing'),
		(0, decorators_1.Put)('/:workflowId/share'),
		(0, decorators_1.ProjectScope)('workflow:share'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'share',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/:workflowId/transfer'),
		(0, decorators_1.ProjectScope)('workflow:move'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, api_types_1.TransferWorkflowBodyDto]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'transfer',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/with-node-types'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getWorkflowsWithNodesIncluded',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/variables'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getAvailableVariables',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/functions'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getAvailableFunctions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/variables'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getVariableDocumentation',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/syntax'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getExpressionSyntaxDocumentation',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/help/:nodeType'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getContextualHelp',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/context/search'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'searchDocumentation',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/context'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getWorkflowExecutionContext',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/variables'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getWorkflowVariables',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/functions'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getWorkflowFunctions',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/activate'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'bulkActivate',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/deactivate'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'bulkDeactivate',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'bulkUpdate',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'searchWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search/advanced'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'advancedSearchWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/suggestions'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSearchSuggestions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/facets'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSearchFacets',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/analytics'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSearchAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/analytics/popular-queries'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getPopularSearchQueries',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/health'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSearchEngineHealth',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search/reindex'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'triggerReindexing',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search/saved'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'createSavedSearch',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/saved'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSavedSearches',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/saved/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSavedSearchById',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/search/saved/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'updateSavedSearch',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/search/saved/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'deleteSavedSearch',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search/saved/:id/execute'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'executeSavedSearch',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/search/saved/stats'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getSavedSearchStats',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)(constants_1.LICENSE_FEATURES.ENTERPRISE),
		(0, decorators_1.Post)('/batch/process'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'enterpriseBatchProcess',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)(constants_1.LICENSE_FEATURES.ENTERPRISE),
		(0, decorators_1.Get)('/batch/:batchId/status'),
		__param(2, (0, decorators_1.Param)('batchId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getBatchStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/expressions/categories'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getExpressionCategories',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/expressions/functions/:category'),
		__param(2, (0, decorators_1.Param)('category')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getExpressionFunctions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/expressions/variables/context'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getExpressionVariables',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/suggest-connections'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'suggestConnections',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/optimization-suggestions'),
		(0, decorators_1.ProjectScope)('workflow:read'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowsController.prototype,
	'getOptimizationSuggestions',
	null,
);
exports.WorkflowsController = WorkflowsController = __decorate(
	[
		(0, decorators_1.RestController)('/workflows'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			external_hooks_1.ExternalHooks,
			db_1.TagRepository,
			workflow_service_ee_1.EnterpriseWorkflowService,
			workflow_history_service_ee_1.WorkflowHistoryService,
			tag_service_1.TagService,
			naming_service_1.NamingService,
			db_1.WorkflowRepository,
			workflow_service_1.WorkflowService,
			workflow_execution_service_1.WorkflowExecutionService,
			db_1.SharedWorkflowRepository,
			license_1.License,
			email_1.UserManagementMailer,
			credentials_service_1.CredentialsService,
			db_1.ProjectRepository,
			project_service_ee_1.ProjectService,
			db_1.ProjectRelationRepository,
			event_service_1.EventService,
			config_1.GlobalConfig,
			folder_service_1.FolderService,
			workflow_finder_service_1.WorkflowFinderService,
			node_types_1.NodeTypes,
			active_workflow_manager_1.ActiveWorkflowManager,
			batch_processing_service_1.BatchProcessingService,
			workflow_search_service_1.WorkflowSearchService,
			saved_search_service_1.SavedSearchService,
			expression_docs_service_1.ExpressionDocsService,
			ai_helpers_service_1.AiHelpersService,
		]),
	],
	WorkflowsController,
);
//# sourceMappingURL=workflows.controller.js.map
