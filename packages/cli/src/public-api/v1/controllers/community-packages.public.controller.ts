import {
	CommunityPackageListPublicDto,
	CommunityPackagePublicDto,
	InstallCommunityPackagePublicDto,
	ListCommunityPackagesQueryDto,
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
	Delete,
	Get,
	Param,
	Patch,
	Post,
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
		const installedPackage = await this.communityPackagesLifecycleService.install(
			{ name: body.name, version: body.version, verify: body.verify ?? true },
			req.user,
			'publicApi',
		);

		return CommunityPackagePublicDto.parse(toCommunityPackagePublic(installedPackage));
	}

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

		return CommunityPackagePublicDto.parse(toCommunityPackagePublic(updated));
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
