import {
	SaveSelfHealingConfigurationDto,
	SetSelfHealingConfigurationEnabledDto,
	UpdateSelfHealingConfigurationDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Middleware, Patch, Post, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { NextFunction, Response } from 'express';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';

import { SelfHealingConfigurationService } from './self-healing-configuration.service';

type ConfigurationRequest = AuthenticatedRequest<{ projectId: string; configurationId: string }>;

function configurationId(req: ConfigurationRequest) {
	const id = Number(req.params.configurationId);
	if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestError('Invalid configuration ID.');
	return id;
}

@RestController('/projects/:projectId/self-healing-configurations')
export class SelfHealingConfigurationsController {
	constructor(private readonly configurations: SelfHealingConfigurationService) {}

	@Middleware()
	async checkAccess(req: ConfigurationRequest, res: Response, next: NextFunction) {
		if (!(await this.configurations.canConfigure(req.user, req.params.projectId))) {
			res.status(403).json({ status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
			return;
		}
		next();
	}

	@Get('/')
	async list(req: ConfigurationRequest) {
		return await this.configurations.list(req.params.projectId);
	}

	@Get('/options')
	async options(req: ConfigurationRequest) {
		return await this.configurations.getConfigurationChoices(req.params.projectId);
	}

	@Get('/:configurationId')
	async get(req: ConfigurationRequest) {
		return await this.configurations.get(req.params.projectId, configurationId(req));
	}

	@Post('/')
	async create(
		req: ConfigurationRequest,
		_res: Response,
		@Body input: SaveSelfHealingConfigurationDto,
	) {
		return await this.configurations.save(req.user, req.params.projectId, input);
	}

	@Patch('/:configurationId')
	async update(
		req: ConfigurationRequest,
		_res: Response,
		@Body input: UpdateSelfHealingConfigurationDto,
	) {
		return await this.configurations.save(
			req.user,
			req.params.projectId,
			input,
			configurationId(req),
		);
	}

	@Patch('/:configurationId/enabled')
	async setEnabled(
		req: ConfigurationRequest,
		_res: Response,
		@Body input: SetSelfHealingConfigurationEnabledDto,
	) {
		return await this.configurations.setEnabled(
			req.user,
			req.params.projectId,
			configurationId(req),
			input.enabled,
		);
	}

	@Delete('/:configurationId')
	async remove(req: ConfigurationRequest) {
		await this.configurations.remove(req.params.projectId, configurationId(req));
	}
}
