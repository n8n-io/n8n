import {
	DesktopAssistantHistoryQueryDto,
	DesktopAssistantPromoteRequestDto,
	DesktopAssistantTaskRequestDto,
	DesktopAssistantTaskRunQueryDto,
	type DesktopAssistantHistoryResponse,
	type DesktopAssistantPromoteResponse,
	type DesktopAssistantTaskResponse,
	type DesktopAssistantTasksResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, Query, RestController } from '@n8n/decorators';

import {
	DesktopAssistantTaskRunService,
	type FlushableResponse,
} from './desktop-assistant-task-run.service';
import { DesktopAssistantService } from './desktop-assistant.service';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';

/**
 * REST surface for the n8n personal-automation desktop assistant.
 *
 * All routes are gated by the same `instanceAi:message` scope as the rest of
 * the instance-ai module and by an explicit Instance-AI-enabled check, so
 * the desktop assistant can never come online without Instance AI itself
 * being enabled on the instance.
 */
@RestController('/desktop-assistant')
export class DesktopAssistantController {
	constructor(
		private readonly desktopAssistantService: DesktopAssistantService,
		private readonly taskRunService: DesktopAssistantTaskRunService,
		private readonly settingsService: InstanceAiSettingsService,
	) {}

	private requireEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
	}

	@Get('/tasks')
	@GlobalScope('instanceAi:message')
	async getTasks(req: AuthenticatedRequest): Promise<DesktopAssistantTasksResponse> {
		this.requireEnabled();
		return await this.desktopAssistantService.getTasks(req.user);
	}

	@Post('/task')
	@GlobalScope('instanceAi:message')
	async triggerTask(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: DesktopAssistantTaskRequestDto,
	): Promise<DesktopAssistantTaskResponse> {
		this.requireEnabled();
		return await this.desktopAssistantService.triggerTask(req.user, body);
	}

	@Post('/promote-thread')
	@GlobalScope('instanceAi:message')
	async promoteThread(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: DesktopAssistantPromoteRequestDto,
	): Promise<DesktopAssistantPromoteResponse> {
		this.requireEnabled();
		return await this.desktopAssistantService.promoteThread(req.user, body);
	}

	// usesTemplates bypasses the send() wrapper so SSE frames can be written directly
	@Get('/task-run/events', { usesTemplates: true })
	@GlobalScope('instanceAi:message')
	async taskRunEvents(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Query query: DesktopAssistantTaskRunQueryDto,
	): Promise<void> {
		this.requireEnabled();
		await this.taskRunService.streamRunEvents(req, res, query);
	}

	@Get('/history')
	@GlobalScope('instanceAi:message')
	async getHistory(
		req: AuthenticatedRequest,
		_res: unknown,
		@Query query: DesktopAssistantHistoryQueryDto,
	): Promise<DesktopAssistantHistoryResponse> {
		this.requireEnabled();
		return await this.desktopAssistantService.getHistory(req.user, {
			limit: query.limit,
			firstId: query.firstId,
			lastId: query.lastId,
		});
	}
}
