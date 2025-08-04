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
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
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
		]),
	],
	WorkflowsController,
);
//# sourceMappingURL=workflows.controller.js.map
