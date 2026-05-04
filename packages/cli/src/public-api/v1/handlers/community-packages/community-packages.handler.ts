import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import { mapToCommunityPackage, mapToCommunityPackageList } from './community-packages.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

function sendResponseError(res: Response, error: ResponseError): Response {
	return res.status(error.httpStatusCode).json({ message: error.message });
}

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
	getInstalledPackages: PublicAPIEndpoint<AuthenticatedRequest>;
	updatePackage: PublicAPIEndpoint<UpdatePackageRequest>;
	uninstallPackage: PublicAPIEndpoint<AuthenticatedRequest<{ name: string }>>;
};

const communityPackageHandlers: CommunityPackageHandlers = {
	installPackage: [
		publicApiScope('communityPackage:install'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			try {
				const installedPackage = await lifecycle.install(
					{ name: req.body.name, version: req.body.version, verify: req.body.verify ?? true },
					req.user,
					'publicApi',
				);
				return res.json(mapToCommunityPackage(installedPackage));
			} catch (error) {
				if (error instanceof ResponseError) {
					return sendResponseError(res, error);
				}
				throw error;
			}
		},
	],

	getInstalledPackages: [
		publicApiScope('communityPackage:list'),
		async (_req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);
			const packages = await lifecycle.listInstalledPackages();
			return res.json(mapToCommunityPackageList(packages));
		},
	],

	updatePackage: [
		publicApiScope('communityPackage:update'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			try {
				const updated = await lifecycle.update(
					{
						name: req.params.name,
						version: req.body?.version,
						verify: req.body?.verify ?? true,
					},
					req.user,
					'notFound',
				);
				return res.json(mapToCommunityPackage(updated));
			} catch (error) {
				if (error instanceof ResponseError) {
					return sendResponseError(res, error);
				}
				throw error;
			}
		},
	],

	uninstallPackage: [
		publicApiScope('communityPackage:uninstall'),
		async (req, res) => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);

			try {
				await lifecycle.uninstall(req.params.name, req.user, 'notFound');
				return res.status(204).send();
			} catch (error) {
				if (error instanceof ResponseError) {
					return sendResponseError(res, error);
				}
				throw error;
			}
		},
	],
};

export = communityPackageHandlers;
