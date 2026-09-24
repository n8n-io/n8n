import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';

import { WorkflowDraftService } from './workflow-draft.service';

@RestController('/projects/:projectId/workflow-drafts')
export class WorkflowDraftsController {
	constructor(private readonly drafts: WorkflowDraftService) {}

	@Get('/:draftId')
	@ProjectScope('workflow:update')
	async detail(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('draftId') draftId: string,
	) {
		return await this.drafts.getProposal(req.user, projectId, draftId);
	}
}
