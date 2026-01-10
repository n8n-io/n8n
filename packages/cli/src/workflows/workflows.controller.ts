import {
	ActivateWorkflowDto,
	CreateWorkflowDto,
	ExportWorkflowQueryDto,
	ImportWorkflowFromUrlDto,
	ROLE,
	TransferWorkflowBodyDto,
	UpdateWorkflowDto,
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
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type FindOptionsRelations } from '@n8n/typeorm';
import axios from 'axios';
import express, { type Response } from 'express';
import { readFile, unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { UnexpectedError, calculateWorkflowChecksum } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import multer from 'multer';

import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';
import { WorkflowRequest } from './workflow.request';
import { WorkflowService } from './workflow.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { CredentialsService } from '../credentials/credentials.service';
import { DataTableExportService } from '../modules/data-table/data-table-export.service';
import { DataTableImportService } from '../modules/data-table/data-table-import.service';
import type { AuthenticatedRequestWithFile } from '../modules/data-table/types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import type { IWorkflowResponse } from '@/interfaces';
import { License } from '@/license';
import { listQueryMiddleware } from '@/middlewares';
import { userHasScopes } from '@/permissions.ee/check-access';
import * as ResponseHelper from '@/response-helper';
import { FolderService } from '@/services/folder.service';
import { NamingService } from '@/services/naming.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';
import * as WorkflowHelpers from '@/workflow-helpers';

// Create multer configuration for workflow imports (JSON and ZIP files)
const workflowImportUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB limit
	},
	fileFilter: (_req, file, done) => {
		const allowedMimeTypes = [
			'application/json',
			'application/zip',
			'application/x-zip-compressed',
		];
		if (allowedMimeTypes.includes(file.mimetype)) {
			done(null, true);
		} else {
			done(new BadRequestError(`Only JSON and ZIP files are allowed. Received: ${file.mimetype}`));
		}
	},
});

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
		private readonly executionService: ExecutionService,
		private readonly dataTableExportService: DataTableExportService,
		private readonly dataTableImportService: DataTableImportService,
	) {
		console.log('=== WorkflowsController initialized ===');
		console.log('dataTableExportService:', !!this.dataTableExportService);
		console.log('dataTableImportService:', !!this.dataTableImportService);
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: unknown, @Body body: CreateWorkflowDto) {
		if (body.id) {
			const workflowExists = await this.workflowRepository.existsBy({ id: body.id });
			if (workflowExists) {
				throw new BadRequestError(`Workflow with id ${body.id} exists already.`);
			}
		}

		const { autosaved = false } = body;

		const newWorkflow = new WorkflowEntity();

		// Security: Object.assign is now safe because the DTO validates and filters all input
		// Only fields defined in CreateWorkflowDto are assigned; internal fields like
		// triggerCount, versionCounter, isArchived, etc. are never set from user input
		Object.assign(newWorkflow, body);

		// Ensure workflow is created as inactive
		newWorkflow.active = false;
		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await this.externalHooks.run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = body;

		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		if (this.license.isSharingEnabled()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used credentials

			const allCredentials = await this.credentialsService.getMany(req.user, {
				includeGlobal: true,
			});

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

		let project: Project | null = null;
		const savedWorkflow = await dbManager.transaction(async (transactionManager) => {
			const { parentFolderId } = body;
			let { projectId } = body;

			if (projectId === undefined) {
				const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
					req.user.id,
					transactionManager,
				);
				// Chat users are not allowed to create workflows even within their personal project,
				// so even though we found the project ensure it gets found via expected scope too.
				projectId = personalProject.id;
			}

			project = await this.projectService.getProjectWithScope(
				req.user,
				projectId,
				['workflow:create'],
				transactionManager,
			);

			if (project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}

			const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			if (parentFolderId) {
				try {
					const parentFolder = await this.folderService.findFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
					await transactionManager.update(WorkflowEntity, { id: workflow.id }, { parentFolder });
				} catch {}
			}

			const newSharedWorkflow = this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: project.id,
				workflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

			await this.workflowHistoryService.saveVersion(
				req.user,
				workflow,
				workflow.id,
				autosaved,
				transactionManager,
			);

			return await this.workflowFinderService.findWorkflowForUser(
				workflow.id,
				req.user,
				['workflow:read'],
				{
					em: transactionManager,
					includeTags: true,
					includeParentFolder: true,
					includeActiveVersion: true,
				},
			);
		});

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

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
			uiContext: body.uiContext,
		});

		const scopes = await this.workflowService.getWorkflowScopes(req.user, savedWorkflow.id);

		const checksum = await calculateWorkflowChecksum(savedWorkflow);

		return { ...savedWorkflowWithMetaData, scopes, checksum };
	}

	@Get('/', { middlewares: listQueryMiddleware })
	async getAll(req: WorkflowRequest.GetMany, res: express.Response) {
		try {
			const userCanListProjectFolders = req.listQueryOptions?.filter?.projectId
				? await userHasScopes(req.user, ['folder:list'], false, {
						projectId: req.listQueryOptions?.filter?.projectId as string,
					})
				: true;

			const { workflows: data, count } = await this.workflowService.getMany(
				req.user,
				req.listQueryOptions,
				!!req.query.includeScopes,
				userCanListProjectFolders && !!req.query.includeFolders,
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
		const projectId = req.query.projectId;
		if (
			!(await this.projectService.getProjectWithScope(req.user, projectId, ['workflow:create']))
		) {
			throw new ForbiddenError(
				"You don't have the permissions to create a workflow in this project.",
			);
		}
		const requestedName = req.query.name ?? this.globalConfig.workflows.defaultName;

		const name = await this.namingService.getUniqueWorkflowName(requestedName);
		return { name };
	}

	@Get('/from-url')
	async getFromUrl(
		req: AuthenticatedRequest,
		_res: express.Response,
		@Query query: ImportWorkflowFromUrlDto,
	) {
		const projectId = query.projectId;
		if (
			!(await this.projectService.getProjectWithScope(req.user, projectId, ['workflow:create']))
		) {
			throw new ForbiddenError(
				"You don't have the permissions to create a workflow in this project.",
			);
		}
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

	@Post('/import', {
		middlewares: [
			(req, res, next) => {
				void workflowImportUpload.single('file')(req, res, (error) => {
					if (error) {
						(req as AuthenticatedRequestWithFile).fileUploadError = error;
					}
					next();
				});
			},
		],
	})
	async importWorkflow(req: AuthenticatedRequestWithFile<{}, {}, { projectId: string }>) {
		// Handle multer errors
		if (req.fileUploadError) {
			throw new BadRequestError(`File upload error: ${req.fileUploadError.message}`);
		}

		if (!req.file) {
			throw new BadRequestError('No file uploaded');
		}

		const projectId = req.body.projectId;
		if (!projectId) {
			throw new BadRequestError('Project ID is required');
		}

		// Check permissions
		if (
			!(await this.projectService.getProjectWithScope(req.user, projectId, ['workflow:create']))
		) {
			throw new ForbiddenError(
				"You don't have the permissions to create a workflow in this project.",
			);
		}

		// Write buffer to temporary file for processing
		// Use path.join instead of path.resolve to avoid calling process.cwd()
		const tempFilePath = path.join(
			tmpdir(),
			`n8n-workflow-import-${Date.now()}-${req.file.originalname}`,
		);

		this.logger.debug('Writing temporary file for import', { tempFilePath });

		try {
			await writeFile(tempFilePath, req.file.buffer);
		} catch (error) {
			this.logger.error('Failed to write temporary file', { tempFilePath, error });
			throw new InternalServerError('Failed to process uploaded file');
		}

		try {
			// Detect file type
			const fileType = await this.dataTableImportService.detectFileType(tempFilePath);

			if (fileType === 'json') {
				// Handle JSON import - read file and create workflow
				const workflowContent = await readFile(tempFilePath, 'utf-8');
				const workflowData = JSON.parse(workflowContent) as CreateWorkflowDto;

				// Remove ID to generate a new one
				delete workflowData.id;

				// Add projectId to workflow data
				workflowData.projectId = projectId;

				// Create workflow using existing create method
				const workflow = await this.create(req, undefined, workflowData);

				return {
					workflowId: workflow.id,
					dataTablesImported: 0,
				};
			}

			// Handle ZIP import with data tables
			const { workflow: workflowData, dataTables } =
				await this.dataTableImportService.extractWorkflowZip(tempFilePath);

			// Import data tables and build ID mapping
			const idMapping = new Map<string, { newId: string; name: string }>();
			for (const [oldId, tableData] of dataTables) {
				const result = await this.dataTableImportService.importDataTable(tableData, projectId);
				idMapping.set(oldId, { newId: result.newId, name: result.name });
			}

			// Update workflow node parameters with new data table IDs
			this.dataTableImportService.updateWorkflowDataTableReferences(workflowData, idMapping);

			// Add projectId to workflow data
			const workflowDto = workflowData as unknown as CreateWorkflowDto;

			// Remove ID to generate a new one
			delete workflowDto.id;

			workflowDto.projectId = projectId;

			// Create workflow using existing create method
			const workflow = await this.create(req, undefined, workflowDto);

			this.logger.info('Workflow imported with data tables', {
				workflowId: workflow.id,
				dataTableCount: dataTables.size,
			});

			return {
				workflowId: workflow.id,
				dataTablesImported: dataTables.size,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error('Failed to import workflow', {
				error: errorMessage,
				stack: errorStack,
				fileType: req.file.mimetype,
				fileName: req.file.originalname,
			});
			throw new InternalServerError(`Failed to import workflow: ${errorMessage}`);
		} finally {
			// Clean up temporary file
			try {
				await unlink(tempFilePath);
			} catch (error) {
				this.logger.error('Failed to cleanup temporary file', { path: tempFilePath, error });
			}
		}
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
				{
					includeTags: !this.globalConfig.tags.disabled,
					includeParentFolder: true,
					includeActiveVersion: true,
				},
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
			const checksum = await calculateWorkflowChecksum(workflow);

			return { ...workflowWithMetaData, scopes, checksum };
		}

		// sharing disabled

		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:read'],
			{
				includeTags: !this.globalConfig.tags.disabled,
				includeParentFolder: true,
				includeActiveVersion: true,
			},
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
		const checksum = await calculateWorkflowChecksum(workflow);

		return { ...workflow, scopes, checksum };
	}

	/**
	 * Checks whether a workflow with the given ID exists.
	 *
	 * @note We cannot use @ProjectScope here because we want to check for the id's existence
	 *       Adding a scope would disable the route if the user didn't have access to the workflow
	 */
	@Get('/:workflowId/exists')
	async exists(req: WorkflowRequest.Get) {
		const exists = await this.workflowRepository.existsBy({ id: req.params.workflowId });
		return { exists };
	}

	@Get('/:workflowId/export')
	@ProjectScope('workflow:read')
	async exportWorkflow(
		req: WorkflowRequest.Get,
		res: Response,
		@Query query: ExportWorkflowQueryDto,
	) {
		console.log('=== EXPORT WORKFLOW ENDPOINT CALLED ===');
		const { workflowId } = req.params;
		const includeDataTables = query.includeDataTables ?? false;
		console.log('workflowId:', workflowId);
		console.log('includeDataTables:', includeDataTables);

		// Find the workflow with read permissions
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:read'],
			{
				includeTags: !this.globalConfig.tags.disabled,
			},
		);

		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
		}

		// Get project for permission checks
		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) {
			throw new NotFoundError(`Project for workflow "${workflowId}" not found`);
		}

		// If not including data tables, return regular JSON export
		if (!includeDataTables) {
			return workflow;
		}

		// Extract data table IDs from workflow
		const dataTableIds = await this.dataTableExportService.extractDataTableIds(
			workflow,
			project.id,
		);

		// If no data tables found, return regular JSON export
		if (dataTableIds.length === 0) {
			return workflow;
		}

		// Export data tables
		const dataTableExports = await this.dataTableExportService.exportDataTables(
			dataTableIds,
			project.id,
		);

		// Create temporary ZIP file
		const tempZipPath = path.join(tmpdir(), `n8n-workflow-${workflowId}-${Date.now()}.zip`);

		try {
			// Create ZIP with workflow and data tables
			await this.dataTableExportService.createWorkflowZipExport(
				workflow,
				dataTableExports,
				tempZipPath,
			);

			// Sanitize workflow name for filename
			let sanitizedName = workflow.name.replace(/[^a-z0-9_-]/gi, '_');
			if (!sanitizedName) {
				sanitizedName = 'workflow';
			}

			// Use sendFile to properly handle file download
			// This is the Express-recommended way to send files
			return await new Promise<void>((resolve, reject) => {
				res.sendFile(
					tempZipPath,
					{
						headers: {
							'Content-Type': 'application/zip',
							'Content-Disposition': `attachment; filename="${sanitizedName}.zip"`,
						},
					},
					async (error) => {
						// Clean up temp file after sending (whether success or error)
						try {
							await unlink(tempZipPath);
						} catch (cleanupError) {
							this.logger.error('Failed to cleanup temp ZIP file', {
								tempZipPath,
								error: cleanupError,
							});
						}

						if (error) {
							this.logger.error('Error sending ZIP file', { tempZipPath, error });
							reject(new InternalServerError('Failed to export workflow'));
						} else {
							resolve();
						}
					},
				);
			});
		} catch (error) {
			// Clean up temp file on error
			try {
				await unlink(tempZipPath);
			} catch (cleanupError) {
				this.logger.error('Failed to cleanup temp ZIP file after error', {
					tempZipPath,
					error: cleanupError,
				});
			}
			throw error;
		}
	}

	@Patch('/:workflowId')
	@ProjectScope('workflow:update')
	async update(
		req: WorkflowRequest.Update,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: UpdateWorkflowDto,
	) {
		const forceSave = req.query.forceSave === 'true';

		let updateData = new WorkflowEntity();
		const { tags, parentFolderId, aiBuilderAssisted, expectedChecksum, autosaved, ...rest } = body;

		// Validate timeSavedMode if present
		if (
			body.settings?.timeSavedMode !== undefined &&
			!['fixed', 'dynamic'].includes(body.settings.timeSavedMode)
		) {
			throw new BadRequestError('Invalid timeSavedMode');
		}

		// Security: Object.assign is now safe because the DTO validates and filters all input
		// Only fields defined in UpdateWorkflowDto are assigned; internal fields like
		// triggerCount, versionCounter, isArchived, active, activeVersionId, etc. are never set from user input
		Object.assign(updateData, rest);

		const isSharingEnabled = this.license.isSharingEnabled();
		if (isSharingEnabled) {
			updateData = await this.enterpriseWorkflowService.preventTampering(
				updateData,
				workflowId,
				req.user,
			);
		}

		const updatedWorkflow = await this.workflowService.update(req.user, updateData, workflowId, {
			tagIds: tags,
			parentFolderId,
			forceSave: isSharingEnabled ? forceSave : true,
			expectedChecksum,
			aiBuilderAssisted,
			autosaved,
		});

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
		const checksum = await calculateWorkflowChecksum(updatedWorkflow);

		return { ...updatedWorkflow, scopes, checksum };
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

		const checksum = await calculateWorkflowChecksum(workflow);

		return { ...workflow, checksum };
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

		const checksum = await calculateWorkflowChecksum(workflow);

		return { ...workflow, checksum };
	}

	@Post('/:workflowId/activate')
	@ProjectScope('workflow:publish')
	async activate(
		req: WorkflowRequest.Activate,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: ActivateWorkflowDto,
	) {
		const { versionId, name, description, expectedChecksum } = body;

		const workflow = await this.workflowService.activateWorkflow(req.user, workflowId, {
			versionId,
			name,
			description,
			expectedChecksum,
		});

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
		const checksum = await calculateWorkflowChecksum(workflow);

		return { ...workflow, scopes, checksum };
	}

	@Post('/:workflowId/deactivate')
	@ProjectScope('workflow:publish')
	async deactivate(req: WorkflowRequest.Deactivate) {
		const { workflowId } = req.params;

		const workflow = await this.workflowService.deactivateWorkflow(req.user, workflowId);

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);
		const checksum = await calculateWorkflowChecksum(workflow);

		return { ...workflow, scopes, checksum };
	}

	@Post('/:workflowId/run')
	@ProjectScope('workflow:execute')
	async runManually(req: WorkflowRequest.ManualRun, _res: unknown) {
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

		const result = await this.workflowExecutionService.executeManually(
			req.body,
			req.user,
			req.headers['push-ref'],
		);

		if ('executionId' in result) {
			this.eventService.emit('workflow-executed', {
				user: {
					id: req.user.id,
					email: req.user.email,
					firstName: req.user.firstName,
					lastName: req.user.lastName,
					role: req.user.role,
				},
				workflowId: req.body.workflowData.id,
				workflowName: req.body.workflowData.name,
				executionId: result.executionId,
				source: 'user-manual',
			});
		}

		return result;
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
			role: { slug: PROJECT_OWNER_ROLE_SLUG },
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

	@Get('/:workflowId/executions/last-successful')
	@ProjectScope('workflow:read')
	async getLastSuccessfulExecution(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
	) {
		const lastExecution = await this.executionService.getLastSuccessfulExecution(workflowId);

		return lastExecution ?? null;
	}

	@Post('/with-node-types')
	async getWorkflowsWithNodesIncluded(req: AuthenticatedRequest, res: express.Response) {
		try {
			const hasPermission = req.user.role.slug === ROLE.Owner || req.user.role.slug === ROLE.Admin;

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
}
