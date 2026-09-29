import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';

import { WorkflowSuggestionService } from './workflow-suggestion.service';
import { WorkflowSuggestionActionsService } from './workflow-suggestion-actions.service';

@RestController('/projects/:projectId/workflows/:workflowId/suggestions')
export class WorkflowSuggestionsController {
	constructor(
		private readonly suggestions: WorkflowSuggestionService,
		private readonly actions: WorkflowSuggestionActionsService,
	) {}

	@Get('/:suggestionId')
	@ProjectScope('workflow:update')
	async detail(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('workflowId') workflowId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.suggestions.getProposal(req.user, projectId, workflowId, suggestionId);
	}

	@Post('/:suggestionId/approve-and-publish')
	@ProjectScope('workflow:publish')
	async approveAndPublish(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('workflowId') workflowId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.actions.act(
			req.user,
			projectId,
			workflowId,
			suggestionId,
			'approve-and-publish',
			req.headers['push-ref'],
		);
	}

	@Post('/:suggestionId/open-in-editor')
	@ProjectScope('workflow:update')
	async openInEditor(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('workflowId') workflowId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.actions.act(
			req.user,
			projectId,
			workflowId,
			suggestionId,
			'open-in-editor',
			req.headers['push-ref'],
		);
	}

	@Post('/:suggestionId/discard')
	@ProjectScope('workflow:update')
	async discard(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('workflowId') workflowId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.actions.act(req.user, projectId, workflowId, suggestionId, 'discard');
	}

	@Post('/:suggestionId/retry-publication')
	@ProjectScope('workflow:publish')
	async retryPublication(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Param('workflowId') workflowId: string,
		@Param('suggestionId') suggestionId: string,
	) {
		return await this.actions.act(
			req.user,
			projectId,
			workflowId,
			suggestionId,
			'retry-publication',
			req.headers['push-ref'],
		);
	}
}
