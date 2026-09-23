import { CommunityPackagePublicDto, InstallCommunityPackagePublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import { toCommunityPackagePublicDto } from '@/public-api/v1/handlers/community-packages/community-packages.mapper';

@PublicApiController('/community-packages')
export class CommunityPackagesPublicController {
	constructor(private readonly communityPackagesLifecycle: CommunityPackagesLifecycleService) {}

	@Post('/')
	@ApiKeyScope('communityPackage:install')
	@ApiSummary('Install a community package')
	@ApiDescription('Install a community package by npm name and optional version.')
	@ApiTags(['CommunityPackage'])
	@ApiResponse(200, CommunityPackagePublicDto)
	async installPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: InstallCommunityPackagePublicDto,
	): Promise<CommunityPackagePublicDto> {
		const installedPackage = await this.communityPackagesLifecycle.install(
			{ name: body.name, version: body.version, verify: body.verify ?? true },
			req.user,
			'publicApi',
		);

		return toCommunityPackagePublicDto(installedPackage);
	}
}
