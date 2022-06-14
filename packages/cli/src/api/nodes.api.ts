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
	hasPackageLoadedSuccessfully,
	removePackageFromMissingList,
	parsePackageName,
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
		let parsedPackageName;
		try {
			parsedPackageName = parsePackageName(name);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			throw new ResponseHelper.ResponseError(error.message, undefined, 400);
		}

		// Only install packages that haven't been installed
		// or that have failed loading
		const installedPackageInstalled = await searchInstalledPackage(parsedPackageName.packageName);
		const loadedPackage = hasPackageLoadedSuccessfully(name);
		if (installedPackageInstalled && loadedPackage) {
			throw new ResponseHelper.ResponseError(
				`Package "${parsedPackageName.packageName}" is already installed. For updating, click the corresponding button.`,
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
			const installedPackage = await LoadNodesAndCredentials().loadNpmModule(
				parsedPackageName.packageName,
				parsedPackageName.version,
			);

			if (!loadedPackage) {
				removePackageFromMissingList(name);
			}

			// Inform the connected frontends that new nodes are available
			installedPackage.installedNodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', {
					name: nodeData.name,
					version: nodeData.latestVersion,
				});
			});

			return installedPackage;
		} catch (error) {
			let statusCode = 500;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			const errorMessage = error.message as string;
			if (
				errorMessage.includes(RESPONSE_ERROR_MESSAGES.PACKAGE_VERSION_NOT_FOUND) ||
				errorMessage.includes(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES)
			) {
				statusCode = 400;
			}
			throw new ResponseHelper.ResponseError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				`Error loading package "${name}": ${error.message}`,
				undefined,
				statusCode,
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
				// eslint-disable-next-line prettier/prettier
				hydratedPackages = matchMissingPackages(hydratedPackages, config.get('nodes.packagesMissing'));
			}
		} catch (error) {
			// Do nothing if setting is missing
		}
		return hydratedPackages;
	}),
);

// Uninstall credentials/nodes from npm
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
		const packagePreviouslyInstalled = await searchInstalledPackage(name);

		if (!packagePreviouslyInstalled) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED,
				undefined,
				400,
			);
		}

		try {
			const newInstalledPackage = await LoadNodesAndCredentials().updateNpmModule(
				name,
				packagePreviouslyInstalled.installedNodes,
			);

			// Inform the connected frontends that new nodes are available
			packagePreviouslyInstalled.installedNodes.forEach((installedNode) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: installedNode.type,
					version: installedNode.latestVersion,
				});
			});

			newInstalledPackage.installedNodes.forEach((nodeData) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('reloadNodeType', {
					name: nodeData.name,
					version: nodeData.latestVersion,
				});
			});
			return newInstalledPackage;
		} catch (error) {
			packagePreviouslyInstalled.installedNodes.forEach((installedNode) => {
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
