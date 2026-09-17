import { AiPreferenceListQueryDto, AiPreferenceRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AiPreferenceService } from '@/services/ai-preference.service';

/**
 * No feature-flag check: the flag gates the surfaces that read preferences, so a
 * write with the flag off is inert. No route scopes: authorization is row-shaped and
 * lives in the service, as in `VariablesController`.
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
