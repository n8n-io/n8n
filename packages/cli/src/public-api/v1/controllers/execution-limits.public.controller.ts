import {
	InstanceExecutionLimitDto,
	PutInstanceExecutionLimitDto,
	type ExecutionLimitSettings,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { loginIdOf } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	GlobalScope,
	Licensed,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ServiceUnavailableError } from '@n8n/errors';
import type { Response } from 'express';

const tags = ['ExecutionLimits'];

function toInstanceExecutionLimitDto(settings: ExecutionLimitSettings): InstanceExecutionLimitDto {
	return {
		periodUnit: settings.periodUnit,
		maxExecutions: settings.instanceMaxExecutions,
		defaultProjectMaxExecutions: settings.defaultProjectMaxExecutions,
		version: settings.version,
	};
}

@PublicApiController('/execution-limits')
export class ExecutionLimitsPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!this.moduleRegistry.isActive('execution-limits')) {
			throw new ServiceUnavailableError('Execution limits module is not enabled');
		}
		const { ExecutionLimitsService } = await import('@n8n/backend-module-execution-limits');
		return Container.get(ExecutionLimitsService);
	}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.EXECUTION_LIMITS)
	@ApiKeyScope('executionLimit:read')
	@GlobalScope('executionLimit:read')
	@ApiSummary('Preview: Retrieve the instance execution limit')
	@ApiDescription(
		'**Preview** — breaking changes may still occur without major version bump.\n\nReturns the instance execution limit, the calendar period, the current `version`, and `defaultProjectMaxExecutions`. Each new team project gets this limit when it is created. Existing projects keep their limits. A fresh instance returns `periodUnit: "month"`, `maxExecutions: null`, `defaultProjectMaxExecutions: null`, and `version: 0`.',
	)
	@ApiTags(tags)
	@ApiResponse(200, InstanceExecutionLimitDto)
	@ApiErrorResponse(503)
	async getInstanceExecutionLimit(): Promise<InstanceExecutionLimitDto> {
		const settings = await (await this.service()).getSettings();

		return toInstanceExecutionLimitDto(settings);
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.EXECUTION_LIMITS)
	@ApiKeyScope('executionLimit:update')
	@GlobalScope('executionLimit:update')
	@ApiSummary('Preview: Replace the instance execution limit')
	@ApiDescription(
		'**Preview** — breaking changes may still occur without major version bump.\n\nReplaces the instance execution limit settings with the provided full object. Every field is required; a `GET` response is a valid `PUT` body. `defaultProjectMaxExecutions` cannot be above `maxExecutions`. Each new team project gets this limit when it is created. Existing projects keep their limits. `version` must equal the version from the last read; a stale version is rejected with 409 and nothing changes.',
	)
	@ApiTags(tags)
	@ApiResponse(200, InstanceExecutionLimitDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putInstanceExecutionLimit(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutInstanceExecutionLimitDto,
	): Promise<InstanceExecutionLimitDto> {
		const settings = await (await this.service()).updateSettings(
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
