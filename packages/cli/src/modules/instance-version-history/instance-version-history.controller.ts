import { VersionQueryDto, VersionSinceDateQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { InstanceVersionHistoryService } from './instance-version-history.service';

@RestController('/instance-version-history')
export class InstanceVersionHistoryController {
	constructor(private readonly service: InstanceVersionHistoryService) {}

	@Get('/min-version-since')
	async getMinVersionSince(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: VersionSinceDateQueryDto,
	) {
		const version = await this.service.getMinVersionSince(query.since);
		return { version: version ?? null };
	}

	@Get('/date-since-version')
	async getDateSinceVersion(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: VersionQueryDto,
	) {
		const date = await this.service.getDateSinceContinuouslyAtLeastVersion({
			major: query.major,
			minor: query.minor,
			patch: query.patch,
		});
		return { date: date?.toISOString() ?? null };
	}

	@Get('/current')
	async getCurrentVersionDate() {
		const result = await this.service.getCurrentVersionDate();
		if (!result) return { version: null, createdAt: null };
		return {
			version: { major: result.major, minor: result.minor, patch: result.patch },
			createdAt: result.createdAt.toISOString(),
		};
	}

	@Get('/first-adoption')
	async getFirstAdoption(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: VersionQueryDto,
	) {
		const date = await this.service.getFirstAdoptionDate({
			major: query.major,
			minor: query.minor,
			patch: query.patch,
		});
		return { date: date?.toISOString() ?? null };
	}
}
