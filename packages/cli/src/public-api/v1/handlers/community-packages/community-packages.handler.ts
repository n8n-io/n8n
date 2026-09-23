import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import {
	toCommunityPackageListPublicDto,
	toCommunityPackagePublicDto,
} from './community-packages.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

type UpdatePackageRequest = AuthenticatedRequest<
	{ name: string },
	{},
	{ version?: string; verify?: boolean }
>;

type CommunityPackageHandlers = {
	getInstalledPackages: PublicAPIEndpoint<AuthenticatedRequest>;
	updatePackage: PublicAPIEndpoint<UpdatePackageRequest>;
	uninstallPackage: PublicAPIEndpoint<AuthenticatedRequest<{ name: string }>>;
};

const communityPackageHandlers: CommunityPackageHandlers = {
	getInstalledPackages: [
		publicApiScope('communityPackage:list'),
		async (_req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);
			const packages = await lifecycle.listInstalledPackages();
			return res.json(toCommunityPackageListPublicDto(packages));
		},
	],

	updatePackage: [
		publicApiScope('communityPackage:update'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			const updated = await lifecycle.update(
				{
					name: req.params.name,
					version: req.body?.version,
					verify: req.body?.verify ?? true,
				},
				req.user,
				'notFound',
			);
			return res.json(toCommunityPackagePublicDto(updated));
		},
	],

	uninstallPackage: [
		publicApiScope('communityPackage:uninstall'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			await lifecycle.uninstall(req.params.name, req.user, 'notFound');
			return res.status(204).send();
		},
	],
};

export = communityPackageHandlers;
