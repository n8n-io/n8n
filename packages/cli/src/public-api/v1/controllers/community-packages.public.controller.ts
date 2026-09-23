import {
	CommunityPackageListPublicDto,
	ListCommunityPackagesQueryDto,
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
	Delete,
	Get,
	Param,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import { toCommunityPackagePublic } from '@/public-api/v1/handlers/community-packages/community-packages.mapper';

@PublicApiController('/community-packages')
export class CommunityPackagesPublicController {
	constructor(
		private readonly communityPackagesLifecycleService: CommunityPackagesLifecycleService,
	) {}

	@Get('/')
	@ApiKeyScope('communityPackage:list')
	@ApiSummary('List installed community packages')
	@ApiDescription('Retrieve all installed community packages with pending update info.')
	@ApiTags(['CommunityPackage'])
	@ApiResponse(200, CommunityPackageListPublicDto)
	async getInstalledPackages(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query _query: ListCommunityPackagesQueryDto,
	): Promise<CommunityPackageListPublicDto> {
		const packages = await this.communityPackagesLifecycleService.listInstalledPackages();

		return packages.map(toCommunityPackagePublic);
	}

	@Delete('/:name')
	@ApiKeyScope('communityPackage:uninstall')
	@ApiSummary('Uninstall a community package')
	@ApiDescription('Uninstall a community package by name.')
	@ApiTags(['CommunityPackage'])
	@ApiResponse(204)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async uninstallPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('name', communityPackageNameParamSchema) packageName: string,
	): Promise<void> {
		await this.communityPackagesLifecycleService.uninstall(packageName, req.user, 'notFound');
	}
}
