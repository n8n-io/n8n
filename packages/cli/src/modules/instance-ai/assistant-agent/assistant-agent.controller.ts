import {
	AssistantAgentTargetRequestDto,
	AssistantThreadTabsRequestDto,
	InstanceAiPersistPendingAgentRequest,
	type AssistantAgentTargetsResponse,
	type AssistantThreadTabsResponse,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Post, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AssistantAgentTargetsService } from './assistant-agent-targets.service';
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
}
