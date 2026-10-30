import { AssistantThreadTabsRequestDto, type AssistantThreadTabsResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

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
	constructor(private readonly threadTabs: AssistantThreadTabsService) {}

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
}
