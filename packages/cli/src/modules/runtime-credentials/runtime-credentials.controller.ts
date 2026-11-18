import {
	UpdateRuntimeCredentialRulesDto,
	type RuntimeCredentialRulesResponse,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Put, RestController } from '@n8n/decorators';
import { BadRequestError, UserError } from '@n8n/errors';
import type { Response } from 'express';

import { RuntimeCredentialsService } from './runtime-credentials.service';

@RestController('/runtime-credentials')
export class RuntimeCredentialsController {
	constructor(
		private readonly runtimeCredentialsService: RuntimeCredentialsService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {}

	@Get('/rules')
	@GlobalScope('securitySettings:manage')
	async getRules(): Promise<RuntimeCredentialRulesResponse> {
		return { rules: this.runtimeCredentialsService.getRules() };
	}

	@Put('/rules')
	@GlobalScope('securitySettings:manage')
	async updateRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateRuntimeCredentialRulesDto,
	): Promise<RuntimeCredentialRulesResponse> {
		try {
			await this.runtimeCredentialsService.saveRules(body.rules);
		} catch (error) {
			if (error instanceof UserError) throw new BadRequestError(error.message);
			throw error;
		}

		try {
			// The credential modal reads the alias list from the module settings.
			await this.moduleRegistry.refreshModuleSettings('runtime-credentials');
		} catch (error) {
			this.logger.error('Failed to refresh the runtime credentials module settings', { error });
		}

		return { rules: this.runtimeCredentialsService.getRules() };
	}
}
