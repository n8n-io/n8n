import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { Delete, Get, Middleware, Patch, Post, RestController, GlobalScope } from '@/decorators';
import { NodeRequest } from '@/requests';
import type { InstalledPackages } from '@db/entities/InstalledPackages';
import type { CommunityPackages } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';
import { Push } from '@/push';
import { CommunityPackagesService } from '@/services/communityPackages.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventSender } from '@/eventbus/event-sender';

const {
	PACKAGE_NOT_INSTALLED,
	PACKAGE_NAME_NOT_PROVIDED,
	PACKAGE_VERSION_NOT_FOUND,
	PACKAGE_DOES_NOT_CONTAIN_NODES,
	PACKAGE_NOT_FOUND,
} = RESPONSE_ERROR_MESSAGES;

const isClientError = (error: Error) =>
	[PACKAGE_VERSION_NOT_FOUND, PACKAGE_DOES_NOT_CONTAIN_NODES, PACKAGE_NOT_FOUND].some((msg) =>
		error.message.includes(msg),
	);

export function isNpmError(error: unknown): error is { code: number; stdout: string } {
	return typeof error === 'object' && error !== null && 'code' in error && 'stdout' in error;
}

@RestController('/community-packages')
export class CommunityPackagesController {
	constructor(
		private readonly push: Push,
		private readonly internalHooks: InternalHooks,
		private readonly communityPackagesService: CommunityPackagesService,
		private readonly eventSender: EventSender,
	) {}

	// TODO: move this into a new decorator `@IfConfig('executions.mode', 'queue')`
	@Middleware()
	checkIfCommunityNodesEnabled(req: Request, res: Response, next: NextFunction) {
		if (config.getEnv('executions.mode') === 'queue' && req.method !== 'GET')
			res.status(400).json({
				status: 'error',
				message: 'Package management is disabled when running in "queue" mode',
			});
		else next();
	}

	@Post('/')
	@GlobalScope('communityPackage:install')
	async installPackage(req: NodeRequest.Post) {
		const { name } = req.body;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = this.communityPackagesService.parseNpmPackageName(name);
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

		const isInstalled = await this.communityPackagesService.isPackageInstalled(parsed.packageName);
		const hasLoaded = this.communityPackagesService.hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			throw new BadRequestError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
			);
		}

		const packageStatus = await this.communityPackagesService.checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new BadRequestError(`Package "${name}" is banned so it cannot be installed`);
		}

		let installedPackage: InstalledPackages;
		try {
			installedPackage = await this.communityPackagesService.installNpmModule(
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
			this.eventSender.emit('community-package-installed', {
				user: req.user,
				packageName: parsed.packageName,
				success: false,
				packageVersion: parsed.version,
				failureReason: errorMessage,
				inputString: name,
			});

			let message = [`Error loading package "${name}" `, errorMessage].join(':');
			if (error instanceof Error && error.cause instanceof Error) {
				message += `\nCause: ${error.cause.message}`;
			}

			const clientError = error instanceof Error ? isClientError(error) : false;
			throw new (clientError ? BadRequestError : InternalServerError)(message);
		}

		if (!hasLoaded) this.communityPackagesService.removePackageFromMissingList(name);

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast('reloadNodeType', {
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
		this.eventSender.emit('community-package-installed', {
			user: req.user,
			inputString: name,
			packageName: parsed.packageName,
			success: true,
			packageVersion: parsed.version,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});

		return installedPackage;
	}

	@Get('/')
	@GlobalScope('communityPackage:list')
	async getInstalledPackages() {
		const installedPackages = await this.communityPackagesService.getAllInstalledPackages();

		if (installedPackages.length === 0) return [];

		let pendingUpdates: CommunityPackages.AvailableUpdates | undefined;

		try {
			const command = ['npm', 'outdated', '--json'].join(' ');
			await this.communityPackagesService.executeNpmCommand(command, { doNotHandleError: true });
		} catch (error) {
			// when there are updates, npm exits with code 1
			// when there are no updates, command succeeds
			// https://github.com/npm/rfcs/issues/473
			if (isNpmError(error) && error.code === 1) {
				pendingUpdates = JSON.parse(error.stdout) as CommunityPackages.AvailableUpdates;
			}
		}

		let hydratedPackages = this.communityPackagesService.matchPackagesWithUpdates(
			installedPackages,
			pendingUpdates,
		);

		try {
			if (this.communityPackagesService.hasMissingPackages) {
				hydratedPackages = this.communityPackagesService.matchMissingPackages(hydratedPackages);
			}
		} catch {}

		return hydratedPackages;
	}

	@Delete('/')
	@GlobalScope('communityPackage:uninstall')
	async uninstallPackage(req: NodeRequest.Delete) {
		const { name } = req.query;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		try {
			this.communityPackagesService.parseNpmPackageName(name); // sanitize input
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			throw new BadRequestError(message);
		}

		const installedPackage = await this.communityPackagesService.findInstalledPackage(name);

		if (!installedPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			await this.communityPackagesService.removeNpmModule(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message);
		}

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast('removeNodeType', {
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
		this.eventSender.emit('community-package-deleted', {
			user: req.user,
			packageName: name,
			packageVersion: installedPackage.installedVersion,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});
	}

	@Patch('/')
	@GlobalScope('communityPackage:update')
	async updatePackage(req: NodeRequest.Update) {
		const { name } = req.body;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		const previouslyInstalledPackage =
			await this.communityPackagesService.findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await this.communityPackagesService.updateNpmModule(
				this.communityPackagesService.parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
			);

			// broadcast to connected frontends that node list has been updated
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast('removeNodeType', {
					name: node.type,
					version: node.latestVersion,
				});
			});

			newInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast('reloadNodeType', {
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
			this.eventSender.emit('community-package-updated', {
				user: req.user,
				packageName: name,
				packageVersionCurrent: previouslyInstalledPackage.installedVersion,
				packageVersionNew: newInstalledPackage.installedVersion,
				packageNodeNames: newInstalledPackage.installedNodes.map((node) => node.name),
				packageAuthor: newInstalledPackage.authorName,
				packageAuthorEmail: newInstalledPackage.authorEmail,
			});

			return newInstalledPackage;
		} catch (error) {
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast('removeNodeType', {
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
