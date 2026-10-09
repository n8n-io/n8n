import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { jsonParse, type PublicInstalledPackage } from 'n8n-workflow';

import {
	RESPONSE_ERROR_MESSAGES,
	STARTER_TEMPLATE_NAME,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { BadRequestError, InternalServerError, NotFoundError } from '@n8n/errors';
import { IncompatibleNodesApiVersionError } from '@/errors/response-errors/incompatible-nodes-api-version.error';
import type { UserLike } from '@/events/maps/relay.event-map';
import { Push } from '@/push';

import { selectVettedVersion } from './community-node-types-utils';
import { CommunityNodeTypesService } from './community-node-types.service';
import { CommunityPackagesConfig } from './community-packages.config';
import { CommunityPackagesService, isValidVersionSpecifier } from './community-packages.service';
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

export type CommunityPackageInstallPresentation = 'ui' | 'publicApi' | 'mcp';

export type MissingInstalledPackageBehavior = 'badRequest' | 'notFound';

const MANAGED_BY_ENV_MESSAGE =
	'Community packages are managed via environment variables on this instance and cannot be modified through the API.';

@Service()
export class CommunityPackagesLifecycleService {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly communityPackagesService: CommunityPackagesService,
		private readonly eventService: EventService,
		private readonly communityNodeTypesService: CommunityNodeTypesService,
		private readonly instanceSettings: InstanceSettings,
		private readonly communityPackagesConfig: CommunityPackagesConfig,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	private assertNotManagedByEnv() {
		if (this.instanceSettingsLoaderConfig.communityPackagesManagedByEnv) {
			throw new BadRequestError(MANAGED_BY_ENV_MESSAGE);
		}
	}

	/**
	 * Resolves the version and checksum to install. In verified-only mode both come from the
	 * vetted list. The checksum is what lets a package through `checkInstallPermissions`, so
	 * only the instance config decides this, never the caller.
	 */
	private async resolveVetted(
		name: string,
		requestedVersion: string | undefined,
	): Promise<{ version: string | undefined; checksum: string | undefined }> {
		if (this.communityPackagesConfig.unverifiedEnabled) {
			return { version: requestedVersion, checksum: undefined };
		}

		const vettedPackage = await this.communityNodeTypesService.findVetted(name);
		if (!vettedPackage) {
			throw new BadRequestError(`Package ${name} is not vetted for installation`);
		}

		const { version, checksum } = selectVettedVersion(vettedPackage, requestedVersion);
		if (!checksum) {
			throw new BadRequestError(
				`Version ${version} of ${name} is not verified by n8n. Latest verified version is ${vettedPackage.npmVersion}`,
			);
		}

		return { version, checksum };
	}

	async listInstalledPackages(): Promise<PublicInstalledPackage[] | InstalledPackages[]> {
		const installedPackages = await this.communityPackagesService.getAllInstalledPackages();

		if (installedPackages.length === 0) return [];

		let pendingUpdates: CommunityPackages.AvailableUpdates | undefined;

		// Only check npm registry for updates when unverified packages are enabled.
		// In verified-only mode, update availability is determined by Strapi CMS versions on the frontend.
		if (this.communityPackagesConfig.unverifiedEnabled) {
			try {
				await executeNpmCommand(['outdated', '--json'], {
					doNotHandleError: true,
					cwd: this.instanceSettings.nodesDownloadDir,
					registry: this.communityPackagesConfig.registry,
					authToken: this.communityPackagesConfig.authToken || undefined,
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
		}

		const packages = this.communityPackagesService.matchPackagesWithUpdates(
			installedPackages,
			pendingUpdates,
		);

		return this.communityPackagesService.withLoadStatus(packages);
	}

	async install(
		args: { name: string | undefined; version?: string },
		user: UserLike,
		presentation: CommunityPackageInstallPresentation,
	): Promise<InstalledPackages> {
		this.assertNotManagedByEnv();
		const { name } = args;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		if (args.version && !isValidVersionSpecifier(args.version)) {
			throw new BadRequestError(`Invalid version: ${args.version}`);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = this.communityPackagesService.parseNpmPackageName(name);
		} catch (error) {
			throw new BadRequestError(
				error instanceof Error ? error.message : 'Failed to parse package name',
			);
		}

		// The vetted list is keyed by bare package name; `name` may carry a `@version` suffix.
		const { version: packageVersion, checksum } = await this.resolveVetted(
			parsed.packageName,
			args.version ?? parsed.version,
		);

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

		const existingPackage = await this.communityPackagesService.findInstalledPackage(
			parsed.packageName,
		);

		if (existingPackage && this.communityPackagesService.isPackageLoaded(existingPackage)) {
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

			// Rethrow unwrapped: the actionable copy and its metadata must reach the UI.
			if (error instanceof IncompatibleNodesApiVersionError) throw error;

			let message = [`Error loading package "${name}" `, errorMessage].join(':');
			if (error instanceof Error && error.cause instanceof Error) {
				message += `\nCause: ${error.cause.message}`;
			}

			const clientError =
				error instanceof Error ? isCommunityPackageInstallClientError(error) : false;
			throw new (clientError ? BadRequestError : InternalServerError)(message);
		}

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
		args: { name: string | undefined; version?: string },
		user: UserLike,
		whenMissing: MissingInstalledPackageBehavior,
	): Promise<InstalledPackages> {
		this.assertNotManagedByEnv();
		const { name } = args;

		if (!name) {
			throw new BadRequestError(PACKAGE_NAME_NOT_PROVIDED);
		}

		if (args.version && !isValidVersionSpecifier(args.version)) {
			throw new BadRequestError(`Invalid version: ${args.version}`);
		}

		let parsed: CommunityPackages.ParsedPackageName;

		try {
			parsed = this.communityPackagesService.parseNpmPackageName(name);
		} catch (error) {
			throw new BadRequestError(
				error instanceof Error ? error.message : 'Failed to parse package name',
			);
		}

		const { packageName } = parsed;
		const { version, checksum } = await this.resolveVetted(
			packageName,
			args.version ?? parsed.version,
		);

		const previouslyInstalledPackage =
			await this.communityPackagesService.findInstalledPackage(packageName);

		if (!previouslyInstalledPackage) {
			if (whenMissing === 'notFound') {
				throw new NotFoundError(PACKAGE_NOT_INSTALLED);
			}
			throw new BadRequestError(PACKAGE_NOT_INSTALLED);
		}

		try {
			const newInstalledPackage = await this.communityPackagesService.updatePackage(
				packageName,
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
				packageName,
				packageVersionCurrent: previouslyInstalledPackage.installedVersion,
				packageVersionNew: newInstalledPackage.installedVersion,
				packageNodeNames: newInstalledPackage.installedNodes.map((n) => n.name),
				packageAuthor: newInstalledPackage.authorName,
				packageAuthorEmail: newInstalledPackage.authorEmail,
			});

			return newInstalledPackage;
		} catch (error) {
			// Before the broadcast: the rejected version was never loaded, so the
			// previous one is still working and must keep its node types.
			if (error instanceof IncompatibleNodesApiVersionError) throw error;

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
		this.assertNotManagedByEnv();
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
