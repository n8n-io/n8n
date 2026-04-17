import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import { mapToCommunityPackage, mapToCommunityPackageList } from './community-packages.mapper';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

function sendResponseError(res: express.Response, error: ResponseError): express.Response {
	return res.status(error.httpStatusCode).json({ message: error.message });
}

export = {
	installPackage: [
		publicApiScope('communityPackage:install'),
		async (
			req: AuthenticatedRequest<
				Record<string, never>,
				unknown,
				{ name: string; version?: string; verify?: boolean }
			>,
			res: express.Response,
		): Promise<express.Response> => {
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
		async (
			_req: AuthenticatedRequest<Record<string, never>>,
			res: express.Response,
		): Promise<express.Response> => {
			const lifecycle = Container.get(CommunityPackagesLifecycleService);
			const packages = await lifecycle.listInstalledPackages();
			return res.json(mapToCommunityPackageList(packages));
		},
	],

	updatePackage: [
		publicApiScope('communityPackage:update'),
		async (
			req: AuthenticatedRequest<
				{ name: string },
				Record<string, never>,
				{ version?: string; verify?: boolean }
			>,
			res: express.Response,
		): Promise<express.Response> => {
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
		async (
			req: AuthenticatedRequest<{ name: string }>,
			res: express.Response,
		): Promise<express.Response> => {
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
