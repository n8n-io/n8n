import { AiPreferenceListQueryDto, AiPreferenceRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Middleware, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { AiPreferenceService } from '@n8n/backend-services';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

/**
 * No route scopes: authorization is row-shaped and lives in the service, as in
 * `VariablesController`.
 */
@RestController('/ai-preferences')
export class AiPreferenceController {
	constructor(
		private readonly aiPreferenceService: AiPreferenceService,
		private readonly aiPreferenceSettingsService: AiPreferenceSettingsService,
	) {}

	@Middleware()
	requirePreferencesEnabled(_req: Request, res: Response, next: NextFunction) {
		if (!this.aiPreferenceSettingsService.isEnabled) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	@Get('/')
	async getPreferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: AiPreferenceListQueryDto,
	) {
		const { skip, take, ...filters } = query;
		return await this.aiPreferenceService.list(req.user, { ...filters, offset: skip, limit: take });
	}

	@Get('/count')
	async countPreferences(req: AuthenticatedRequest) {
		return await this.aiPreferenceService.count(req.user);
	}

	@Post('/')
	async createPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AiPreferenceRequestDto,
	) {
		// This controller is the settings area. The assistant and MCP pass their own source.
		return await this.aiPreferenceService.create(req.user, payload, 'ui');
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
