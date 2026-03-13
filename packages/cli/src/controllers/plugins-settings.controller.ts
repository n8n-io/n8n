import {
	UpdatePluginSettingsDto,
	MergeDevLinkTokenRequestDto,
	MergeDevAccountTokenRequestDto,
} from '@n8n/api-types';
import type {
	MergeDevIntegrationsResponseDto,
	MergeDevLinkTokenResponseDto,
	MergeDevAccountTokenResponseDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PluginsSettingsService } from '@/services/plugins-settings.service';

@RestController('/settings/plugins')
export class PluginsSettingsController {
	constructor(private readonly pluginsSettingsService: PluginsSettingsService) {}

	@GlobalScope('pluginsSettings:manage')
	@Get('/')
	async getPluginsSettings(_req: AuthenticatedRequest, _res: Response) {
		return await this.pluginsSettingsService.getPluginsSettings();
	}

	@GlobalScope('pluginsSettings:manage')
	@Post('/')
	async updatePluginSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdatePluginSettingsDto,
	) {
		return await this.pluginsSettingsService.updatePluginSettings(dto);
	}

	@Get('/merge-dev/integrations')
	async getMergeDevIntegrations(
		_req: AuthenticatedRequest,
		_res: Response,
	): Promise<MergeDevIntegrationsResponseDto> {
		const integrations = await this.pluginsSettingsService.getMergeDevIntegrations();
		return { integrations };
	}

	@Post('/merge-dev/link-token')
	async createMergeDevLinkToken(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: MergeDevLinkTokenRequestDto,
	): Promise<MergeDevLinkTokenResponseDto> {
		const linkToken = await this.pluginsSettingsService.createMergeDevLinkToken(
			req.user.email,
			dto.category,
		);
		return { linkToken };
	}

	@Post('/merge-dev/account-token')
	async getMergeDevAccountToken(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: MergeDevAccountTokenRequestDto,
	): Promise<MergeDevAccountTokenResponseDto> {
		const accountToken = await this.pluginsSettingsService.getMergeDevAccountToken(dto.publicToken);
		return { accountToken };
	}
}
