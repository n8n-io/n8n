import { RunWorkflowTestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, ProjectScope, RestController } from '@n8n/decorators';

import { WorkflowTestRunService } from './workflow-test-run.service';

@RestController('/workflows')
export class WorkflowTestsController {
	constructor(private readonly workflowTestRunService: WorkflowTestRunService) {}

	@Post('/:workflowId/tests/run')
	@ProjectScope('workflow:execute')
	run(
		req: AuthenticatedRequest<{ workflowId: string }>,
		_res: unknown,
		@Body payload: RunWorkflowTestDto,
	) {
		return this.workflowTestRunService.start(req.user, req.params.workflowId, payload);
	}
}
