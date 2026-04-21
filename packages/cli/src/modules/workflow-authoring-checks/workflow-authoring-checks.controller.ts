import type {
	WorkflowAuthoringChecksListResponse,
	WorkflowAuthoringChecksPreviewResponse,
	WorkflowCheckConfigDto,
	WorkflowCheckResult,
} from '@n8n/api-types';
import {
	UpdateWorkflowCheckConfigDto,
	WorkflowAuthoringChecksPreviewQueryDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Get,
	GlobalScope,
	Param,
	Patch,
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

	@Get('/')
	@GlobalScope('workflowAuthoringCheck:list')
	async list(): Promise<WorkflowAuthoringChecksListResponse> {
		const checks = await this.authoringChecksService.listChecksWithConfig();
		return { checks };
	}

	@Patch('/:checkId')
	@GlobalScope('workflowAuthoringCheck:update')
	async updateConfig(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('checkId') checkId: string,
		@Body body: UpdateWorkflowCheckConfigDto,
	): Promise<WorkflowCheckConfigDto> {
		const updated = await this.authoringChecksService.updateConfig(checkId, {
			enabled: body.enabled,
			severityOverride: body.severityOverride,
		});

		if (!updated) {
			throw new NotFoundError(`Workflow check "${checkId}" is not registered.`);
		}

		return updated;
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
