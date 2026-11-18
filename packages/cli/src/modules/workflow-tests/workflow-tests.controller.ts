import { RunStoredWorkflowTestDto, RunWorkflowTestDto, SaveWorkflowTestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, ProjectScope, Put, RestController } from '@n8n/decorators';

import { WorkflowTestFileService } from './workflow-test-file.service';
import { WorkflowTestRunService } from './workflow-test-run.service';

@RestController('/workflows')
export class WorkflowTestsController {
	constructor(
		private readonly workflowTestRunService: WorkflowTestRunService,
		private readonly workflowTestFileService: WorkflowTestFileService,
	) {}

	@Get('/:workflowId/tests')
	@ProjectScope('workflow:read')
	async list(req: AuthenticatedRequest<{ workflowId: string }>) {
		return await this.workflowTestFileService.list(req.params.workflowId);
	}

	@Put('/:workflowId/tests')
	@ProjectScope('workflow:update')
	async save(
		req: AuthenticatedRequest<{ workflowId: string }>,
		_res: unknown,
		@Body payload: SaveWorkflowTestDto,
	) {
		return await this.workflowTestFileService.save(req.params.workflowId, payload.source);
	}

	@Post('/:workflowId/tests/:id/run')
	// The runner runs the test code on the n8n host, so only owners and admins can run it.
	@GlobalScope('workflow:execute')
	async runStored(
		req: AuthenticatedRequest<{ workflowId: string; id: string }>,
		_res: unknown,
		@Body payload: RunStoredWorkflowTestDto,
	) {
		return await this.workflowTestFileService.start(
			req.user,
			req.params.workflowId,
			req.params.id,
			payload.version,
		);
	}

	@Post('/:workflowId/tests/run')
	@GlobalScope('workflow:execute')
	run(
		req: AuthenticatedRequest<{ workflowId: string }>,
		_res: unknown,
		@Body payload: RunWorkflowTestDto,
	) {
		return this.workflowTestRunService.start(req.user, req.params.workflowId, payload);
	}
}
