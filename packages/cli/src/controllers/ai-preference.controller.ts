import { AiPreferenceListQueryDto, AiPreferenceRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AiPreferenceService } from '@/services/ai-preference.service';

/**
 * CRUD for the free-text preferences the AI surfaces inject into their prompts.
 *
 * The routes carry no feature-flag check, on purpose. The flag gates the surfaces:
 * the settings page the UI offers, and the block the MCP server injects, which reads
 * the flag itself. With the flag off a saved preference reaches no prompt, so a write
 * is inert rather than an unreleased feature in use. Gating writes here would instead
 * make PostHog a dependency of editing: its client fails closed, so an outage would
 * lock the preferences of every user who does have the feature.
 *
 * The routes also carry no `@GlobalScope`/`@ProjectScope`, because the authorization
 * is row-shaped, not route-shaped: every user may write their own preferences, and
 * whether they may write a given project's depends on that project. A global scope
 * would refuse a member their own. `AiPreferenceService` owns those rules, so the
 * read that renders preferences into prompts applies the same ones. `VariablesController`
 * splits the same way.
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
