import { Delete, Get, Patch, Post, RestController, GlobalScope } from '@n8n/decorators';

import { NodeRequest } from '@/requests';

import { CommunityPackagesLifecycleService } from './community-packages.lifecycle.service';

@RestController('/community-packages')
export class CommunityPackagesController {
	constructor(private readonly communityPackagesLifecycle: CommunityPackagesLifecycleService) {}

	@Post('/')
	@GlobalScope('communityPackage:install')
	async installPackage(req: NodeRequest.Post) {
		const { name, verify, version } = req.body;

		return await this.communityPackagesLifecycle.install({ name, verify, version }, req.user, 'ui');
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
	async updatePackage(req: NodeRequest.Update) {
		const { name, version, checksum } = req.body;

		return await this.communityPackagesLifecycle.update(
			{ name, version, checksum },
			req.user,
			'badRequest',
		);
	}
}
