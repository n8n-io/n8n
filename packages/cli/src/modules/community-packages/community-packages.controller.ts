import { CommunityPackageRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, RestController, GlobalScope } from '@n8n/decorators';

import type { NodeRequest } from '@/requests';

import { CommunityPackagesLifecycleService } from './community-packages.lifecycle.service';

@RestController('/community-packages')
export class CommunityPackagesController {
	constructor(private readonly communityPackagesLifecycle: CommunityPackagesLifecycleService) {}

	@Post('/')
	@GlobalScope('communityPackage:install')
	async installPackage(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CommunityPackageRequestDto,
	) {
		return await this.communityPackagesLifecycle.install(body, req.user, 'ui');
	}

	@Get('/')
	@GlobalScope('communityPackage:list')
	async getInstalledPackages() {
		return await this.communityPackagesLifecycle.listInstalledPackages();
	}

	@Delete('/')
	@GlobalScope('communityPackage:uninstall')
	async uninstallPackage(req: NodeRequest.Delete) {
		const { name } = req.query;

		await this.communityPackagesLifecycle.uninstall(name, req.user, 'badRequest');
	}

	@Patch('/')
	@GlobalScope('communityPackage:update')
	async updatePackage(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CommunityPackageRequestDto,
	) {
		return await this.communityPackagesLifecycle.update(body, req.user, 'badRequest');
	}
}
