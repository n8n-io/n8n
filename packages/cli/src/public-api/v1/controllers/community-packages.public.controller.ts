import {
	CommunityPackageListPublicDto,
	CommunityPackagePublicDto,
	InstallCommunityPackagePublicDto,
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
} from '@n8n/decorators';
import type { Response } from 'express';
import type { PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

const tags = ['CommunityPackage'];

const toIsoString = (value: Date | string): string =>
	value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const optionalString = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : undefined;

const optionalBoolean = (value: unknown): boolean | undefined =>
	typeof value === 'boolean' ? value : undefined;

const toInstalledNodePublicDto = (node: PublicInstalledNode): Record<string, unknown> => {
	const { package: _package, ...publicNode } = node;
	return publicNode;
};

const toCommunityPackagePublicDto = (pkg: PublicInstalledPackage): CommunityPackagePublicDto => ({
	packageName: pkg.packageName,
	installedVersion: pkg.installedVersion,
	authorName: optionalString(pkg.authorName),
	authorEmail: optionalString(pkg.authorEmail),
	installedNodes: pkg.installedNodes.map(toInstalledNodePublicDto),
	createdAt: toIsoString(pkg.createdAt),
	updatedAt: toIsoString(pkg.updatedAt),
	updateAvailable: optionalString(pkg.updateAvailable),
	failedLoading: optionalBoolean(pkg.failedLoading),
});

@PublicApiController('/community-packages')
export class CommunityPackagesPublicController {
	constructor(
		private readonly communityPackagesLifecycleService: CommunityPackagesLifecycleService,
	) {}

	@Post('/')
	@ApiKeyScope('communityPackage:install')
	@ApiSummary('Install a community package')
	@ApiDescription('Install a community package by npm name and optional version.')
	@ApiTags(tags)
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

		return toCommunityPackagePublicDto(installedPackage);
	}

	@Get('/')
	@ApiKeyScope('communityPackage:list')
	@ApiSummary('List installed community packages')
	@ApiDescription('Retrieve all installed community packages with pending update info.')
	@ApiTags(tags)
	@ApiResponse(200, CommunityPackageListPublicDto)
	async getInstalledPackages(): Promise<CommunityPackageListPublicDto> {
		const packages = await this.communityPackagesLifecycleService.listInstalledPackages();
		return packages.map(toCommunityPackagePublicDto);
	}

	@Patch('/:packageName')
	@ApiKeyScope('communityPackage:update')
	@ApiSummary('Update a community package')
	@ApiDescription('Update an installed community package to a new version.')
	@ApiTags(tags)
	@ApiResponse(200, CommunityPackagePublicDto)
	@ApiErrorResponse(404)
	async updatePackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('packageName', communityPackageNameParamSchema) packageName: string,
		@Body({ required: false }) body: UpdateCommunityPackagePublicDto,
	): Promise<CommunityPackagePublicDto> {
		const updatedPackage = await this.communityPackagesLifecycleService.update(
			{ name: packageName, version: body.version, verify: body.verify ?? true },
			req.user,
			'notFound',
		);

		return toCommunityPackagePublicDto(updatedPackage);
	}

	@Delete('/:packageName')
	@ApiKeyScope('communityPackage:uninstall')
	@ApiSummary('Uninstall a community package')
	@ApiDescription('Uninstall a community package by name.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async uninstallPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('packageName', communityPackageNameParamSchema) packageName: string,
	): Promise<void> {
		await this.communityPackagesLifecycleService.uninstall(packageName, req.user, 'notFound');
	}
}
