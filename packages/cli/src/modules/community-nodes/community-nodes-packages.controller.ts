import type { InstalledPackages } from '@n8n/db';
import { Delete, Get, Patch, Post, RestController, GlobalScope } from '@n8n/decorators';

import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import { Push } from '@/push';
import { NodeRequest } from '@/requests';

import { CommunityNodesPackagesService } from './community-nodes-packages.service';
import { CommunityNodesTypesService } from './community-nodes-types.service';
import type { AvailableUpdates, ParsedPackageName } from './types';

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
export class CommunityNodesPackagesController {
	constructor(
		private readonly push: Push,
		private readonly eventService: EventService,
		private readonly packagesService: CommunityNodesPackagesService,
		private readonly typesService: CommunityNodesTypesService,
	) {}

	@Post('/')
	@GlobalScope('communityPackage:install')
	async installPackage(req: NodeRequest.Post) {
		const { name, verify, version } = req.body;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		let checksum: string | undefined = undefined;

		// Get the checksum for the package if flagged to verify
		if (verify) {
			checksum = this.typesService.findVetted(name)?.checksum;
			if (!checksum) {
				throw new BadRequestError(`Package ${name} is not vetted for installation`);
			}
		}

		let parsed: ParsedPackageName;

		try {
			parsed = this.packagesService.parseNpmPackageName(name);
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

		const isInstalled = await this.packagesService.isPackageInstalled(parsed.packageName);
		const hasLoaded = this.packagesService.hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			throw new BadRequestError(
				[
					`Package "${parsed.packageName}" is already installed`,
					'To update it, click the corresponding button in the UI',
				].join('.'),
			);
		}

		const packageStatus = await this.packagesService.checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new BadRequestError(`Package "${name}" is banned so it cannot be installed`);
		}

		const packageVersion = version ?? parsed.version;
		let installedPackage: InstalledPackages;
		try {
			installedPackage = await this.packagesService.installPackage(
				parsed.packageName,
				packageVersion,
				checksum,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			this.eventService.emit('community-package-installed', {
				user: req.user,
				inputString: name,
				packageName: parsed.packageName,
				success: false,
				packageVersion,
				failureReason: errorMessage,
			});

			let message = [`Error loading package "${name}" `, errorMessage].join(':');
			if (error instanceof Error && error.cause instanceof Error) {
				message += `\nCause: ${error.cause.message}`;
			}

			const clientError = error instanceof Error ? isClientError(error) : false;
			throw new (clientError ? BadRequestError : InternalServerError)(message);
		}

		if (!hasLoaded) this.packagesService.removePackageFromMissingList(name);

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast({
				type: 'reloadNodeType',
				data: {
					name: node.type,
					version: node.latestVersion,
				},
			});
		});

		this.eventService.emit('community-package-installed', {
			user: req.user,
			inputString: name,
			packageName: parsed.packageName,
			success: true,
			packageVersion,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});

		return installedPackage;
	}

	@Get('/')
	@GlobalScope('communityPackage:list')
	async getInstalledPackages() {
		const installedPackages = await this.packagesService.getAllInstalledPackages();

		if (installedPackages.length === 0) return [];

		let pendingUpdates: AvailableUpdates | undefined;

		try {
			const command = ['npm', 'outdated', '--json'].join(' ');
			await this.packagesService.executeNpmCommand(command, { doNotHandleError: true });
		} catch (error) {
			// when there are updates, npm exits with code 1
			// when there are no updates, command succeeds
			// https://github.com/npm/rfcs/issues/473
			if (isNpmError(error) && error.code === 1) {
				pendingUpdates = JSON.parse(error.stdout) as AvailableUpdates;
			}
		}

		let hydratedPackages = this.packagesService.matchPackagesWithUpdates(
			installedPackages,
			pendingUpdates,
		);

		try {
			if (this.packagesService.hasMissingPackages) {
				hydratedPackages = this.packagesService.matchMissingPackages(hydratedPackages);
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
			this.packagesService.parseNpmPackageName(name); // sanitize input
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			throw new BadRequestError(message);
		}

		const installedPackage = await this.packagesService.findInstalledPackage(name);

		if (!installedPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			await this.packagesService.removePackage(name, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message, error);
		}

		// broadcast to connected frontends that node list has been updated
		installedPackage.installedNodes.forEach((node) => {
			this.push.broadcast({
				type: 'removeNodeType',
				data: {
					name: node.type,
					version: node.latestVersion,
				},
			});
		});

		this.eventService.emit('community-package-deleted', {
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

		const previouslyInstalledPackage = await this.packagesService.findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await this.packagesService.updatePackage(
				this.packagesService.parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
			);

			// broadcast to connected frontends that node list has been updated
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'removeNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});

			newInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'reloadNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});

			this.eventService.emit('community-package-updated', {
				user: req.user,
				packageName: name,
				packageVersionCurrent: previouslyInstalledPackage.installedVersion,
				packageVersionNew: newInstalledPackage.installedVersion,
				packageNodeNames: newInstalledPackage.installedNodes.map((n) => n.name),
				packageAuthor: newInstalledPackage.authorName,
				packageAuthorEmail: newInstalledPackage.authorEmail,
			});

			return newInstalledPackage;
		} catch (error) {
			previouslyInstalledPackage.installedNodes.forEach((node) => {
				this.push.broadcast({
					type: 'removeNodeType',
					data: {
						name: node.type,
						version: node.latestVersion,
					},
				});
			});

			const message = [
				`Error removing package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message, error);
		}
	}
}
