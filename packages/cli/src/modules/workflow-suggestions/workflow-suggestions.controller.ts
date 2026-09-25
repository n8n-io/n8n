import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';

import { WorkflowSuggestionService } from './workflow-suggestion.service';

@RestController('/projects/:projectId/workflow-suggestions')
export class WorkflowSuggestionsController {
	constructor(private readonly suggestions: WorkflowSuggestionService) {}

	@Get('/:suggestionId')
	@ProjectScope('workflow:update')
	async detail(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.suggestions.getProposal(req.user, projectId, suggestionId);
	}
}
