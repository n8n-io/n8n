import { Request, Response, NextFunction } from 'express';
import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { Delete, Get, Middleware, Patch, Post, RestController } from '@/decorators';
import { NodeRequest } from '@/requests';
import { BadRequestError, InternalServerError } from '@/ResponseHelper';
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
import type { InstalledPackages } from '@db/entities/InstalledPackages';
import type { CommunityPackages } from '@/Interfaces';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { InternalHooks } from '@/InternalHooks';
import { Push } from '@/push';
import { Config } from '@/config';
import { isAuthenticatedRequest } from '@/UserManagement/UserManagementHelper';

const { PACKAGE_NOT_INSTALLED, PACKAGE_NAME_NOT_PROVIDED } = RESPONSE_ERROR_MESSAGES;

@RestController('/nodes')
export class NodesController {
	constructor(
		private config: Config,
		private loadNodesAndCredentials: LoadNodesAndCredentials,
		private push: Push,
		private internalHooks: InternalHooks,
	) {}

	// TODO: move this into a new decorator `@Authorized`
	@Middleware()
	checkIfOwner(req: Request, res: Response, next: NextFunction) {
		if (!isAuthenticatedRequest(req) || req.user.globalRole.name !== 'owner')
			res.status(403).json({ status: 'error', message: 'Unauthorized' });
		else next();
	}

	// TODO: move this into a new decorator `@IfConfig('executions.mode', 'queue')`
	@Middleware()
	checkIfCommunityNodesEnabled(req: Request, res: Response, next: NextFunction) {
		if (this.config.getEnv('executions.mode') === 'queue' && req.method !== 'GET')
			res.status(400).json({
				status: 'error',
				message: 'Package management is disabled when running in "queue" mode',
			});
		else next();
	}

	@Post('/')
	async installPackage(req: NodeRequest.Post) {
		const { name } = req.body;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = parseNpmPackageName(name);
		} catch (error) {
			throw new BadRequestError(
				error instanceof Error ? error.message : 'Failed to parse package name',
			);
		}

		if (parsed.packageName === STARTER_TEMPLATE_NAME) {
			throw new BadRequestError(
				[
					`Package "${parsed.packageName}" is only a template`,
					'Please enter an actual package to install',
				].join('.'),
			);
		}

		const isInstalled = await isPackageInstalled(parsed.packageName);
		const hasLoaded = hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			throw new BadRequestError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
			);
		}

		const packageStatus = await checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new BadRequestError(`Package "${name}" is banned so it cannot be installed`);
		}

		let installedPackage: InstalledPackages;
		try {
			installedPackage = await this.loadNodesAndCredentials.installNpmModule(
				parsed.packageName,
				parsed.version,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			void this.internalHooks.onCommunityPackageInstallFinished({
				user: req.user,
				input_string: name,
				package_name: parsed.packageName,
				success: false,
				package_version: parsed.version,
				failure_reason: errorMessage,
			});

			let message = [`Error loading package "${name}" `, errorMessage].join(':');
			if (error instanceof Error && error.cause instanceof Error) {
				message += `\nCause: ${error.cause.message}`;
			}

			const clientError = error instanceof Error ? isClientError(error) : false;
			throw new (clientError ? BadRequestError : InternalServerError)(message);
		}

		if (!hasLoaded) removePackageFromMissingList(name);

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.send('reloadNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void this.internalHooks.onCommunityPackageInstallFinished({
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
	}

	@Get('/')
	async getInstalledPackages() {
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
			const missingPackages = this.config.get('nodes.packagesMissing') as string | undefined;
			if (missingPackages) {
				hydratedPackages = matchMissingPackages(hydratedPackages, missingPackages);
			}
		} catch {}

		return hydratedPackages;
	}

	@Delete('/')
	async uninstallPackage(req: NodeRequest.Delete) {
		const { name } = req.query;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		try {
			sanitizeNpmPackageName(name);
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			throw new BadRequestError(message);
		}

		const installedPackage = await findInstalledPackage(name);

		if (!installedPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			await this.loadNodesAndCredentials.removeNpmModule(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message);
		}

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.send('removeNodeType', {
				name: node.type,
				version: node.latestVersion,
			});
		});

		void this.internalHooks.onCommunityPackageDeleteFinished({
			user: req.user,
			package_name: name,
			package_version: installedPackage.installedVersion,
			package_node_names: installedPackage.installedNodes.map((node) => node.name),
			package_author: installedPackage.authorName,
			package_author_email: installedPackage.authorEmail,
		});
	}

	@Patch('/')
	async updatePackage(req: NodeRequest.Update) {
		const { name } = req.body;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		const previouslyInstalledPackage = await findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await this.loadNodesAndCredentials.updateNpmModule(
				parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
			);

			// broadcast to connected frontends that node list has been updated
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.send('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			newInstalledPackage.installedNodes.forEach((node) => {
				this.push.send('reloadNodeType', {
					name: node.name,
					version: node.latestVersion,
				});
			});

			void this.internalHooks.onCommunityPackageUpdateFinished({
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
				this.push.send('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message);
		}
	}
}
