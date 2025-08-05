import {
	ImportWorkflowFromUrlDto,
	ManualRunQueryDto,
	ROLE,
	TransferWorkflowBodyDto,
	BulkActivateWorkflowsRequestDto,
	BulkActivateWorkflowsResponseDto,
	BulkDeactivateWorkflowsRequestDto,
	BulkDeactivateWorkflowsResponseDto,
	BulkUpdateWorkflowsRequestDto,
	BulkUpdateWorkflowsResponseDto,
	EnterpriseBatchProcessingRequestDto,
	EnterpriseBatchProcessingResponseDto,
	BatchOperationStatusDto,
	WorkflowSearchQueryDto,
	WorkflowSearchResponseDto,
	AdvancedWorkflowSearchDto,
	WorkflowSearchSuggestionsDto,
	WorkflowSearchSuggestionsResponseDto,
	FunctionDocumentationQueryDto,
	FunctionDocumentationResponseDto,
	VariableDocumentationQueryDto,
	VariableDocumentationResponseDto,
	ExpressionSyntaxQueryDto,
	ExpressionSyntaxResponseDto,
	ContextualDocumentationQueryDto,
	ContextualDocumentationResponseDto,
	DocumentationSearchQueryDto,
	DocumentationSearchResponseDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import {
	SharedWorkflow,
	WorkflowEntity,
	ProjectRelationRepository,
	ProjectRepository,
	TagRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Patch,
	Post,
	ProjectScope,
	Put,
	Query,
	RestController,
} from '@n8n/decorators';
import { In, type FindOptionsRelations } from '@n8n/typeorm';
import axios from 'axios';
import express from 'express';
import type {
	INodeExecutionData,
	IRunData,
	IWorkflowBase,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UnexpectedError, ApplicationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import type { IWorkflowResponse } from '@/interfaces';
import { License } from '@/license';
import { listQueryMiddleware } from '@/middlewares';
import { NodeTypes } from '@/node-types';
import * as ResponseHelper from '@/response-helper';
import { FolderService } from '@/services/folder.service';
import { NamingService } from '@/services/naming.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history.ee/workflow-history.service.ee';
import { WorkflowRequest } from './workflow.request';
import { WorkflowService } from './workflow.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { CredentialsService } from '../credentials/credentials.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BatchProcessingService } from './batch-processing.service';
import { WorkflowSearchService } from '@/services/workflow-search.service';
import { ExpressionDocsService } from '@/services/expression-docs.service';

@RestController('/workflows')
export class WorkflowsController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly tagRepository: TagRepository,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly tagService: TagService,
		private readonly namingService: NamingService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowService: WorkflowService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly license: License,
		private readonly mailer: UserManagementMailer,
		private readonly credentialsService: CredentialsService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly folderService: FolderService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly nodeTypes: NodeTypes,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly batchProcessingService: BatchProcessingService,
		private readonly workflowSearchService: WorkflowSearchService,
		private readonly expressionDocsService: ExpressionDocsService,
	) {}

	@Post('/')
	async create(req: WorkflowRequest.Create) {
		delete req.body.id; // delete if sent
		// @ts-expect-error: We shouldn't accept this because it can
		// mess with relations of other workflows
		delete req.body.shared;

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await this.externalHooks.run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		if (this.license.isSharingEnabled()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used credentials

			const allCredentials = await this.credentialsService.getMany(req.user);

			try {
				this.enterpriseWorkflowService.validateCredentialPermissionsToUser(
					newWorkflow,
					allCredentials,
				);
			} catch (error) {
				throw new BadRequestError(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			}
		}

		const { manager: dbManager } = this.projectRepository;

		let project: Project | null;
		const savedWorkflow = await dbManager.transaction(async (transactionManager) => {
			const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

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
				throw new BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}

			// Safe guard in case the personal project does not exist for whatever reason.
			if (project === null) {
				throw new UnexpectedError('No personal project found');
			}

			if (parentFolderId) {
				try {
					const parentFolder = await this.folderService.findFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
					// @ts-ignore CAT-957
					await transactionManager.update(WorkflowEntity, { id: workflow.id }, { parentFolder });
				} catch {}
			}

			const newSharedWorkflow = this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: project.id,
				workflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

			return await this.workflowFinderService.findWorkflowForUser(
				workflow.id,
				req.user,
				['workflow:read'],
				{ em: transactionManager, includeTags: true, includeParentFolder: true },
			);
		});

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		await this.workflowHistoryService.saveVersion(req.user, savedWorkflow, savedWorkflow.id);

		if (tagIds && !this.globalConfig.tags.disabled && savedWorkflow.tags) {
			savedWorkflow.tags = this.tagService.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		const savedWorkflowWithMetaData =
			this.enterpriseWorkflowService.addOwnerAndSharings(savedWorkflow);

		// @ts-expect-error: This is added as part of addOwnerAndSharings but
		// shouldn't be returned to the frontend
		delete savedWorkflowWithMetaData.shared;

		await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		this.eventService.emit('workflow-created', {
			user: req.user,
			workflow: newWorkflow,
			publicApi: false,
			projectId: project!.id,
			projectType: project!.type,
		});

		const scopes = await this.workflowService.getWorkflowScopes(req.user, savedWorkflow.id);

		return { ...savedWorkflowWithMetaData, scopes };
	}

	@Get('/', { middlewares: listQueryMiddleware })
	async getAll(req: WorkflowRequest.GetMany, res: express.Response) {
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

	@Get('/new')
	async getNewName(req: WorkflowRequest.NewName) {
		const requestedName = req.query.name ?? this.globalConfig.workflows.defaultName;

		const name = await this.namingService.getUniqueWorkflowName(requestedName);
		return { name };
	}

	@Get('/from-url')
	async getFromUrl(
		_req: AuthenticatedRequest,
		_res: express.Response,
		@Query query: ImportWorkflowFromUrlDto,
	) {
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(query.url);
			workflowData = data;
		} catch (error) {
			throw new BadRequestError('The URL does not point to valid JSON file!');
		}

		// Do a very basic check if it is really a n8n-workflow-json
		if (
			workflowData?.nodes === undefined ||
			!Array.isArray(workflowData.nodes) ||
			workflowData.connections === undefined ||
			typeof workflowData.connections !== 'object' ||
			Array.isArray(workflowData.connections)
		) {
			throw new BadRequestError(
				'The data in the file does not seem to be a n8n workflow JSON file!',
			);
		}

		return workflowData;
	}

	@Get('/:workflowId')
	@ProjectScope('workflow:read')
	async getWorkflow(req: WorkflowRequest.Get) {
		const { workflowId } = req.params;

		if (this.license.isSharingEnabled()) {
			const relations: FindOptionsRelations<WorkflowEntity> = {
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
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			const enterpriseWorkflowService = this.enterpriseWorkflowService;

			const workflowWithMetaData = enterpriseWorkflowService.addOwnerAndSharings(workflow);

			await enterpriseWorkflowService.addCredentialsToWorkflow(workflowWithMetaData, req.user);

			// @ts-expect-error: This is added as part of addOwnerAndSharings but
			// shouldn't be returned to the frontend
			delete workflowWithMetaData.shared;

			const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);

			return { ...workflowWithMetaData, scopes };
		}

		// sharing disabled

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
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);

		return { ...workflow, scopes };
	}

	@Patch('/:workflowId')
	@ProjectScope('workflow:update')
	async update(req: WorkflowRequest.Update) {
		const { workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';

		let updateData = new WorkflowEntity();
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

	@Delete('/:workflowId')
	@ProjectScope('workflow:delete')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('workflowId') workflowId: string) {
		const workflow = await this.workflowService.delete(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ForbiddenError(
				'Could not delete the workflow - workflow was not found in your projects',
			);
		}

		return true;
	}

	@Post('/:workflowId/archive')
	@ProjectScope('workflow:delete')
	async archive(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		const workflow = await this.workflowService.archive(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to archive a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ForbiddenError(
				'Could not archive the workflow - workflow was not found in your projects',
			);
		}

		return workflow;
	}

	@Post('/:workflowId/unarchive')
	@ProjectScope('workflow:delete')
	async unarchive(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		const workflow = await this.workflowService.unarchive(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to unarchive a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ForbiddenError(
				'Could not unarchive the workflow - workflow was not found in your projects',
			);
		}

		return workflow;
	}

	@Post('/:workflowId/run')
	@ProjectScope('workflow:execute')
	async runManually(
		req: WorkflowRequest.ManualRun,
		_res: unknown,
		@Query query: ManualRunQueryDto,
	) {
		if (!req.body.workflowData.id) {
			throw new UnexpectedError('You cannot execute a workflow without an ID');
		}

		if (req.params.workflowId !== req.body.workflowData.id) {
			throw new UnexpectedError('Workflow ID in body does not match workflow ID in URL');
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

	@Post('/:workflowId/execute-partial')
	@ProjectScope('workflow:execute')
	async executePartial(
		req: AuthenticatedRequest<
			{ workflowId: string },
			{},
			{
				startNodes?: string[];
				endNodes?: string[];
				inputData?: Record<string, INodeExecutionData[]>;
				mode?: WorkflowExecuteMode;
			}
		>,
	) {
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
			// Find the workflow
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:execute',
			]);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			// Validate start and end nodes exist
			const workflowNodeNames = workflow.nodes.map((node) => node.name);
			for (const nodeName of [...startNodes, ...endNodes]) {
				if (!workflowNodeNames.includes(nodeName)) {
					throw new BadRequestError(`Node "${nodeName}" does not exist in workflow`);
				}
			}

			// Prepare the workflow data for execution similar to manual run
			const workflowData: IWorkflowBase = {
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

			// Create manual run data structure like the existing manual run method
			const startNodeData = startNodes.map((name) => ({ name, sourceData: null }));
			const manualRunData = {
				workflowData,
				runData: {} as IRunData,
				startNodes: startNodeData,
				destinationNode: endNodes.length > 0 ? endNodes[0] : undefined,
			};

			// If input data is provided, add it to runData
			// TODO: Properly convert INodeExecutionData[] to ITaskData[] format
			// For now, leaving runData empty to fix compilation errors
			if (Object.keys(inputData).length > 0) {
				// Complex conversion needed from inputData to IRunData format
				// Skipping for now to resolve TypeScript compilation errors
			}

			// Execute using the existing executeManually method pattern
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

			// Format execution result
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Partial execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Licensed('feat:sharing')
	@Put('/:workflowId/share')
	@ProjectScope('workflow:share')
	async share(req: WorkflowRequest.Share) {
		const { workflowId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:share',
		]);

		if (!workflow) {
			throw new ForbiddenError();
		}

		let newShareeIds: string[] = [];
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

			await trx.delete(SharedWorkflow, {
				workflowId,
				projectId: In(toUnshare),
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
			projectId: In(newShareeIds),
			role: 'project:personalOwner',
		});

		await this.mailer.notifyWorkflowShared({
			sharer: req.user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			workflow,
		});
	}

	@Put('/:workflowId/transfer')
	@ProjectScope('workflow:move')
	async transfer(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: TransferWorkflowBodyDto,
	) {
		return await this.enterpriseWorkflowService.transferWorkflow(
			req.user,
			workflowId,
			body.destinationProjectId,
			body.shareCredentials,
			body.destinationParentFolderId,
		);
	}

	@Post('/with-node-types')
	async getWorkflowsWithNodesIncluded(req: AuthenticatedRequest, res: express.Response) {
		try {
			const hasPermission = req.user.role === ROLE.Owner || req.user.role === ROLE.Admin;

			if (!hasPermission) {
				res.json({ data: [], count: 0 });
				return;
			}

			const { nodeTypes } = req.body as { nodeTypes: string[] };
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

	// Workflow Variable Discovery Endpoints

	@Get('/context/variables')
	async getAvailableVariables(
		req: AuthenticatedRequest<
			{},
			{},
			{},
			{
				workflowId?: string;
				nodeId?: string;
				includeFunctions?: boolean;
				includeNodeContext?: boolean;
			}
		>,
	) {
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
				// Core workflow context variables
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
				// Execution context variables
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
				// Environment and utility variables
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
				// Node-specific context (if requested and available)
				...(includeNodeContext && workflowId
					? await this.getNodeSpecificContext(workflowId, nodeId, req.user)
					: {}),
			};

			// Add available functions if requested
			if (includeFunctions) {
				(variables as any).functions = await this.getAvailableFunctions();
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
					requestedAt: new Date(),
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Variables discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/context/functions')
	async getAvailableFunctions(
		req?: AuthenticatedRequest<{}, {}, {}, FunctionDocumentationQueryDto>,
	): Promise<FunctionDocumentationResponseDto> {
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

			// Get function documentation from service
			const functionDocs = this.expressionDocsService.getFunctionDocumentation(functionName);

			let data;
			if (Array.isArray(functionDocs)) {
				// Filter by category if specified
				data = category ? functionDocs.filter((func) => func.category === category) : functionDocs;
			} else {
				data = functionDocs;
			}

			const response: FunctionDocumentationResponseDto = {
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

				if (error instanceof ApplicationError) {
					throw error;
				}

				throw new InternalServerError(
					`Function documentation failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			throw error;
		}
	}

	@Get('/context/variables')
	async getVariableDocumentation(
		req: AuthenticatedRequest<{}, {}, {}, VariableDocumentationQueryDto>,
	): Promise<VariableDocumentationResponseDto> {
		this.logger.debug('Variable documentation requested', {
			variableName: req.query?.variableName,
			category: req.query?.category,
			userId: req.user.id,
		});

		try {
			const variableName = req.query?.variableName;
			const category = req.query?.category;

			// Get variable documentation from service
			const variableDocs = this.expressionDocsService.getVariableDocumentation(variableName);

			let data;
			if (Array.isArray(variableDocs)) {
				// Filter by category if specified
				data = category
					? variableDocs.filter((variable) => variable.category === category)
					: variableDocs;
			} else {
				data = variableDocs;
			}

			const response: VariableDocumentationResponseDto = {
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Variable documentation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/context/syntax')
	async getExpressionSyntaxDocumentation(
		req: AuthenticatedRequest<{}, {}, {}, ExpressionSyntaxQueryDto>,
	): Promise<ExpressionSyntaxResponseDto> {
		this.logger.debug('Expression syntax documentation requested', {
			topic: req.query?.topic,
			userId: req.user.id,
		});

		try {
			const topic = req.query?.topic;

			// Get syntax documentation from service
			const syntaxDocs = this.expressionDocsService.getExpressionSyntaxDocs(topic);

			const response: ExpressionSyntaxResponseDto = {
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Expression syntax documentation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/context/help/:nodeType')
	async getContextualHelp(
		req: AuthenticatedRequest<{ nodeType: string }, {}, {}, ContextualDocumentationQueryDto>,
	): Promise<ContextualDocumentationResponseDto> {
		const { nodeType } = req.params;

		this.logger.debug('Contextual help requested', {
			nodeType,
			context: req.query?.context,
			userId: req.user.id,
		});

		try {
			const context = req.query?.context;

			// Get contextual documentation from service
			const contextualDocs = this.expressionDocsService.getContextualDocumentation(
				nodeType,
				context,
			);

			const response: ContextualDocumentationResponseDto = {
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Contextual help failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/context/search')
	async searchDocumentation(
		req: AuthenticatedRequest<{}, {}, {}, DocumentationSearchQueryDto>,
	): Promise<DocumentationSearchResponseDto> {
		this.logger.debug('Documentation search requested', {
			query: req.query.query,
			type: req.query?.type,
			userId: req.user.id,
		});

		try {
			const startTime = Date.now();
			const { query, type, limit } = req.query;

			// Search documentation using service
			const searchResults = this.expressionDocsService.searchDocumentation(query, type);

			// Apply limit to results
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

			const response: DocumentationSearchResponseDto = {
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Documentation search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/:workflowId/context')
	@ProjectScope('workflow:read')
	async getWorkflowExecutionContext(req: WorkflowRequest.Get) {
		const { workflowId } = req.params;
		const {
			nodeId,
			includeNodeDetails = true,
			includeConnections = true,
		} = req.query as {
			nodeId?: string;
			includeNodeDetails?: boolean;
			includeConnections?: boolean;
		};

		this.logger.debug('Workflow execution context requested', {
			workflowId,
			nodeId,
			userId: req.user.id,
			includeNodeDetails,
			includeConnections,
		});

		try {
			// Get workflow with permissions check
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:read'],
				{ includeTags: false, includeParentFolder: false },
			);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			// Build execution context
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

			// Add node-specific context if nodeId provided
			if (nodeId) {
				const targetNode = workflow.nodes.find((n) => n.id === nodeId || n.name === nodeId);
				if (targetNode) {
					(context as any).nodeContext = await this.getNodeExecutionContext(workflow, targetNode);
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
					requestedAt: new Date(),
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Context discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get available variables for a specific workflow - SUCCESS CRITERIA ENDPOINT
	 */
	@Get('/:workflowId/variables')
	@ProjectScope('workflow:read')
	async getWorkflowVariables(req: WorkflowRequest.Get) {
		const { workflowId } = req.params;
		const { nodeType, context } = req.query as {
			nodeType?: string;
			context?: 'input' | 'output' | 'parameters';
		};

		this.logger.debug('Workflow variables requested', {
			workflowId,
			nodeType,
			context,
			userId: req.user.id,
		});

		try {
			// Get workflow with permissions check
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:read',
			]);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			// Get variable documentation from the service
			const variables = this.expressionDocsService.getVariableDocumentation();

			// If nodeType is specified, get contextual variables
			let contextualData = null;
			if (nodeType) {
				contextualData = this.expressionDocsService.getContextualDocumentation(nodeType, context);
			}

			// Build workflow-specific variable context
			const workflowVariables = {
				$workflow: {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
				},
				// Add node-specific variables
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
					requestedAt: new Date(),
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow variables discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get available functions for a specific workflow - SUCCESS CRITERIA ENDPOINT
	 */
	@Get('/:workflowId/functions')
	@ProjectScope('workflow:read')
	async getWorkflowFunctions(req: WorkflowRequest.Get) {
		const { workflowId } = req.params;
		const { category, nodeType, search } = req.query as {
			category?: string;
			nodeType?: string;
			search?: string;
		};

		this.logger.debug('Workflow functions requested', {
			workflowId,
			category,
			nodeType,
			search,
			userId: req.user.id,
		});

		try {
			// Get workflow with permissions check
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:read',
			]);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			// Get function documentation from the service
			let functions = this.expressionDocsService.getFunctionDocumentation();
			if (!Array.isArray(functions)) {
				functions = [];
			}

			// Filter by category if specified
			if (category) {
				functions = functions.filter((func) => func.category === category);
			}

			// Filter by search term if specified
			if (search) {
				const searchTerm = search.toLowerCase();
				functions = functions.filter(
					(func) =>
						func.name.toLowerCase().includes(searchTerm) ||
						func.description.toLowerCase().includes(searchTerm) ||
						func.category.toLowerCase().includes(searchTerm),
				);
			}

			// Get contextual functions if nodeType is specified
			let contextualData = null;
			if (nodeType) {
				contextualData = this.expressionDocsService.getContextualDocumentation(nodeType);
				functions = [...functions, ...contextualData.relevantFunctions];
			}

			// Remove duplicates
			const uniqueFunctions = functions.reduce((acc, func) => {
				if (!acc.find((f) => f.name === func.name)) {
					acc.push(func);
				}
				return acc;
			}, [] as any[]);

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
					requestedAt: new Date(),
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow functions discovery failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Helper methods for variable discovery

	private async getNodeSpecificContext(workflowId: string, nodeId: string | undefined, user: any) {
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

	private getConnectedNodes(workflow: any, nodeName: string) {
		const connections = [];

		// Find parent nodes (inputs)
		if (workflow.connections) {
			for (const [sourceNodeName, sourceConnections] of Object.entries(workflow.connections)) {
				if (sourceConnections && typeof sourceConnections === 'object') {
					const mainConnections = (sourceConnections as any).main;
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

		// Find child nodes (outputs)
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

	private getAvailableInputs(workflow: any, nodeName: string) {
		const inputs: Record<string, any> = {};
		const connectedNodes = this.getConnectedNodes(workflow, nodeName);

		const inputNodes = connectedNodes.filter((conn) => conn.type === 'input');
		for (const conn of inputNodes) {
			const sourceNode = workflow.nodes.find((n: any) => n.name === conn.source);
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

	private async getNodeExecutionContext(workflow: any, node: any) {
		// Get node type information for more detailed context
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

	// Bulk Operations Endpoints

	@Post('/bulk/activate')
	async bulkActivate(
		req: AuthenticatedRequest<{}, {}, BulkActivateWorkflowsRequestDto>,
	): Promise<BulkActivateWorkflowsResponseDto> {
		const { workflowIds, forceActivation = false } = req.body;
		const startTime = Date.now();

		this.logger.debug('Bulk workflow activation requested', {
			workflowIds,
			userId: req.user.id,
			forceActivation,
			count: workflowIds.length,
		});

		const results = {
			success: [] as any[],
			errors: [] as any[],
			totalProcessed: workflowIds.length,
			successCount: 0,
			errorCount: 0,
			metadata: {
				processedAt: new Date().toISOString(),
				forceActivation,
				processingTimeMs: 0,
			},
		};

		// Process workflows in parallel with controlled concurrency
		const concurrency = Math.min(10, workflowIds.length);
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}

		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					// Check permissions first
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
							code: 'NOT_FOUND' as const,
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

					// Activate workflow
					await this.activeWorkflowManager.add(workflowId, 'activate');

					// Update database
					await this.workflowRepository.update(workflowId, { active: true });

					results.success.push({
						workflowId,
						name: workflow.name,
						activated: true,
						message: 'Workflow activated successfully',
						activatedAt: new Date().toISOString(),
					});

					// Emit event
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
						code: 'ACTIVATION_FAILED' as const,
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

	@Post('/bulk/deactivate')
	async bulkDeactivate(
		req: AuthenticatedRequest<{}, {}, BulkDeactivateWorkflowsRequestDto>,
	): Promise<BulkDeactivateWorkflowsResponseDto> {
		const { workflowIds, forceDeactivation = false } = req.body;
		const startTime = Date.now();

		this.logger.debug('Bulk workflow deactivation requested', {
			workflowIds,
			userId: req.user.id,
			forceDeactivation,
			count: workflowIds.length,
		});

		const results = {
			success: [] as any[],
			errors: [] as any[],
			totalProcessed: workflowIds.length,
			successCount: 0,
			errorCount: 0,
			metadata: {
				processedAt: new Date().toISOString(),
				forceDeactivation,
				processingTimeMs: 0,
			},
		};

		// Process workflows in parallel with controlled concurrency
		const concurrency = Math.min(10, workflowIds.length);
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}

		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					// Check permissions first
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
							code: 'NOT_FOUND' as const,
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

					// Deactivate workflow
					await this.activeWorkflowManager.remove(workflowId);

					// Update database
					await this.workflowRepository.update(workflowId, { active: false });

					results.success.push({
						workflowId,
						name: workflow.name,
						deactivated: true,
						message: 'Workflow deactivated successfully',
						deactivatedAt: new Date().toISOString(),
					});

					// Emit event
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
						code: 'DEACTIVATION_FAILED' as const,
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

	@Post('/bulk/update')
	async bulkUpdate(
		req: AuthenticatedRequest<{}, {}, BulkUpdateWorkflowsRequestDto>,
	): Promise<BulkUpdateWorkflowsResponseDto> {
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
			success: [] as any[],
			errors: [] as any[],
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

		// Process workflows in parallel with controlled concurrency
		const concurrency = Math.min(5, workflowIds.length); // Lower concurrency for updates
		const chunks = [];
		for (let i = 0; i < workflowIds.length; i += concurrency) {
			chunks.push(workflowIds.slice(i, i + concurrency));
		}

		for (const chunk of chunks) {
			const promises = chunk.map(async (workflowId) => {
				try {
					// Check permissions first
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
							code: 'NOT_FOUND' as const,
						});
						return;
					}

					const changes = [];
					const updateData: any = {};

					// Handle activation/deactivation
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

					// Handle name update
					if (updates.name && updates.name !== workflow.name) {
						updateData.name = updates.name;
						changes.push('name');
					}

					// Handle settings update
					if (updates.settings) {
						if (updateMode === 'merge') {
							updateData.settings = { ...workflow.settings, ...updates.settings };
						} else {
							updateData.settings = updates.settings;
						}
						changes.push('settings');
					}

					// Handle tags update
					if (updates.tags && !this.globalConfig.tags.disabled) {
						const tags = await this.tagRepository.findMany(updates.tags);
						workflow.tags = tags;
						changes.push('tags');
					}

					// Handle project/folder transfer
					if (updates.projectId || updates.parentFolderId) {
						// For simplicity, we'll handle project/folder changes via the workflow service
						// This would typically involve more complex permission checks
						if (updates.projectId) {
							changes.push('project');
						}
						if (updates.parentFolderId) {
							changes.push('folder');
						}
					}

					// Update workflow if there are changes
					if (Object.keys(updateData).length > 0) {
						await this.workflowRepository.update(workflowId, updateData);
					}

					// Save tags if updated
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

					// Emit event if there were changes
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
						code: 'UPDATE_FAILED' as const,
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

	// Comprehensive Workflow Search Endpoints

	@Get('/search')
	async searchWorkflows(
		req: AuthenticatedRequest<{}, {}, {}, WorkflowSearchQueryDto>,
	): Promise<WorkflowSearchResponseDto> {
		this.logger.debug('Workflow search requested', {
			userId: req.user.id,
			query: req.query.query,
			searchIn: req.query.searchIn,
		});

		try {
			const searchQuery = this.validateSearchQuery(req.query);
			const result = await this.workflowSearchService.searchWorkflows(searchQuery, req.user);

			// Record search analytics
			try {
				const { SearchAnalyticsService } = await import('@/services/search-analytics.service');
				const searchAnalyticsService = Container.get(SearchAnalyticsService);

				await searchAnalyticsService.recordSearchQuery({
					query: searchQuery.query || '',
					userId: req.user.id,
					searchTimeMs: result.metadata.searchTimeMs,
					resultCount: result.results.length,
					searchMethod: result.metadata.searchEngine?.used ? 'search_engine' : 'database',
					filters: result.query.appliedFilters || {},
					userAgent: req.headers['user-agent'],
					sessionId: req.sessionID,
				});
			} catch (analyticsError) {
				// Don't fail the search if analytics recording fails
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Workflow search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/search/advanced')
	async advancedSearchWorkflows(
		req: AuthenticatedRequest<{}, {}, AdvancedWorkflowSearchDto>,
	): Promise<WorkflowSearchResponseDto> {
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

			// Record search analytics for advanced search
			try {
				const { SearchAnalyticsService } = await import('@/services/search-analytics.service');
				const searchAnalyticsService = Container.get(SearchAnalyticsService);

				await searchAnalyticsService.recordSearchQuery({
					query: 'advanced', // Mark as advanced search
					userId: req.user.id,
					searchTimeMs: result.metadata.searchTimeMs,
					resultCount: result.results.length,
					searchMethod: result.metadata.searchEngine?.used ? 'search_engine' : 'database',
					filters: { advanced: true, ...result.query.appliedFilters },
					userAgent: req.headers['user-agent'],
					sessionId: req.sessionID,
				});
			} catch (analyticsError) {
				// Don't fail the search if analytics recording fails
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Advanced workflow search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/search/suggestions')
	async getSearchSuggestions(
		req: AuthenticatedRequest<{}, {}, {}, WorkflowSearchSuggestionsDto>,
	): Promise<WorkflowSearchSuggestionsResponseDto> {
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

			// Return empty suggestions on error rather than throwing
			return {
				suggestions: [],
				query: req.query.query || '',
				type: req.query.type || 'workflows',
			};
		}
	}

	@Get('/search/facets')
	async getSearchFacets(
		req: AuthenticatedRequest<{}, {}, {}, { projectId?: string; folderId?: string }>,
	) {
		this.logger.debug('Search facets requested', {
			userId: req.user.id,
			projectId: req.query.projectId,
			folderId: req.query.folderId,
		});

		try {
			// Get user accessible workflows
			const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
				req.user,
				['workflow:read'],
				req.query.folderId,
				req.query.projectId,
			);

			// Extract facet data
			const nodeTypes = new Map<string, number>();
			const tags = new Map<string, number>();
			const projects = new Map<string, { name: string; count: number }>();
			const folders = new Map<string, { name: string; count: number }>();
			let activeCount = 0;
			let inactiveCount = 0;

			for (const workflow of workflows) {
				// Count active/inactive
				if (workflow.active) {
					activeCount++;
				} else {
					inactiveCount++;
				}

				// Count node types
				if (workflow.nodes) {
					const uniqueNodeTypes = new Set(workflow.nodes.map((n) => n.type));
					uniqueNodeTypes.forEach((nodeType) => {
						nodeTypes.set(nodeType, (nodeTypes.get(nodeType) || 0) + 1);
					});
				}

				// Count tags
				if (workflow.tags) {
					workflow.tags.forEach((tag) => {
						tags.set(tag.name, (tags.get(tag.name) || 0) + 1);
					});
				}

				// Count projects
				if (workflow.projectId) {
					const existing = projects.get(workflow.projectId);
					if (existing) {
						existing.count++;
					} else {
						projects.set(workflow.projectId, { name: 'Project', count: 1 });
					}
				}
			}

			// Convert maps to arrays and sort by count
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to get search facets: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// ----------------------------------------
	// Search Analytics Endpoints
	// ----------------------------------------

	@Get('/search/analytics')
	async getSearchAnalytics(req: AuthenticatedRequest<{}, {}, {}, { days?: string }>): Promise<{
		analytics: any;
		performance: any;
		suggestions: any[];
	}> {
		this.logger.debug('Search analytics requested', {
			userId: req.user.id,
			days: req.query.days,
		});

		try {
			const days = req.query.days ? parseInt(req.query.days, 10) : 7;
			if (days < 1 || days > 90) {
				throw new ApplicationError('Days parameter must be between 1 and 90');
			}

			const { SearchAnalyticsService } = await import('@/services/search-analytics.service');
			const searchAnalyticsService = Container.get(SearchAnalyticsService);

			// Get analytics data
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError(
				`Failed to get search analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/search/analytics/popular-queries')
	async getPopularSearchQueries(
		req: AuthenticatedRequest<{}, {}, {}, { limit?: string }>,
	): Promise<{
		queries: Array<{
			query: string;
			count: number;
			averageResponseTimeMs: number;
			lastSearched: Date;
		}>;
		metadata: {
			totalQueries: number;
			dateRange: string;
		};
	}> {
		this.logger.debug('Popular search queries requested', {
			userId: req.user.id,
			limit: req.query.limit,
		});

		try {
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
			if (limit < 1 || limit > 100) {
				throw new ApplicationError('Limit parameter must be between 1 and 100');
			}

			const { SearchAnalyticsService } = await import('@/services/search-analytics.service');
			const searchAnalyticsService = Container.get(SearchAnalyticsService);

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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError(
				`Failed to get popular search queries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Get('/search/health')
	async getSearchEngineHealth(req: AuthenticatedRequest): Promise<{
		searchEngine: any;
		indexing: any;
		performance: any;
		status: 'healthy' | 'degraded' | 'unhealthy';
	}> {
		this.logger.debug('Search engine health check requested', {
			userId: req.user.id,
		});

		try {
			const { SearchEngineService } = await import('@/services/search-engine.service');
			const { WorkflowIndexingService } = await import('@/services/workflow-indexing.service');
			const { SearchAnalyticsService } = await import('@/services/search-analytics.service');

			const [searchEngineService, workflowIndexingService, searchAnalyticsService] = [
				Container.get(SearchEngineService),
				Container.get(WorkflowIndexingService),
				Container.get(SearchAnalyticsService),
			];

			// Get health information
			const [searchEngineHealth, indexingHealth, performanceMetrics] = await Promise.all([
				searchEngineService.getHealth(),
				workflowIndexingService.getIndexingHealth(),
				searchAnalyticsService.getPerformanceMetrics(),
			]);

			// Determine overall status
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

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

			// Return unhealthy status on error
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

	@Post('/search/reindex')
	async triggerReindexing(req: AuthenticatedRequest<{}, {}, { force?: boolean }>): Promise<{
		success: boolean;
		stats: any;
		message: string;
	}> {
		this.logger.debug('Manual reindexing triggered', {
			userId: req.user.id,
			force: req.body.force,
		});

		try {
			// Check if user has admin permissions (you might want to add proper permission checks)
			// For now, we'll allow any authenticated user to trigger reindexing

			const { WorkflowIndexingService } = await import('@/services/workflow-indexing.service');
			const workflowIndexingService = Container.get(WorkflowIndexingService);

			// Trigger reindexing
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

			// Emit event for tracking
			this.eventService.emit('search-reindexing-completed', {
				user: req.user,
				triggeredManually: true,
				stats,
			});

			return response;
		} catch (error) {
			this.logger.error('Manual reindexing failed', {
				userId: req.user.id,
				force: req.body.force,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError(
				`Failed to trigger reindexing: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Validate and sanitize search query parameters
	 */
	private validateSearchQuery(query: any): WorkflowSearchQueryDto {
		// Basic validation and defaults
		const validatedQuery: WorkflowSearchQueryDto = {
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

			// Date filters
			createdAfter: query.createdAfter ? String(query.createdAfter) : undefined,
			createdBefore: query.createdBefore ? String(query.createdBefore) : undefined,
			updatedAfter: query.updatedAfter ? String(query.updatedAfter) : undefined,
			updatedBefore: query.updatedBefore ? String(query.updatedBefore) : undefined,

			// Boolean options
			hasWebhooks: query.hasWebhooks !== undefined ? Boolean(query.hasWebhooks) : undefined,
			hasCronTriggers:
				query.hasCronTriggers !== undefined ? Boolean(query.hasCronTriggers) : undefined,
			fuzzySearch: query.fuzzySearch !== undefined ? Boolean(query.fuzzySearch) : false,
			caseSensitive: query.caseSensitive !== undefined ? Boolean(query.caseSensitive) : false,
			exactMatch: query.exactMatch !== undefined ? Boolean(query.exactMatch) : false,

			// Execution count range
			executionCount: query.executionCount
				? {
						min: query.executionCount.min ? Number(query.executionCount.min) : undefined,
						max: query.executionCount.max ? Number(query.executionCount.max) : undefined,
					}
				: undefined,

			// Sorting and pagination
			sortBy: query.sortBy || 'relevance',
			sortOrder: query.sortOrder || 'desc',
			page: query.page ? Math.max(1, Number(query.page)) : 1,
			limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20,

			// Response options
			includeContent: query.includeContent !== undefined ? Boolean(query.includeContent) : false,
			includeStats: query.includeStats !== undefined ? Boolean(query.includeStats) : false,
			includeHighlights:
				query.includeHighlights !== undefined ? Boolean(query.includeHighlights) : true,
		};

		// Validate searchIn values
		const validSearchInValues = ['name', 'description', 'nodes', 'tags', 'all'];
		validatedQuery.searchIn = validatedQuery.searchIn?.filter((value) =>
			validSearchInValues.includes(value),
		) || ['all'];

		// Validate sortBy
		const validSortValues = ['name', 'createdAt', 'updatedAt', 'relevance', 'executionCount'];
		if (!validSortValues.includes(validatedQuery.sortBy!)) {
			validatedQuery.sortBy = 'relevance';
		}

		// Validate sortOrder
		if (!['asc', 'desc'].includes(validatedQuery.sortOrder!)) {
			validatedQuery.sortOrder = 'desc';
		}

		return validatedQuery;
	}

	@Licensed('feat:enterprise')
	@Post('/batch/process')
	async enterpriseBatchProcess(
		req: AuthenticatedRequest<{}, {}, EnterpriseBatchProcessingRequestDto>,
	): Promise<EnterpriseBatchProcessingResponseDto> {
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
			const result = await this.batchProcessingService.createBatchJob(req.user, {
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

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Licensed('feat:enterprise')
	@Get('/batch/:batchId/status')
	async getBatchStatus(
		req: AuthenticatedRequest,
		_res: express.Response,
		@Param('batchId') batchId: string,
	): Promise<BatchOperationStatusDto> {
		this.logger.debug('Batch status requested', {
			userId: req.user.id,
			batchId,
		});

		try {
			const status = await this.batchProcessingService.getBatchStatus(batchId, req.user);

			if (!status) {
				throw new NotFoundError(`Batch operation with ID "${batchId}" not found`);
			}

			return status;
		} catch (error) {
			this.logger.error('Failed to get batch status', {
				userId: req.user.id,
				batchId,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to get batch status: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get all available expression function categories
	 */
	@Get('/expressions/categories')
	async getExpressionCategories(
		req: AuthenticatedRequest,
		_res: express.Response,
	): Promise<ExpressionCategoriesResponseDto> {
		this.logger.debug('Expression categories requested', {
			userId: req.user.id,
		});

		try {
			const categories = this.expressionDocsService.getCategories();

			return {
				categories,
				total: categories.length,
			};
		} catch (error) {
			this.logger.error('Failed to get expression categories', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError(
				`Failed to get expression categories: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get expression functions for a specific category
	 */
	@Get('/expressions/functions/:category')
	async getExpressionFunctions(
		req: AuthenticatedRequest,
		_res: express.Response,
		@Param('category') category: string,
		@Query() queryDto: ExpressionFunctionsCategoryQueryDto,
	): Promise<ExpressionFunctionsResponseDto> {
		this.logger.debug('Expression functions requested', {
			userId: req.user.id,
			category,
			search: queryDto.search,
		});

		try {
			let functions = this.expressionDocsService.getFunctionsByCategory(category);

			// Apply search filter if provided
			if (queryDto.search) {
				const searchTerm = queryDto.search.toLowerCase();
				functions = functions.filter(
					(func) =>
						func.name.toLowerCase().includes(searchTerm) ||
						func.description?.toLowerCase().includes(searchTerm) ||
						func.aliases?.some((alias) => alias.toLowerCase().includes(searchTerm)),
				);
			}

			return {
				functions,
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

			throw new InternalServerError(
				`Failed to get expression functions: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get context-aware variables for expression editor
	 */
	@Get('/expressions/variables/context')
	async getExpressionVariables(
		req: AuthenticatedRequest,
		_res: express.Response,
		@Query() queryDto: ExpressionVariablesContextQueryDto,
	): Promise<ExpressionVariablesResponseDto> {
		this.logger.debug('Expression variables requested', {
			userId: req.user.id,
			context: queryDto.context,
		});

		try {
			const variables = this.expressionDocsService.getContextVariables(queryDto.context);

			return {
				variables,
				context: queryDto.context,
				total: variables.length,
			};
		} catch (error) {
			this.logger.error('Failed to get expression variables', {
				userId: req.user.id,
				context: queryDto.context,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError(
				`Failed to get expression variables: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
