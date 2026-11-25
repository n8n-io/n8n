import {
	AssistantAgentFeedbackRequestDto,
	AssistantAgentTargetRequestDto,
	AssistantPreferenceCardEditRequestDto,
	AssistantPreferenceCardUndoRequestDto,
	AssistantThreadTabsRequestDto,
	InstanceAiPersistPendingAgentRequest,
	type AssistantAgentTargetsResponse,
	type AssistantPreferenceCardEditResponse,
	type AssistantPreferenceCardsResponse,
	type AssistantPreferenceCardUndoResponse,
	type AssistantThreadTabsResponse,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Post, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AssistantAgentFeedbackService } from './assistant-agent-feedback.service';
import { AssistantAgentTargetsService } from './assistant-agent-targets.service';
import { AssistantPreferenceCardsService } from './assistant-preference-cards.service';
import { AssistantThreadCreditsService } from './assistant-thread-credits.service';
import { AssistantThreadTabsService } from './assistant-thread-tabs.service';

/**
 * Routes that only the Assistant agent uses: the n8n Assistant on the Agents
 * runtime. This controller loads only when the Assistant agent registers, so
 * it can depend on the agents module. Routes that must also work without the
 * agent go in the shared Assistant controller, which must not depend on it.
 * When the current Assistant runtime is removed, these routes move there.
 *
 * Each thread route checks access like the system-agent routes: thread
 * ownership, `project:read` on the working project, and the provider's checks.
 */
@RestController('/assistant')
export class AssistantAgentController {
	constructor(
		private readonly threadTabs: AssistantThreadTabsService,
		private readonly threadCredits: AssistantThreadCreditsService,
		private readonly agentTargets: AssistantAgentTargetsService,
		private readonly preferenceCards: AssistantPreferenceCardsService,
		private readonly feedback: AssistantAgentFeedbackService,
	) {}

	@Get('/threads/:threadId/credits')
	@GlobalScope('instanceAi:message')
	async getThreadCredits(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<{ creditsUsed: number | null }> {
		return { creditsUsed: (await this.threadCredits.getTotal(req.user, threadId)) ?? null };
	}

	@Get('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async getThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<AssistantThreadTabsResponse> {
		return { state: await this.threadTabs.getState(req.user, threadId) };
	}

	@Put('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async saveThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: AssistantThreadTabsRequestDto,
	): Promise<AssistantThreadTabsResponse> {
		// The DTO strips unknown keys, so the payload is the state to save.
		const state = { ...payload };
		await this.threadTabs.saveState(req.user, threadId, state);
		return { state };
	}

	/** The preference cards of the thread that the user edited or undid. */
	@Get('/threads/:threadId/preference-cards')
	@GlobalScope('instanceAi:message')
	async getPreferenceCards(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<AssistantPreferenceCardsResponse> {
		return { cards: await this.preferenceCards.getCards(req.user, threadId) };
	}

	/** Undo of the preference that a `save_user_preference` call saved. The row checks are in the preference service. */
	@Post('/threads/:threadId/preferences/:preferenceId/undo')
	@GlobalScope('instanceAi:message')
	async undoPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('preferenceId') preferenceId: string,
		@Body payload: AssistantPreferenceCardUndoRequestDto,
	): Promise<AssistantPreferenceCardUndoResponse> {
		return {
			card: await this.preferenceCards.undo(req.user, threadId, preferenceId, payload),
		};
	}

	/** Edit of the preference that a `save_user_preference` call saved. The row checks are in the preference service. */
	@Post('/threads/:threadId/preferences/:preferenceId/edit')
	@GlobalScope('instanceAi:message')
	async editPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('preferenceId') preferenceId: string,
		@Body payload: AssistantPreferenceCardEditRequestDto,
	): Promise<AssistantPreferenceCardEditResponse> {
		return await this.preferenceCards.edit(req.user, threadId, preferenceId, payload);
	}

	/** The agents that the thread builds or edits, for its agent previews. */
	@Get('/threads/:threadId/agent-targets')
	@GlobalScope('instanceAi:message')
	async getAgentTargets(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<AssistantAgentTargetsResponse> {
		return { targets: await this.agentTargets.getState(req.user, threadId) };
	}

	/** Bind a saved agent that the user changed in an agent preview, so the next turn edits it. */
	@Put('/threads/:threadId/agent-target')
	@GlobalScope('instanceAi:message')
	async bindAgentTarget(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: AssistantAgentTargetRequestDto,
	): Promise<AssistantAgentTargetsResponse> {
		const { agentId, projectId, name } = payload;
		return {
			targets: await this.agentTargets.bind(req.user, threadId, { agentId, projectId, name }),
		};
	}

	/** Save the pending agent that an agent preview shows, and bind it to the thread. */
	@Post('/threads/:threadId/agent')
	@GlobalScope('instanceAi:message')
	async persistPendingAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiPersistPendingAgentRequest,
	) {
		return await this.agentTargets.persistPendingAgent(
			req.user,
			threadId,
			payload,
			req.headers?.['push-ref'],
		);
	}

	/** Rate the answer of a turn. The rating goes to the LangSmith trace of the turn. */
	@Post('/threads/:threadId/feedback')
	@GlobalScope('instanceAi:message')
	async submitFeedback(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: AssistantAgentFeedbackRequestDto,
	): Promise<{ ok: true }> {
		await this.feedback.submit(req.user, threadId, payload);
		return { ok: true };
	}
}
