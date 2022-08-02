/* eslint-disable import/no-cycle */
import express from 'express';
import { PublicInstalledPackage } from 'n8n-workflow';

import config from '../../config';
import { ResponseHelper, LoadNodesAndCredentials, Push, InternalHooksManager } from '..';

import { RESPONSE_ERROR_MESSAGES, UNKNOWN_FAILURE_REASON } from '../constants';
import {
	matchMissingPackages,
	matchPackagesWithUpdates,
	executeCommand,
	checkNpmPackageStatus,
	hasPackageLoaded,
	removePackageFromMissingList,
	parseNpmPackageName,
	isClientError,
	sanitizeNpmPackageName,
	isNpmError,
} from '../CommunityNodes/helpers';
import {
	getAllInstalledPackages,
	findInstalledPackage,
	isPackageInstalled,
} from '../CommunityNodes/packageModel';
import { isAuthenticatedRequest } from '../UserManagement/UserManagementHelper';

import type { NodeRequest } from '../requests';
import type { CommunityPackages } from '../Interfaces';
import { InstalledPackages } from '../databases/entities/InstalledPackages';

const { PACKAGE_NOT_INSTALLED, PACKAGE_NAME_NOT_PROVIDED } = RESPONSE_ERROR_MESSAGES;

export const nodesController = express.Router();

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

/**
 * POST /nodes
 *
 * Install an n8n community package
 */
nodesController.post(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Post) => {
		const { name } = req.body;

		if (!name) {
			throw new ResponseHelper.ResponseError(PACKAGE_NAME_NOT_PROVIDED, undefined, 400);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = parseNpmPackageName(name);
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				error instanceof Error ? error.message : 'Failed to parse package name',
				undefined,
				400,
			);
		}

		const isInstalled = await isPackageInstalled(parsed.packageName);
		const hasLoaded = hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			throw new ResponseHelper.ResponseError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
				undefined,
				400,
			);
		}

		const packageStatus = await checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new ResponseHelper.ResponseError(
				`Package "${name}" is banned so it cannot be installed`,
				undefined,
				400,
			);
		}

		let installedPackage: InstalledPackages;

		try {
			installedPackage = await LoadNodesAndCredentials().loadNpmModule(
				parsed.packageName,
				parsed.version,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			void InternalHooksManager.getInstance().onCommunityPackageInstallFinished({
				user_id: req.user.id,
				input_string: name,
				package_name: parsed.packageName,
				success: false,
				package_version: parsed.version,
				failure_reason: errorMessage,
			});

			const message = [`Error loading package "${name}"`, errorMessage].join(':');

			const clientError = error instanceof Error ? isClientError(error) : false;

			throw new ResponseHelper.ResponseError(message, undefined, clientError ? 400 : 500);
		}

		if (!hasLoaded) removePackageFromMissingList(name);

		const pushInstance = Push.getInstance();

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			pushInstance.send('reloadNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void InternalHooksManager.getInstance().onCommunityPackageInstallFinished({
			user_id: req.user.id,
			input_string: name,
			package_name: parsed.packageName,
			success: true,
			package_version: parsed.version,
			package_node_names: installedPackage.installedNodes.map((node) => node.name),
			package_author: installedPackage.authorName,
			package_author_email: installedPackage.authorEmail,
		});

		return installedPackage;
	}),
);

/**
 * GET /nodes
 *
 * Retrieve list of installed n8n community packages
 */
nodesController.get(
	'/',
	ResponseHelper.send(async (): Promise<PublicInstalledPackage[]> => {
		const installedPackages = await getAllInstalledPackages();

		if (installedPackages.length === 0) return [];

		let pendingUpdates: CommunityPackages.AvailableUpdates | undefined;

		try {
			const command = ['npm', 'outdated', '--json'].join(' ');
			await executeCommand(command, { doNotHandleError: true });
		} catch (error) {
			// when there are updates, npm exits with code 1
			// when there are no updates, command succeeds
			// https://github.com/npm/rfcs/issues/473

			if (isNpmError(error) && error.code === 1) {
				pendingUpdates = JSON.parse(error.stdout) as CommunityPackages.AvailableUpdates;
			}
		}

		let hydratedPackages = matchPackagesWithUpdates(installedPackages, pendingUpdates);

		try {
			const missingPackages = config.get('nodes.packagesMissing') as string | undefined;

			if (missingPackages) {
				hydratedPackages = matchMissingPackages(hydratedPackages, missingPackages);
			}
		} catch (_) {
			// Do nothing if setting is missing
		}

		return hydratedPackages;
	}),
);

/**
 * DELETE /nodes
 *
 * Uninstall an installed n8n community package
 */
nodesController.delete(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Delete) => {
		const { name } = req.body;

		if (!name) {
			throw new ResponseHelper.ResponseError(PACKAGE_NAME_NOT_PROVIDED, undefined, 400);
		}

		try {
			sanitizeNpmPackageName(name);
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			throw new ResponseHelper.ResponseError(message, undefined, 400);
		}

		const installedPackage = await findInstalledPackage(name);

		if (!installedPackage) {
			throw new ResponseHelper.ResponseError(PACKAGE_NOT_INSTALLED, undefined, 400);
		}

		try {
			await LoadNodesAndCredentials().removeNpmModule(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new ResponseHelper.ResponseError(message, undefined, 500);
		}

		const pushInstance = Push.getInstance();

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			pushInstance.send('removeNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void InternalHooksManager.getInstance().onCommunityPackageDeleteFinished({
			user_id: req.user.id,
			package_name: name,
			package_version: installedPackage.installedVersion,
			package_node_names: installedPackage.installedNodes.map((node) => node.name),
			package_author: installedPackage.authorName,
			package_author_email: installedPackage.authorEmail,
		});
	}),
);

/**
 * PATCH /nodes
 *
 * Update an installed n8n community package
 */
nodesController.patch(
	'/',
	ResponseHelper.send(async (req: NodeRequest.Update) => {
		const { name } = req.body;

		if (!name) {
			throw new ResponseHelper.ResponseError(PACKAGE_NAME_NOT_PROVIDED, undefined, 400);
		}

		const previouslyInstalledPackage = await findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			throw new ResponseHelper.ResponseError(PACKAGE_NOT_INSTALLED, undefined, 400);
		}

		try {
			const newInstalledPackage = await LoadNodesAndCredentials().updateNpmModule(
				parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
			);

			const pushInstance = Push.getInstance();

			// broadcast to connected frontends that node list has been updated
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				pushInstance.send('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			newInstalledPackage.installedNodes.forEach((node) => {
				pushInstance.send('reloadNodeType', {
					name: node.name,
					version: node.latestVersion,
				});
			});

			void InternalHooksManager.getInstance().onCommunityPackageUpdateFinished({
				user_id: req.user.id,
				package_name: name,
				package_version_current: previouslyInstalledPackage.installedVersion,
				package_version_new: newInstalledPackage.installedVersion,
				package_node_names: newInstalledPackage.installedNodes.map((node) => node.name),
				package_author: newInstalledPackage.authorName,
				package_author_email: newInstalledPackage.authorEmail,
			});

			return newInstalledPackage;
		} catch (error) {
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				const pushInstance = Push.getInstance();
				pushInstance.send('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new ResponseHelper.ResponseError(message, undefined, 500);
		}
	}),
);
