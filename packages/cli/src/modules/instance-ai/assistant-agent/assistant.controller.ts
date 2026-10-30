import { AssistantThreadTabsRequestDto, type AssistantThreadTabsResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { AssistantThreadTabsService } from './assistant-thread-tabs.service';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/**
 * Routes of the Assistant that stay when the current runtime is removed.
 * The routes of `InstanceAiController` go with the current runtime.
 *
 * Each thread route checks access like the system-agent routes: thread
 * ownership, `project:read` on the working project, and the provider's checks.
 */
@RestController('/assistant')
export class AssistantController {
	constructor(
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly threadTabs: AssistantThreadTabsService,
	) {}

	@Get('/agent-threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async getThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<AssistantThreadTabsResponse> {
		await this.systemAgents.getUsableThread(ASSISTANT_AGENT_ID, req.user, threadId);
		return { state: await this.threadTabs.getState(threadId) };
	}

	@Put('/agent-threads/:threadId/tabs')
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
