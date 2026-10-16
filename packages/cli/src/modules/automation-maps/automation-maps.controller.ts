import { CreateAutomationMapDto, UpdateAutomationMapDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@n8n/decorators';

import { AutomationMapsService } from './automation-maps.service';

@RestController('/automation-maps')
export class AutomationMapsController {
	constructor(private readonly automationMapsService: AutomationMapsService) {}

	@Get('/')
	async list(req: AuthenticatedRequest) {
		return await this.automationMapsService.list(req.user);
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: unknown, @Body body: CreateAutomationMapDto) {
		return await this.automationMapsService.create(req.user, body.prompt);
	}

	@Get('/:id')
	async get(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		return await this.automationMapsService.get(req.user, id);
	}

	@Patch('/:id')
	async update(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body body: UpdateAutomationMapDto,
	) {
		return await this.automationMapsService.update(req.user, id, body);
	}

	@Post('/:id/refresh')
	async refresh(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		return await this.automationMapsService.refresh(req.user, id);
	}

	@Delete('/:id')
	async delete(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		await this.automationMapsService.delete(req.user, id);
		return { success: true };
	}
}
