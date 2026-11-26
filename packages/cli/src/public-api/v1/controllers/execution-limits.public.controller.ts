import {
	InstanceExecutionLimitDto,
	PutInstanceExecutionLimitDto,
	toInstanceExecutionLimit,
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

/**
 * Public API surface for execution limits. Delegates to the same `ExecutionLimitsService`
 * methods and DTOs as the internal `/rest/execution-limits` controller.
 */
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
		'**Preview** — breaking changes may still occur without major version bump.\n\nReturns the instance execution limit, the period unit, the default limit for new team projects, and the current version. A fresh instance returns `periodUnit: month`, `maxExecutions: null`, `defaultProjectMaxExecutions: null`, and `version: 0`. Each new team project gets `defaultProjectMaxExecutions` as its own limit when it is created. Existing projects keep their limits.',
	)
	@ApiTags(tags)
	@ApiResponse(200, InstanceExecutionLimitDto)
	@ApiErrorResponse(503)
	async getInstanceExecutionLimit(): Promise<InstanceExecutionLimitDto> {
		const settings = await (await this.service()).getSettings();

		return toInstanceExecutionLimit(settings);
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.EXECUTION_LIMITS)
	@ApiKeyScope('executionLimit:update')
	@GlobalScope('executionLimit:update')
	@ApiSummary('Preview: Replace the instance execution limit')
	@ApiDescription(
		'**Preview** — breaking changes may still occur without major version bump.\n\nReplaces the instance execution limit settings. All four fields are required, and a `GET` response is a valid `PUT` body. `defaultProjectMaxExecutions` cannot be above `maxExecutions`. Each new team project gets `defaultProjectMaxExecutions` as its own limit when it is created. Existing projects keep their limits. `version` must equal the version from the last read; a stale version is rejected with 409 without changes.',
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
		const saved = await (await this.service()).updateSettings(
			{
				periodUnit: dto.periodUnit,
				instanceMaxExecutions: dto.maxExecutions,
				defaultProjectMaxExecutions: dto.defaultProjectMaxExecutions,
			},
			dto.version,
			req.user.id,
			loginIdOf(req.ctx),
		);

		return toInstanceExecutionLimit(saved);
	}
}
