import { AssistantThreadTabsRequestDto, type AssistantThreadTabsResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { AssistantThreadTabsService } from './assistant-thread-tabs.service';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

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
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly threadTabs: AssistantThreadTabsService,
	) {}

	@Get('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async getThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<AssistantThreadTabsResponse> {
		await this.systemAgents.getUsableThread(ASSISTANT_AGENT_ID, req.user, threadId);
		return { state: await this.threadTabs.getState(threadId) };
	}

	@Put('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async saveThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: AssistantThreadTabsRequestDto,
	): Promise<AssistantThreadTabsResponse> {
		await this.systemAgents.getUsableThread(ASSISTANT_AGENT_ID, req.user, threadId);
		// The DTO strips unknown keys, so the payload is the state to save.
		const state = { ...payload };
		await this.threadTabs.saveState(threadId, state);
		return { state };
	}
}
