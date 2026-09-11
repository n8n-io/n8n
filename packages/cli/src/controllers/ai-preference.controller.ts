import { AiPreferenceListQueryDto, AiPreferenceRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AiPreferenceService } from '@/services/ai-preference.service';

/**
 * CRUD for the free-text preferences the AI surfaces inject into their prompts.
 *
 * The routes carry no feature-flag check. The flag decides who is offered the
 * settings page and whose prompts carry the block; it must not decide whether a
 * preference that already exists can be read or removed. PostHog also fails closed,
 * so a gate here would hide saved preferences during an outage.
 *
 * Every route authorizes per row. `AiPreferenceService` owns those rules, because
 * the read path that renders preferences into prompts applies the same ones.
 */
@RestController('/ai-preferences')
export class AiPreferenceController {
	constructor(private readonly aiPreferenceService: AiPreferenceService) {}

	@Get('/')
	async getPreferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: AiPreferenceListQueryDto,
	) {
		return await this.aiPreferenceService.list(req.user, query);
	}

	@Post('/')
	async createPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AiPreferenceRequestDto,
	) {
		return await this.aiPreferenceService.create(req.user, payload);
	}

	@Patch('/:id')
	async updatePreference(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: AiPreferenceRequestDto,
	) {
		return await this.aiPreferenceService.update(req.user, req.params.id, payload);
	}

	@Delete('/:id')
	async deletePreference(req: AuthenticatedRequest<{ id: string }>) {
		await this.aiPreferenceService.delete(req.user, req.params.id);

		return true;
	}
}
