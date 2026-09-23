import {
	CommunityPackagePublicDto,
	UpdateCommunityPackagePublicDto,
	communityPackageNameParamSchema,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Param,
	Patch,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import { mapToCommunityPackage } from '@/public-api/v1/handlers/community-packages/community-packages.mapper';

@PublicApiController('/community-packages')
export class CommunityPackagesPublicController {
	constructor(
		private readonly communityPackagesLifecycleService: CommunityPackagesLifecycleService,
	) {}

	@Patch('/:name')
	@ApiKeyScope('communityPackage:update')
	@ApiSummary('Update a community package')
	@ApiDescription('Update an installed community package to a new version.')
	@ApiTags(['CommunityPackage'])
	@ApiResponse(200, CommunityPackagePublicDto)
	@ApiErrorResponse(404)
	async updatePackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('name', communityPackageNameParamSchema) name: string,
		@Body body: UpdateCommunityPackagePublicDto,
	): Promise<CommunityPackagePublicDto> {
		const updated = await this.communityPackagesLifecycleService.update(
			{ name, version: body.version, verify: body.verify ?? true },
			req.user,
			'notFound',
		);

		return mapToCommunityPackage(updated);
	}
}
