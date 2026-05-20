import {
	AgentBuilderAdminSettingsUpdateDto,
	type AgentBuilderAdminSettingsResponse,
	type AgentBuilderStatusResponse,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Patch, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { AgentsBuilderSettingsService } from './agents-builder-settings.service';

@RestController('/agent-builder')
export class AgentsBuilderSettingsController {
	constructor(private readonly settingsService: AgentsBuilderSettingsService) {}

	@Get('/settings')
	@GlobalScope('agent:manage')
	async getAdminSettings(_req: AuthenticatedRequest): Promise<AgentBuilderAdminSettingsResponse> {
		return await this.settingsService.getAdminSettings();
	}

	@Patch('/settings')
	@GlobalScope('agent:manage')
	async updateAdminSettings(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<AgentBuilderAdminSettingsResponse> {
		// Manually validate using the discriminated union schema since
		// TypeScript reflection doesn't work with plain Zod schemas, and
		// `Z.class` doesn't support discriminated unions directly. (Same
		// pattern as `CreateDestinationDto` in the log-streaming module.)
		const parseResult = AgentBuilderAdminSettingsUpdateDto.safeParse(req.body);
		if (!parseResult.success) {
			throw new BadRequestError(parseResult.error.errors[0]?.message ?? 'Invalid request body');
		}
		await this.settingsService.updateAdminSettings(parseResult.data);
		return await this.settingsService.getAdminSettings();
	}

	@Get('/status')
	async getStatus(): Promise<AgentBuilderStatusResponse> {
		return await this.settingsService.getStatus();
	}
}
