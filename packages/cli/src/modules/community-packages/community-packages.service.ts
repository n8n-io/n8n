import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { BUILTIN_NODES_PACKAGES, LICENSE_FEATURES, Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { PackageDirectoryLoader } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	checkNodesApiVersion,
	jsonParse,
	N8N_NODES_API_VERSION,
	UnexpectedError,
	UserError,
	type NodesApiVersionPackageJson,
	type PublicInstalledPackage,
} from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access, constants, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import pLimit from 'p-limit';
import { valid } from 'semver';

import { NODE_PACKAGE_PREFIX, NPM_PACKAGE_STATUS_GOOD, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { IncompatibleNodesApiVersionError } from '@/errors/response-errors/incompatible-nodes-api-version.error';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { toError } from '@/utils';

import { getCommunityNodeTypes, type StrapiCommunityNodeType } from './community-node-types-utils';
import { CommunityPackagesConfig } from './community-packages.config';
import type { CommunityPackages } from './community-packages.types';
import { InstalledPackages } from './installed-packages.entity';
import { InstalledPackagesRepository } from './installed-packages.repository';
import { checkIfVersionExistsOrThrow, executeNpmCommand, verifyIntegrity } from './npm-utils';

const asyncExecFile = promisify(execFile);

const NPM_DIST_TAG_PATTERN = /^[a-z][a-z0-9-._]*$/;

/** Returns true if the string is a valid semver version OR a valid npm dist-tag (e.g. 'beta', 'next'). */
export function isValidVersionSpecifier(version: string): boolean {
	return valid(version) !== null || NPM_DIST_TAG_PATTERN.test(version);
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

const REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;

const { PACKAGE_NAME_NOT_PROVIDED } = RESPONSE_ERROR_MESSAGES;

const INVALID_OR_SUSPICIOUS_PACKAGE_NAME = /[^0-9a-z@\-._/]/;

/** Built-in package names cannot be installed as community packages. */
const RESERVED_PACKAGE_NAMES = new Set<string>(BUILTIN_NODES_PACKAGES);

type PackageJson = {
	name: 'installed-nodes';
	private: true;
	dependencies: Record<string, string>;
};

@Service()
export class CommunityPackagesService {
	private readonly downloadFolder = this.instanceSettings.nodesDownloadDir;

	private readonly packageJsonPath = join(this.downloadFolder, 'package.json');

	private readonly http: HttpRequestClient;

	/** Makes install/update/remove run one at a time, so they can't corrupt shared state on disk. */
	private readonly packageMutex = pLimit(1);

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly installedPackageRepository: InstalledPackagesRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly publisher: Publisher,
		private readonly license: License,
		private readonly config: CommunityPackagesConfig,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe', // Fixed, n8n-controlled host
			timeout: REQUEST_TIMEOUT_MS,
		});
	}

	async init() {
		await this.ensurePackageJson();
		await this.checkForMissingPackages();
	}

	async findInstalledPackage(packageName: string) {
		return await this.installedPackageRepository.findOne({
			where: { packageName },
			relations: ['installedNodes'],
		});
	}

	async getAllInstalledPackages() {
		return await this.installedPackageRepository.find({ relations: ['installedNodes'] });
	}

	private async removePackageFromDatabase(packageName: InstalledPackages) {
		return await this.installedPackageRepository.remove(packageName);
	}

	private async persistInstalledPackage(packageLoader: PackageDirectoryLoader) {
		try {
			return await this.installedPackageRepository.saveInstalledPackageWithNodes(packageLoader);
		} catch (maybeError) {
			const error = toError(maybeError);

			this.logger.error('Failed to save installed packages and nodes', {
				error,
				packageName: packageLoader.packageJson.name,
			});

			throw error;
		}
	}

	private async replaceInstalledPackage(
		previousInstalledPackage: InstalledPackages,
		packageLoader: PackageDirectoryLoader,
	) {
		try {
			return await this.installedPackageRepository.replaceInstalledPackageWithNodes(
				previousInstalledPackage,
				packageLoader,
			);
		} catch (maybeError) {
			const error = toError(maybeError);

			this.logger.error('Failed to replace installed package and nodes', {
				error,
				packageName: packageLoader.packageJson.name,
			});

			throw error;
		}
	}

	parseNpmPackageName(rawString?: string): CommunityPackages.ParsedPackageName {
		if (!rawString) throw new UnexpectedError(PACKAGE_NAME_NOT_PROVIDED);

		if (INVALID_OR_SUSPICIOUS_PACKAGE_NAME.test(rawString)) {
			throw new UnexpectedError('Package name must be a single word');
		}

		const scope = rawString.includes('/') ? rawString.split('/')[0] : undefined;

		const packageNameWithoutScope = scope ? rawString.replace(`${scope}/`, '') : rawString;

		if (!packageNameWithoutScope.startsWith(NODE_PACKAGE_PREFIX)) {
			throw new UnexpectedError(`Package name must start with ${NODE_PACKAGE_PREFIX}`);
		}

		const version = packageNameWithoutScope.includes('@')
			? packageNameWithoutScope.split('@')[1]
			: undefined;

		if (version && !isValidVersionSpecifier(version)) {
			throw new UnexpectedError(`Invalid version: ${version}`);
		}

		const packageName = version ? rawString.replace(`@${version}`, '') : rawString;

		if (RESERVED_PACKAGE_NAMES.has(packageName)) {
			throw new UserError(`Package name "${packageName}" is reserved for n8n built-in packages`);
		}

		return { packageName, scope, version, rawString };
	}

	matchPackagesWithUpdates(
		packages: InstalledPackages[],
		updates?: CommunityPackages.AvailableUpdates,
	) {
		if (!updates) return packages;

		return packages.reduce<PublicInstalledPackage[]>((acc, cur) => {
			const publicPackage: PublicInstalledPackage = { ...cur };

			const update = updates[cur.packageName];

			if (update) publicPackage.updateAvailable = update.latest;

			acc.push(publicPackage);

			return acc;
		}, []);
	}

	/**
	 * `some`, not `every`: a repair-reinstall (`saveInstalledPackageWithNodes`, unlike
	 * `replaceInstalledPackageWithNodes`) doesn't delete `installedNodes` rows from a
	 * previous version, so a package that dropped a node type keeps a stale row that
	 * will never resolve. `every` would flag that package as failed forever.
	 */
	private areNodesLoaded(installedNodes: Array<{ type: string }>) {
		return (
			installedNodes.length === 0 ||
			installedNodes.some((node) => this.loadNodesAndCredentials.isKnownNode(node.type))
		);
	}

	withLoadStatus(installedPackages: PublicInstalledPackage[]): PublicInstalledPackage[] {
		return installedPackages.map((installedPackage) => ({
			...installedPackage,
			failedLoading: !this.areNodesLoaded(installedPackage.installedNodes),
		}));
	}

	async checkNpmPackageStatus(packageName: string) {
		const N8N_BACKEND_SERVICE_URL = 'https://api.n8n.io/api/package';

		try {
			const response = await this.http.request<CommunityPackages.PackageStatusCheck>({
				url: N8N_BACKEND_SERVICE_URL,
				method: 'POST',
				body: { name: packageName },
				json: true,
			});

			if (response.status !== NPM_PACKAGE_STATUS_GOOD) return response;
		} catch {
			// service unreachable, do nothing
		}

		return { status: NPM_PACKAGE_STATUS_GOOD };
	}

	isPackageLoaded(installedPackage: InstalledPackages) {
		return this.areNodesLoaded(installedPackage.installedNodes);
	}

	/**
	 * Returns the ledger, or `null` if it is absent or unusable (e.g. truncated by a crash
	 * mid-write). Absence is the normal state before the first install, so only an unusable
	 * ledger is worth a warning.
	 */
	private async readPackageJson(): Promise<PackageJson | null> {
		const content = await readFile(this.packageJsonPath, 'utf-8').catch(() => null);
		if (content === null) return null;

		// Checking `dependencies` rather than just the parse: `{}` parses fine but throws on
		// the next mutation, and nothing would ever rebuild it.
		const packageJson = jsonParse<PackageJson | null>(content, { fallbackValue: null });
		if (packageJson?.dependencies) return packageJson;

		this.logger.warn('Community package ledger is unusable, rebuilding it');
		return null;
	}

	/** Reads a package's on-disk `package.json`, or `null` if absent or unreadable. */
	private async readInstalledPackageJson(
		packageName: string,
	): Promise<(NodesApiVersionPackageJson & { version?: string }) | null> {
		const packageJsonPath = `${this.resolvePackageDirectory(packageName)}/package.json`;
		try {
			const content = await readFile(packageJsonPath, 'utf-8');
			return jsonParse<(NodesApiVersionPackageJson & { version?: string }) | null>(content, {
				fallbackValue: null,
			});
		} catch {
			return null;
		}
	}

	/**
	 * Rejects a downloaded package that requires a node-authoring API version this
	 * runtime does not support (or declares a malformed one). Runs after
	 * `downloadPackage` extracted the files and before any `require()` of node
	 * code, so no loader can ever import incompatible node code.
	 *
	 * An unreadable `package.json` is not a compatibility verdict: fall through and
	 * let the load step report it.
	 */
	private async assertPackageApiVersionSupported(packageName: string) {
		const packageJson = await this.readInstalledPackageJson(packageName);
		if (!packageJson) return;

		const check = checkNodesApiVersion(packageJson);
		if (check.compatible) return;

		const isMalformed = check.reason === 'malformed';

		throw new IncompatibleNodesApiVersionError(
			isMalformed
				? `This community node declares an invalid n8n node API version (${JSON.stringify(check.declared)}). Install a version of the package with valid metadata or contact the package author.`
				: `This community node requires n8n node API version ${String(check.declared)}, but this instance supports up to ${N8N_NODES_API_VERSION}. Install an older compatible version of the package or upgrade n8n.`,
			{
				requiredNodesApiVersion: isMalformed ? null : Number(check.declared),
				supportedNodesApiVersion: N8N_NODES_API_VERSION,
			},
		);
	}

	/** Reads the version a package actually has on disk, or `null` if absent or unreadable. */
	private async readInstalledPackageVersion(packageName: string): Promise<string | null> {
		return (await this.readInstalledPackageJson(packageName))?.version ?? null;
	}

	/**
	 * Rebuilds the ledger from the database, the source of truth for what is installed.
	 * Writing an empty `dependencies` instead would leave `npm outdated` with nothing
	 * to compare, silently hiding available updates for every package.
	 */
	private async buildPackageJsonFromDatabase(): Promise<PackageJson> {
		const installedPackages = await this.getAllInstalledPackages();

		return {
			name: 'installed-nodes',
			private: true,
			dependencies: Object.fromEntries(
				installedPackages.map(({ packageName, installedVersion }) => [
					packageName,
					installedVersion,
				]),
			),
		};
	}

	async ensurePackageJson() {
		if (await this.readPackageJson()) return;

		const packageJson = await this.buildPackageJsonFromDatabase();

		await mkdir(this.downloadFolder, { recursive: true });
		await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
	}

	async checkForMissingPackages() {
		const installedPackages = await this.getAllInstalledPackages();
		const missingPackages = new Set<{ packageName: string; version: string }>();

		for (const installedPackage of installedPackages) {
			// Same rule as `withLoadStatus`, so the UI and this check can't disagree.
			if (this.areNodesLoaded(installedPackage.installedNodes)) continue;

			// Not loaded does not mean missing. A package the startup guard skipped
			// because of its node API version is still on disk: reinstalling the same
			// version can never fix it, and `loadPackage` would import its node code.
			// An unreadable package.json stays "missing" — that is the repair path for
			// partial or corrupt installs.
			const packageJson = await this.readInstalledPackageJson(installedPackage.packageName);
			const apiVersionCheck = packageJson && checkNodesApiVersion(packageJson);
			if (apiVersionCheck && !apiVersionCheck.compatible) {
				const requirement =
					apiVersionCheck.reason === 'malformed'
						? `an invalid n8nNodesApiVersion (${JSON.stringify(apiVersionCheck.declared)})`
						: `node API version ${String(apiVersionCheck.declared)}, but this n8n version supports up to ${N8N_NODES_API_VERSION}`;
				this.logger.warn(
					`Not reinstalling package "${installedPackage.packageName}": it requires ${requirement}. Upgrade n8n to use this package, or uninstall it in Settings > Community nodes.`,
				);
				continue;
			}

			// Leave the list ready for installing in case we need.
			missingPackages.add({
				packageName: installedPackage.packageName,
				version: installedPackage.installedVersion,
			});
		}

		if (missingPackages.size === 0) return;

		const { reinstallMissing } = this.config;
		if (reinstallMissing) {
			this.logger.info('Attempting to reinstall missing packages', {
				missingPackages: [...missingPackages],
			});
			const environment = process.env.ENVIRONMENT === 'staging' ? 'staging' : 'production';

			const packageNames = [...missingPackages].map((p) => p.packageName);

			let vettedPackages: StrapiCommunityNodeType[] = [];
			try {
				vettedPackages = await getCommunityNodeTypes(
					environment,
					{
						filters: {
							packageName: {
								$in: packageNames,
							},
						},
						fields: ['packageName', 'npmVersion', 'checksum', 'nodeVersions'],
					},
					this.config.aiNodeSdkVersion,
				);
			} catch (error) {
				this.logger.error(
					`Failed to fetch community packages from Strapi: ${ensureError(error).message}`,
				);
			}

			for (const missingPackage of missingPackages) {
				try {
					const vettedPackage = vettedPackages.find(
						(p) => p.packageName === missingPackage.packageName,
					);

					let checksum: string | undefined;
					if (vettedPackage) {
						// Get the checksum if the required version is latest
						if (vettedPackage.npmVersion === missingPackage.version) {
							checksum = vettedPackage.checksum;
						} else {
							// Get the checksum if the required version is not latest
							checksum = vettedPackage.nodeVersions?.find(
								(v) => v.npmVersion === missingPackage.version,
							)?.checksum;
						}
					}

					await this.installPackage(missingPackage.packageName, missingPackage.version, checksum);
					missingPackages.delete(missingPackage);
				} catch (error) {
					this.logger.error(
						`Failed to reinstall community package ${missingPackage.packageName}: ${ensureError(error).message}`,
					);
				}
			}

			if (missingPackages.size === 0) {
				this.logger.info('Packages reinstalled successfully. Resuming regular initialization.');
			}

			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
		} else {
			this.logger.warn(
				'n8n detected that some packages are missing. For more information, visit https://docs.n8n.io/integrations/community-nodes/troubleshooting/',
			);
		}
	}

	async installPackage(
		packageName: string,
		version?: string,
		checksum?: string,
	): Promise<InstalledPackages> {
		return await this.installOrUpdatePackage(packageName, { version, checksum });
	}

	async updatePackage(
		packageName: string,
		installedPackage: InstalledPackages,
		version?: string,
		checksum?: string,
	): Promise<InstalledPackages> {
		return await this.installOrUpdatePackage(packageName, { installedPackage, version, checksum });
	}

	async removePackage(packageName: string, installedPackage: InstalledPackages): Promise<void> {
		await this.removeNpmPackage(packageName);
		await this.removePackageFromDatabase(installedPackage);
		void this.publisher
			.publishCommand({
				command: 'community-package-uninstall',
				payload: { packageName },
			})
			.catch((error) => {
				this.logger.warn('Failed to publish community package uninstall event', {
					error: ensureError(error),
					packageName,
				});
			});
	}

	private getNpmRegistry() {
		const { registry } = this.config;
		if (registry !== DEFAULT_REGISTRY && !this.license.isCustomNpmRegistryEnabled()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY);
		}
		return registry;
	}

	private getNpmAuthToken(): string | undefined {
		return this.config.authToken || undefined;
	}

	private checkInstallPermissions(checksumProvided: boolean) {
		if (!this.config.unverifiedEnabled && !checksumProvided) {
			throw new UnexpectedError('Installation of unverified community packages is forbidden!');
		}
	}

	private async installOrUpdatePackage(
		packageName: string,
		options:
			| { version?: string; checksum?: string }
			| { installedPackage: InstalledPackages; version?: string; checksum?: string } = {},
	) {
		return await this.packageMutex(async () => {
			const isUpdate = 'installedPackage' in options;
			const packageVersion = !options.version ? 'latest' : options.version;

			const shouldValidateChecksum = 'checksum' in options && Boolean(options.checksum);
			this.checkInstallPermissions(shouldValidateChecksum);

			const authToken = this.getNpmAuthToken();

			if (options.checksum) {
				await verifyIntegrity(
					packageName,
					packageVersion,
					this.getNpmRegistry(),
					options.checksum,
					authToken,
				);
			}

			await checkIfVersionExistsOrThrow(
				packageName,
				packageVersion,
				this.getNpmRegistry(),
				authToken,
			);

			// The ledger entry to put back on failure, read before `downloadPackage` overwrites it.
			// Falls back to the DB record on update: if the ledger was missing or malformed,
			// `downloadPackage` rebuilds it from the DB anyway, so that's the real previous value.
			const previousVersion = isUpdate
				? ((await this.readPackageJson())?.dependencies[packageName] ??
					options.installedPackage.installedVersion)
				: (await this.readPackageJson())?.dependencies[packageName];

			// Keep whatever is on disk aside so any failure below can roll back to it. This has
			// to run for a fresh install too: a directory can pre-exist one, after a crash
			// mid-install or when reinstalling a package the loader reports as missing.
			const backupDirectory = await this.backupPackageDirectory(packageName);

			try {
				await this.downloadPackage(packageName, packageVersion, authToken);
				// Reject before the loader imports node code or the database records the version.
				await this.assertPackageApiVersionSupported(packageName);
			} catch (error) {
				// No reload here: the previous package was not unloaded before the download
				await this.restorePackageFiles(packageName, {
					backupDirectory,
					previousVersion,
				});

				if (error instanceof Error && error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
					throw new UserError('npm package not found', { extra: { packageName } });
				}
				throw error;
			}

			let loader: PackageDirectoryLoader;
			try {
				await this.loadNodesAndCredentials.unloadPackage(packageName);
				loader = await this.loadNodesAndCredentials.loadPackage(packageName);
			} catch (error) {
				await this.restoreFailedPackageInstallation(packageName, {
					backupDirectory,
					previousVersion,
				});
				throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, {
					cause: error,
				});
			}

			if (loader.loadedNodes.length > 0) {
				let installedPackage: InstalledPackages;

				// Persisting to the DB is the point of no return: the transaction either
				// commits the new version or leaves the old record intact, so a failure here
				// can still roll back to a consistent previous state.
				try {
					installedPackage = isUpdate
						? await this.replaceInstalledPackage(options.installedPackage, loader)
						: await this.persistInstalledPackage(loader);
				} catch (error) {
					await this.restoreFailedPackageInstallation(packageName, {
						backupDirectory,
						previousVersion,
					});

					throw new UnexpectedError('Failed to save installed package', {
						extra: { packageName },
						cause: error,
					});
				}

				// The new version is now authoritative; later failures must not roll back,
				// or the DB record would end up inconsistent with the restored files.
				await this.discardBackupDirectory(packageName, backupDirectory);
				// Publish the resolved version, not the requested specifier (e.g. `latest`),
				// so peers install the exact version this instance just persisted.
				const { installedVersion } = installedPackage;
				void this.publisher
					.publishCommand({
						command: isUpdate ? 'community-package-update' : 'community-package-install',
						payload: { packageName, packageVersion: installedVersion },
					})
					.catch((error) => {
						this.logger.warn('Failed to publish community package install/update event', {
							error: ensureError(error),
							packageName,
							packageVersion: installedVersion,
						});
					});
				await this.loadNodesAndCredentials.postProcessLoaders();
				this.loadNodesAndCredentials.releaseTypes();
				this.logger.info(`Community package installed: ${packageName}`);
				return installedPackage;
			} else {
				await this.restoreFailedPackageInstallation(packageName, {
					backupDirectory,
					previousVersion,
				});

				throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
			}
		});
	}

	@OnPubSubEvent('community-package-install')
	@OnPubSubEvent('community-package-update')
	async handleInstallEvent({
		packageName,
		packageVersion,
	}: { packageName: string; packageVersion: string }) {
		try {
			await this.installOrUpdateNpmPackage(packageName, packageVersion);
		} catch (error) {
			this.logger.error(`Failed to install community package ${packageName} from pubsub event`, {
				error: ensureError(error),
				packageName,
				packageVersion,
			});
		}
	}

	@OnPubSubEvent('community-package-uninstall')
	async handleUninstallEvent({ packageName }: { packageName: string }) {
		try {
			await this.removeNpmPackage(packageName);
		} catch (error) {
			this.logger.error(`Failed to uninstall community package ${packageName} from pubsub event`, {
				error: ensureError(error),
				packageName,
			});
		}
	}

	private async installOrUpdateNpmPackage(packageName: string, packageVersion: string) {
		return await this.packageMutex(async () => {
			const onDiskVersion = await this.readInstalledPackageVersion(packageName);
			if (onDiskVersion === packageVersion && this.loadNodesAndCredentials.loaders[packageName]) {
				this.logger.debug(
					`Community package ${packageName} already at ${packageVersion}, skipping`,
				);
				return;
			}

			const authToken = this.getNpmAuthToken();
			const backupDirectory = await this.backupPackageDirectory(packageName);

			// Only the directory is rolled back here, never the ledger: on a follower its
			// entry is justified by the leader's database record, not by this instance's disk.
			try {
				await this.downloadPackage(packageName, packageVersion, authToken);
				// The command may come from a newer leader in a mixed fleet.
				await this.assertPackageApiVersionSupported(packageName);
			} catch (error) {
				// No reload: the previous package was not unloaded before the download
				await this.restorePackageDirectory(packageName, backupDirectory);
				throw error;
			}

			// A failed load keeps the new directory: rolling back to a working older version
			// would leave this instance silently behind the leader's record.
			try {
				await this.loadNodesAndCredentials.unloadPackage(packageName);
				await this.loadNodesAndCredentials.loadPackage(packageName);
				await this.loadNodesAndCredentials.postProcessLoaders();
				this.loadNodesAndCredentials.releaseTypes();
			} finally {
				await this.discardBackupDirectory(packageName, backupDirectory);
			}

			this.logger.info(`Community package installed: ${packageName}`);
		});
	}

	private async removeNpmPackage(packageName: string) {
		return await this.packageMutex(async () => {
			await this.deletePackageDirectory(packageName);
			await this.loadNodesAndCredentials.unloadPackage(packageName);
			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
			this.logger.info(`Community package uninstalled: ${packageName}`);
		});
	}

	private resolvePackageDirectory(packageName: string) {
		return `${this.downloadFolder}/node_modules/${packageName}`;
	}

	private async packageDirectoryExists(packageName: string) {
		try {
			await access(this.resolvePackageDirectory(packageName), constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Moves the package directory aside, if there is one, so a failed install can put it
	 * back. Taking this once up front is what keeps a fresh install over an existing
	 * directory recoverable.
	 */
	private async backupPackageDirectory(packageName: string): Promise<string | undefined> {
		if (!(await this.packageDirectoryExists(packageName))) return undefined;

		const packageDirectory = this.resolvePackageDirectory(packageName);
		const backupDirectory = `${packageDirectory}.backup-${Date.now()}`;
		await rename(packageDirectory, backupDirectory);
		return backupDirectory;
	}

	/** Drops a backup that is no longer needed. Housekeeping: a failure must not fail the install. */
	private async discardBackupDirectory(packageName: string, backupDirectory?: string) {
		if (!backupDirectory) return;

		try {
			await rm(backupDirectory, { recursive: true, force: true, maxRetries: 3 });
		} catch (error) {
			this.logger.warn('Failed to remove community package backup directory', {
				error: ensureError(error),
				packageName,
				backupDirectory,
			});
		}
	}

	/** Discards whatever is at `packageDirectory` and puts the backup back in its place, if any. */
	private async restorePackageDirectoryFromBackup(packageName: string, backupDirectory?: string) {
		await this.deletePackageDirectory(packageName);
		if (!backupDirectory) return;
		await rename(backupDirectory, this.resolvePackageDirectory(packageName));
	}

	/**
	 * Puts the backup back in place. Kept apart from the ledger rollback below because a
	 * follower must not touch the ledger: its entry is justified by the leader's database
	 * record, not by this instance's disk.
	 */
	private async restorePackageDirectory(packageName: string, backupDirectory?: string) {
		try {
			await this.restorePackageDirectoryFromBackup(packageName, backupDirectory);
		} catch (cleanupError) {
			// `backupDirectory` is the only pointer to the files if the rename half failed: the
			// loader skips `.backup-<ts>` directories, so nothing finds them again on its own.
			this.logger.warn('Failed to restore community package directory after failed installation', {
				error: ensureError(cleanupError),
				packageName,
				backupDirectory,
			});
		}
	}

	/**
	 * Unloads the version that failed and loads back whatever the rollback left on disk.
	 * Only for callers that already unloaded the previous version.
	 */
	private async restoreLoadedPackage(packageName: string) {
		try {
			await this.loadNodesAndCredentials.unloadPackage(packageName);
			// Check the disk instead of assuming the rollback restored something: a rename
			// that failed halfway leaves no directory to load.
			if (await this.packageDirectoryExists(packageName)) {
				await this.loadNodesAndCredentials.loadPackage(packageName);
			}
		} catch (cleanupError) {
			this.logger.warn('Failed to reload community package after failed installation', {
				error: ensureError(cleanupError),
				packageName,
			});
		}

		// Runs even when the load above failed: `known` is only ever rebuilt here, so
		// skipping it leaves node types advertised with no loader behind them, which
		// `withLoadStatus` then reports as a healthy package.
		try {
			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
		} catch (cleanupError) {
			this.logger.warn('Failed to refresh node types after failed community package install', {
				error: ensureError(cleanupError),
				packageName,
			});
		}
	}

	private async restorePackageFiles(
		packageName: string,
		options: { backupDirectory?: string; previousVersion?: string },
	) {
		const { backupDirectory, previousVersion } = options;

		await this.restorePackageDirectory(packageName, backupDirectory);

		// Independent of the restore above: a failed restore must not leave package.json
		// pointing at the version that failed to install.
		try {
			if (previousVersion) {
				await this.updatePackageJsonDependency(packageName, previousVersion);
			} else {
				await this.removePackageJsonDependency(packageName);
			}
		} catch (cleanupError) {
			this.logger.warn('Failed to restore community package after failed installation', {
				error: ensureError(cleanupError),
				packageName,
			});
		}
	}

	/** Full rollback, for callers that already unloaded the package before failing. */
	private async restoreFailedPackageInstallation(
		packageName: string,
		options: { backupDirectory?: string; previousVersion?: string },
	) {
		await this.restorePackageFiles(packageName, options);
		await this.restoreLoadedPackage(packageName);
	}

	/**
	 * Writes the package into its directory, which the caller must have freed first.
	 * Recovering from a failure here is the caller's job: it holds the only backup, and
	 * only it knows whether a later step still needs one.
	 */
	private async downloadPackage(
		packageName: string,
		packageVersion: string,
		authToken?: string,
	): Promise<string> {
		const registry = this.getNpmRegistry();
		const packageDirectory = this.resolvePackageDirectory(packageName);

		await mkdir(packageDirectory, { recursive: true });

		// TODO: make sure that this works for scoped packages as well
		// if (packageName.startsWith('@') && packageName.includes('/')) {}
		const tarOutput = await executeNpmCommand(
			['pack', `${packageName}@${packageVersion}`, '--quiet'],
			{ cwd: this.downloadFolder, registry, authToken },
		);

		const tarballName = tarOutput?.trim();

		try {
			await asyncExecFile(
				'tar',
				['-xzf', tarballName, '-C', packageDirectory, '--strip-components=1'],
				{ cwd: this.downloadFolder },
			);

			// Strip dev, optional, and peer dependencies before running `npm install`
			const packageJsonPath = `${packageDirectory}/package.json`;
			const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const {
				devDependencies,
				peerDependencies,
				optionalDependencies,
				...packageJson
			}: {
				version: string;
				devDependencies: Record<string, string>;
				peerDependencies: Record<string, string>;
				optionalDependencies: Record<string, string>;
			} = JSON.parse(packageJsonContent);
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

			await executeNpmCommand(
				[
					'install',
					'--audit=false',
					'--fund=false',
					'--bin-links=false',
					'--install-strategy=shallow',
					'--ignore-scripts=true',
					'--package-lock=false',
				],
				{ cwd: packageDirectory, registry, authToken },
			);
			await this.updatePackageJsonDependency(packageName, packageJson.version);
		} finally {
			// `npm pack` failing to print a filename would otherwise resolve this to
			// `downloadFolder` itself, and the non-recursive `rm` would mask the real error.
			if (tarballName) {
				await rm(join(this.downloadFolder, tarballName));
			}
		}

		return packageDirectory;
	}

	private async deletePackageDirectory(packageName: string) {
		const packageDirectory = this.resolvePackageDirectory(packageName);
		// Node only retries ENOTEMPTY/EBUSY/EPERM when maxRetries > 0; these surface
		// transiently on overlayfs for large package trees.
		await rm(packageDirectory, { recursive: true, force: true, maxRetries: 3 });
	}

	async updatePackageJsonDependency(packageName: string, version: string) {
		await this.mutatePackageJsonDependencies((dependencies) => {
			dependencies[packageName] = version;
		});
	}

	private async removePackageJsonDependency(packageName: string) {
		await this.mutatePackageJsonDependencies((dependencies) => {
			delete dependencies[packageName];
		});
	}

	private async mutatePackageJsonDependencies(
		mutate: (dependencies: PackageJson['dependencies']) => void,
	) {
		// Heal here too, not just at boot: an unreadable ledger would otherwise fail
		// every install and uninstall until the process is restarted.
		const packageJson =
			(await this.readPackageJson()) ?? (await this.buildPackageJsonFromDatabase());

		mutate(packageJson.dependencies);
		await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
	}
}
