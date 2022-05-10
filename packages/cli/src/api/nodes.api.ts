/* eslint-disable import/no-cycle */
import express = require('express');
import { LoggerProxy, PublicInstalledPackage } from 'n8n-workflow';
import { getLogger } from '../Logger';

import { ResponseHelper, LoadNodesAndCredentials, Push } from '..';
import { NodeRequest } from '../requests';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import {
	matchMissingPackages,
	matchPackagesWithUpdates,
	executeCommand,
	checkPackageStatus,
} from '../CommunityNodes/helpers';
import {
	getAllInstalledPackages,
	removePackageFromDatabase,
	searchInstalledPackage,
} from '../CommunityNodes/packageModel';
import { isAuthenticatedRequest } from '../UserManagement/UserManagementHelper';
import config = require('../../config');
import { NpmUpdatesAvailable } from '../Interfaces';

export const nodesController = express.Router();

/**
 * Initialize Logger if needed
 */
nodesController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

nodesController.use((req, res, next) => {
	if (!isAuthenticatedRequest(req) || req.user.globalRole.name !== 'owner') {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
		return;
	}
	next();
});

nodesController.use((req, res, next) => {
	if (config.getEnv('executions.mode') === 'queue' && req.method !== 'GET') {
		res.status(400).json({
			status: 'error',
			message: 'Package management is disabled when running in "queue" mode',
		});
		return;
	}
	next();
});

nodesController.post(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Post) => {
		const { name } = req.body;
		if (!name) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NAME_NOT_PROVIDED,
				undefined,
				400,
			);
		}

		const installedPackage = await searchInstalledPackage(name);
		if (installedPackage) {
			throw new ResponseHelper.ResponseError(
				`Package "${name}" is already installed. For updating, click the corresponding button.`,
				undefined,
				400,
			);
		}

		const packageStatus = await checkPackageStatus(name);
		if (packageStatus.status !== 'OK') {
			throw new ResponseHelper.ResponseError(
				`Package "${name}" has been banned from n8n's repository and will not be installed`,
				undefined,
				400,
			);
		}

		try {
			const nodes = await LoadNodesAndCredentials().loadNpmModule(name);

			// Inform the connected frontends that new nodes are available
			nodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', nodeData);
			});

			return {
				nodes,
			};
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error loading package "${name}": ${error.message}`,
				undefined,
				500,
			);
		}
	}),
);

// Install new credentials/nodes from npm
nodesController.get(
	'/',
	ResponseHelper.send(async (): Promise<PublicInstalledPackage[]> => {
		const packages = await getAllInstalledPackages();

		if (packages.length === 0) {
			return packages;
		}

		let pendingUpdates: NpmUpdatesAvailable | undefined;
		try {
			// Command succeeds when there are no updates.
			// NPM handles this oddly. It exits with code 1 when there are updates.
			// More here: https://github.com/npm/rfcs/issues/473
			await executeCommand('npm outdated --json');
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			if (error.code === 1) {
				// Updates available
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				pendingUpdates = JSON.parse(error.stdout);
			}
		}
		let hydratedPackages = matchPackagesWithUpdates(packages, pendingUpdates);
		try {
			if (config.get('nodes.packagesMissing')) {
				hydratedPackages = matchMissingPackages(packages, config.get('nodes.packagesMissing'));
			}
		} catch (error) {
			// Do nothing if setting is missing
		}
		return hydratedPackages;
	}),
);

// Install new credentials/nodes from npm
nodesController.delete(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Delete) => {
		const { name } = req.body;
		if (!name) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NAME_NOT_PROVIDED,
				undefined,
				400,
			);
		}

		const installedPackage = await searchInstalledPackage(name);

		if (!installedPackage) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED,
				undefined,
				400,
			);
		}

		try {
			void (await LoadNodesAndCredentials().removeNpmModule(name, installedPackage.installedNodes));

			// Inform the connected frontends that new nodes are available
			installedPackage.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error removing package "${name}": ${error.message}`,
				undefined,
				500,
			);
		}

		void (await removePackageFromDatabase(installedPackage));
	}),
);

// Update a package
nodesController.patch(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Update) => {
		const { name } = req.body;
		if (!name) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NAME_NOT_PROVIDED,
				undefined,
				400,
			);
		}
		const installedPackage = await searchInstalledPackage(name);

		if (!installedPackage) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED,
				undefined,
				400,
			);
		}

		try {
			const installedNodes = await LoadNodesAndCredentials().updateNpmModule(
				name,
				installedPackage.installedNodes,
			);

			// Inform the connected frontends that new nodes are available
			installedPackage.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});

			installedNodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', nodeData);
			});
		} catch (error) {
			installedPackage.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error updating package "${name}": ${error.message}`,
				undefined,
				500,
			);
		}
	}),
);
