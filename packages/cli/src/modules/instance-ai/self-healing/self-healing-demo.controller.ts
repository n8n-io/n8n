import { AuthenticatedRequest, SharedWorkflowRepository } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { z } from 'zod';

import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';
import { SelfHealingInvestigationService } from './self-healing-investigation.service';

type DemoRequest = AuthenticatedRequest<{
	projectId: string;
	workflowId: string;
	investigationId: string;
}>;

// This controller is registered only on the hosted demo branch with an explicit opt-in.
@RestController('/projects/:projectId/workflows/:workflowId/self-healing-demo')
export class SelfHealingDemoController {
	constructor(
		private readonly producer: SelfHealingInvestigationService,
		private readonly investigations: SelfHealingInvestigationRepository,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly ownership: SharedWorkflowRepository,
	) {}

	@Post('/investigations')
	@ProjectScope('workflow:update')
	async start(req: DemoRequest) {
		const parsed = z.object({ executionId: z.string().min(1).max(36) }).safeParse(req.body);
		if (!parsed.success) throw new BadRequestError('A failed execution ID is required.');
		return await this.producer.start({
			workflowId: req.params.workflowId,
			projectId: req.params.projectId,
			backgroundUserId: req.user.id,
			executionId: parsed.data.executionId,
		});
	}

	@Get('/investigations/:investigationId')
	@ProjectScope('workflow:update')
	async status(req: DemoRequest) {
		const { workflowId, projectId, investigationId } = req.params;
		await this.suggestions.requireEditor(req.user.id, workflowId);
		const owner = await this.ownership.getWorkflowOwningProject(workflowId);
		if (owner?.id !== projectId) throw new NotFoundError('Workflow not found in this project.');
		const row = await this.investigations.get(investigationId);
		if (row.workflowId !== workflowId || row.projectId !== projectId) {
			throw new NotFoundError('Investigation not found in this workflow.');
		}
		return { id: row.id, finishedAt: row.finishedAt, resultId: row.resultId };
	}
}
