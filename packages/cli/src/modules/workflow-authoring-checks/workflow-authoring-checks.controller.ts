import type {
	WorkflowAuthoringCheckTypesListResponse,
	WorkflowAuthoringChecksListResponse,
	WorkflowAuthoringChecksPreviewResponse,
	WorkflowCheckDto,
	WorkflowCheckResult,
} from '@n8n/api-types';
import {
	CreateWorkflowCheckDto,
	UpdateWorkflowCheckDto,
	WorkflowAuthoringChecksPreviewQueryDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowAuthoringChecksService } from './workflow-authoring-checks.service';

@RestController('/workflow-authoring-checks')
export class WorkflowAuthoringChecksController {
	constructor(
		private readonly authoringChecksService: WorkflowAuthoringChecksService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
	) {}

	@Get('/preview/:workflowId')
	@ProjectScope('workflow:publish')
	async preview(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Query query: WorkflowAuthoringChecksPreviewQueryDto,
	): Promise<WorkflowAuthoringChecksPreviewResponse> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" could not be found.`);
		}

		let nodes = workflow.nodes;
		let connections = workflow.connections;

		if (query.versionId && query.versionId !== workflow.versionId) {
			try {
				const version = await this.workflowHistoryService.getVersion(
					req.user,
					workflowId,
					query.versionId,
					{ includePublishHistory: false },
				);
				nodes = version.nodes;
				connections = version.connections;
			} catch (error) {
				if (error instanceof WorkflowHistoryVersionNotFoundError) {
					throw new NotFoundError('Version not found');
				}
				throw error;
			}
		}

		const results = await this.authoringChecksService.runAll({
			workflowId,
			nodes,
			connections,
			settings: workflow.settings,
		});

		return { results, summary: summarize(results) };
	}

	@Get('/types')
	@GlobalScope('workflowAuthoringCheck:list')
	listTypes(): WorkflowAuthoringCheckTypesListResponse {
		return { types: this.authoringChecksService.listTypes() };
	}

	@Get('/')
	@GlobalScope('workflowAuthoringCheck:list')
	async list(): Promise<WorkflowAuthoringChecksListResponse> {
		const checks = await this.authoringChecksService.listInstances();
		return { checks };
	}

	@Post('/')
	@GlobalScope('workflowAuthoringCheck:create')
	async create(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CreateWorkflowCheckDto,
	): Promise<WorkflowCheckDto> {
		return await this.authoringChecksService.createInstance({
			name: body.name,
			type: body.type,
			config: body.config,
			severity: body.severity,
			enabled: body.enabled,
		});
	}

	@Patch('/:id')
	@GlobalScope('workflowAuthoringCheck:update')
	async update(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body body: UpdateWorkflowCheckDto,
	): Promise<WorkflowCheckDto> {
		const updated = await this.authoringChecksService.updateInstance(id, {
			name: body.name,
			config: body.config,
			severity: body.severity,
			enabled: body.enabled,
		});
		if (!updated) {
			throw new NotFoundError(`Workflow check "${id}" not found.`);
		}
		return updated;
	}

	@Delete('/:id')
	@GlobalScope('workflowAuthoringCheck:delete')
	async delete(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
	): Promise<{ success: true }> {
		const ok = await this.authoringChecksService.deleteInstance(id);
		if (!ok) {
			throw new NotFoundError(`Workflow check "${id}" not found.`);
		}
		return { success: true };
	}
}

function summarize(results: WorkflowCheckResult[]) {
	let blocking = 0;
	let warning = 0;
	for (const r of results) {
		if (r.severity === 'blocking') blocking++;
		else if (r.severity === 'warning') warning++;
	}
	return { blocking, warning };
}
