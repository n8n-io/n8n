import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import { toCommunityPackagePublic } from './community-packages.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

type InstallPackageRequest = AuthenticatedRequest<
	{},
	{},
	{ name: string; version?: string; verify?: boolean }
>;

type UpdatePackageRequest = AuthenticatedRequest<
	{ name: string },
	{},
	{ version?: string; verify?: boolean }
>;

type CommunityPackageHandlers = {
	installPackage: PublicAPIEndpoint<InstallPackageRequest>;
	updatePackage: PublicAPIEndpoint<UpdatePackageRequest>;
	uninstallPackage: PublicAPIEndpoint<AuthenticatedRequest<{ name: string }>>;
};

const communityPackageHandlers: CommunityPackageHandlers = {
	installPackage: [
		publicApiScope('communityPackage:install'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			const installedPackage = await lifecycle.install(
				{ name: req.body.name, version: req.body.version, verify: req.body.verify ?? true },
				req.user,
				'publicApi',
			);

			return res.json(toCommunityPackagePublic(installedPackage));
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
			return res.json(toCommunityPackagePublic(updated));
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
