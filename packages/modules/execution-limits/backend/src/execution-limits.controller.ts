import {
	PutInstanceExecutionLimitDto,
	type ExecutionLimitSettings,
	type InstanceExecutionLimitDto,
} from '@n8n/api-types';
import { loginIdOf } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Put, RestController } from '@n8n/decorators';

import { ExecutionLimitsService } from './execution-limits.service';

function toInstanceExecutionLimitDto(settings: ExecutionLimitSettings): InstanceExecutionLimitDto {
	return {
		periodUnit: settings.periodUnit,
		maxExecutions: settings.instanceMaxExecutions,
		defaultProjectMaxExecutions: settings.defaultProjectMaxExecutions,
		version: settings.version,
	};
}

@RestController('/execution-limits')
export class ExecutionLimitsController {
	constructor(private readonly executionLimitsService: ExecutionLimitsService) {}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.EXECUTION_LIMITS)
	@GlobalScope('executionLimit:read')
	async getInstanceLimit(): Promise<InstanceExecutionLimitDto> {
		const settings = await this.executionLimitsService.getSettings();

		return toInstanceExecutionLimitDto(settings);
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.EXECUTION_LIMITS)
	@GlobalScope('executionLimit:update')
	async putInstanceLimit(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body dto: PutInstanceExecutionLimitDto,
	): Promise<InstanceExecutionLimitDto> {
		const settings = await this.executionLimitsService.updateSettings(
			{
				periodUnit: dto.periodUnit,
				instanceMaxExecutions: dto.maxExecutions,
				defaultProjectMaxExecutions: dto.defaultProjectMaxExecutions,
			},
			dto.version,
			req.user.id,
			loginIdOf(req.ctx),
		);

		return toInstanceExecutionLimitDto(settings);
	}
}
