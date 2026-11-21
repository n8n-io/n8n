import {
	ASSISTANT_USAGE_MAX_RANGE_DAYS,
	AssistantUsageQueryDto,
	AssistantUsageUsersQueryDto,
	type AssistantUsageResponse,
	type AssistantUsageUsersResponse,
} from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';

import { AssistantUsageService } from './assistant-usage.service';

function assertValidRange({ startDate, endDate }: { startDate: Date; endDate: Date }) {
	if (startDate > endDate) {
		throw new BadRequestError('The start date must be before the end date');
	}
	if (
		endDate.getTime() - startDate.getTime() >
		ASSISTANT_USAGE_MAX_RANGE_DAYS * Time.days.toMilliseconds
	) {
		throw new BadRequestError(
			`The date range must not be longer than ${ASSISTANT_USAGE_MAX_RANGE_DAYS} days`,
		);
	}
}

/**
 * Usage of the n8n Assistant by the users of this instance, for admins. Loaded
 * only when the Assistant runs on the agents runtime, which records the usage.
 */
@RestController('/assistant/usage')
export class AssistantUsageController {
	constructor(private readonly usageService: AssistantUsageService) {}

	@Get('/')
	@GlobalScope('instanceAi:viewUsage')
	async getUsage(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: AssistantUsageQueryDto,
	): Promise<AssistantUsageResponse> {
		assertValidRange(query);
		return await this.usageService.getUsage(query);
	}

	@Get('/users')
	@GlobalScope('instanceAi:viewUsage')
	async getUsers(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: AssistantUsageUsersQueryDto,
	): Promise<AssistantUsageUsersResponse> {
		assertValidRange(query);
		return await this.usageService.getUsers(query);
	}
}
