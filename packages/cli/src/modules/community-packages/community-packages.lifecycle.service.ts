import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import type { UserLike } from '@/events/maps/relay.event-map';
import { EventService } from '@/events/event.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';
import { InstanceSettings } from 'n8n-core';
import { valid } from 'semver';
import { ensureError, jsonParse, type PublicInstalledPackage } from 'n8n-workflow';

import { CommunityNodeTypesService } from './community-node-types.service';
import { CommunityPackagesService } from './community-packages.service';
import type { CommunityPackages } from './community-packages.types';
import type { InstalledPackages } from './installed-packages.entity';
import { executeNpmCommand, isNpmExecErrorWithStdout } from './npm-utils';

const {
	PACKAGE_NOT_INSTALLED,
	PACKAGE_NAME_NOT_PROVIDED,
	PACKAGE_VERSION_NOT_FOUND,
	PACKAGE_DOES_NOT_CONTAIN_NODES,
	PACKAGE_NOT_FOUND,
} = RESPONSE_ERROR_MESSAGES;

const isCommunityPackageInstallClientError = (error: Error) =>
	[PACKAGE_VERSION_NOT_FOUND, PACKAGE_DOES_NOT_CONTAIN_NODES, PACKAGE_NOT_FOUND].some(
		(msg) => typeof error.message === 'string' && error.message.includes(msg),
	);

export type CommunityPackageInstallPresentation = 'ui' | 'publicApi';

export type MissingInstalledPackageBehavior = 'badRequest' | 'notFound';

@Service()
export class CommunityPackagesLifecycleService {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly communityPackagesService: CommunityPackagesService,
		private readonly eventService: EventService,
		private readonly communityNodeTypesService: CommunityNodeTypesService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async listInstalledPackages(): Promise<PublicInstalledPackage[] | InstalledPackages[]> {
		const installedPackages = await this.communityPackagesService.getAllInstalledPackages();

		if (installedPackages.length === 0) return [];

		let pendingUpdates: CommunityPackages.AvailableUpdates | undefined;

		try {
			await executeNpmCommand(['outdated', '--json'], {
				doNotHandleError: true,
				cwd: this.instanceSettings.nodesDownloadDir,
			});
		} catch (error) {
			if (isNpmExecErrorWithStdout(error) && error.code === 1) {
				try {
					pendingUpdates = jsonParse<CommunityPackages.AvailableUpdates>(error.stdout.trim());
				} catch (parseError) {
					this.logger.warn('Failed to parse npm outdated output', {
						error: ensureError(parseError),
					});
				}
			}
		}

		let packages = this.communityPackagesService.matchPackagesWithUpdates(
			installedPackages,
			pendingUpdates,
		);

		try {
			if (this.communityPackagesService.hasMissingPackages) {
				packages = this.communityPackagesService.matchMissingPackages(packages);
			}
		} catch {
			// Ignore errors when matching missing packages
		}

		return packages;
	}

	async install(
		args: { name: string | undefined; version?: string; verify?: boolean },
		user: UserLike,
		presentation: CommunityPackageInstallPresentation,
	): Promise<InstalledPackages> {
		const { name, verify, version } = args;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		if (version && !valid(version)) {
			throw new BadRequestError(`Invalid version: ${version}`);
		}

		let checksum: string | undefined;

		if (verify) {
			checksum = this.communityNodeTypesService.findVetted(name)?.checksum;
			if (!checksum) {
				throw new BadRequestError(`Package ${name} is not vetted for installation`);
			}
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
			const templateMessage =
				presentation === 'ui'
					? [
							`Package "${parsed.packageName}" is only a template`,
							'Please enter an actual package to install',
						].join('.')
					: `Package "${parsed.packageName}" is only a template. Please enter an actual package to install`;
			throw new BadRequestError(templateMessage);
		}

		const isInstalled = await this.communityPackagesService.isPackageInstalled(parsed.packageName);
		const hasLoaded = this.communityPackagesService.hasPackageLoaded(name);

		if (isInstalled && hasLoaded) {
			const alreadyMessage =
				presentation === 'ui'
					? [
							`Package "${parsed.packageName}" is already installed`,
							'To update it, click the corresponding button in the UI',
						].join('.')
					: `Package "${parsed.packageName}" is already installed`;
			throw new BadRequestError(alreadyMessage);
		}

		const packageStatus = await this.communityPackagesService.checkNpmPackageStatus(name);

		if (packageStatus.status !== 'OK') {
			throw new BadRequestError(`Package "${name}" is banned so it cannot be installed`);
		}

		const packageVersion = version ?? parsed.version;
		let installedPackage: InstalledPackages;

		try {
			installedPackage = await this.communityPackagesService.installPackage(
				parsed.packageName,
				packageVersion,
				checksum,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			this.eventService.emit('community-package-installed', {
				user,
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

			const clientError =
				error instanceof Error ? isCommunityPackageInstallClientError(error) : false;
			throw new (clientError ? BadRequestError : InternalServerError)(message);
		}

		if (!hasLoaded) this.communityPackagesService.removePackageFromMissingList(name);

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
			user,
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

	async update(
		args: { name: string | undefined; version?: string; checksum?: string },
		user: UserLike,
		whenMissing: MissingInstalledPackageBehavior,
	): Promise<InstalledPackages> {
		const { name, version, checksum } = args;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		if (version && !valid(version)) {
			throw new BadRequestError(`Invalid version: ${version}`);
		}

		const previouslyInstalledPackage =
			await this.communityPackagesService.findInstalledPackage(name);

		if (!previouslyInstalledPackage) {
			if (whenMissing === 'notFound') {
				throw new NotFoundError(PACKAGE_NOT_INSTALLED);
			}
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await this.communityPackagesService.updatePackage(
				this.communityPackagesService.parseNpmPackageName(name).packageName,
				previouslyInstalledPackage,
				version,
				checksum,
			);

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
				user,
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
				`Error updating package "${name}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message, error);
		}
	}

	async uninstall(
		packageName: string | undefined,
		user: UserLike,
		whenMissing: MissingInstalledPackageBehavior,
	): Promise<void> {
		if (!packageName) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		try {
			this.communityPackagesService.parseNpmPackageName(packageName);
		} catch (error) {
			const message = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;
			throw new BadRequestError(message);
		}

		const installedPackage = await this.communityPackagesService.findInstalledPackage(packageName);

		if (!installedPackage) {
			if (whenMissing === 'notFound') {
				throw new NotFoundError(PACKAGE_NOT_INSTALLED);
			}
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			await this.communityPackagesService.removePackage(packageName, installedPackage);
		} catch (error) {
			const message = [
				`Error removing package "${packageName}"`,
				error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON,
			].join(':');

			throw new InternalServerError(message, error);
		}

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
			user,
			packageName,
			packageVersion: installedPackage.installedVersion,
			packageNodeNames: installedPackage.installedNodes.map((node) => node.name),
			packageAuthor: installedPackage.authorName,
			packageAuthorEmail: installedPackage.authorEmail,
		});
	}
}
