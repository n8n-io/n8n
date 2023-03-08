import express from 'express';
import type { PublicInstalledPackage } from 'n8n-workflow';

import config from '@/config';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import * as ResponseHelper from '@/ResponseHelper';

import {
	checkNpmPackageStatus,
	executeCommand,
	hasPackageLoaded,
	isClientError,
	isNpmError,
	matchMissingPackages,
	matchPackagesWithUpdates,
	parseNpmPackageName,
	removePackageFromMissingList,
	sanitizeNpmPackageName,
} from '@/CommunityNodes/helpers';
import {
	findInstalledPackage,
	getAllInstalledPackages,
	isPackageInstalled,
} from '@/CommunityNodes/packageModel';
import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { isAuthenticatedRequest } from '@/UserManagement/UserManagementHelper';

import type { InstalledPackages } from '@db/entities/InstalledPackages';
import type { CommunityPackages } from '@/Interfaces';
import type { NodeRequest } from '@/requests';
import { Push } from '@/push';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';

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
			throw new ResponseHelper.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = parseNpmPackageName(name);
		} catch (error) {
			throw new ResponseHelper.BadRequestError(
				error instanceof Error ? error.message : 'Failed to parse package name',
			);
		}

		if (parsed.packageName === STARTER_TEMPLATE_NAME) {
			throw new ResponseHelper.BadRequestError(
				[
					`Package "${parsed.packageName}" is only a template`,
					'Please enter an actual package to install',
				].join('.'),
			);
		}

		const isInstalled = await isPackageInstalled(parsed.packageName);
		const hasLoaded = hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			throw new ResponseHelper.BadRequestError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
			);
		}

		const packageStatus = await checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new ResponseHelper.BadRequestError(
				`Package "${name}" is banned so it cannot be installed`,
			);
		}

		let installedPackage: InstalledPackages;

		try {
			installedPackage = await Container.get(LoadNodesAndCredentials).loadNpmModule(
				parsed.packageName,
				parsed.version,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			void Container.get(InternalHooks).onCommunityPackageInstallFinished({
				user: req.user,
				input_string: name,
				package_name: parsed.packageName,
				success: false,
				package_version: parsed.version,
				failure_reason: errorMessage,
			});

			const message = [`Error loading package "${name}"`, errorMessage].join(':');

			const clientError = error instanceof Error ? isClientError(error) : false;

			throw new ResponseHelper[clientError ? 'BadRequestError' : 'InternalServerError'](message);
		}

		if (!hasLoaded) removePackageFromMissingList(name);

		const pushInstance = Container.get(Push);

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			pushInstance.send('reloadNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void Container.get(InternalHooks).onCommunityPackageInstallFinished({
			user: req.user,
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
		} catch {
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
		const { name } = req.query;

		if (!name) {
			throw new ResponseHelper.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		try {
			sanitizeNpmPackageName(name);
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			throw new ResponseHelper.BadRequestError(message);
		}

		const installedPackage = await findInstalledPackage(name);

		if (!installedPackage) {
			throw new ResponseHelper.BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			await Container.get(LoadNodesAndCredentials).removeNpmModule(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new ResponseHelper.InternalServerError(message);
		}

		const pushInstance = Container.get(Push);

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			pushInstance.send('removeNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void Container.get(InternalHooks).onCommunityPackageDeleteFinished({
			user: req.user,
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
			throw new ResponseHelper.BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		const previouslyInstalledPackage = await findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			throw new ResponseHelper.BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await Container.get(LoadNodesAndCredentials).updateNpmModule(
				parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
			);

			const pushInstance = Container.get(Push);

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

			void Container.get(InternalHooks).onCommunityPackageUpdateFinished({
				user: req.user,
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
				const pushInstance = Container.get(Push);
				pushInstance.send('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new ResponseHelper.InternalServerError(message);
		}
	}),
);
