import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { LICENSE_FEATURES, Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { PackageDirectoryLoader } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { jsonParse, UnexpectedError, UserError, type PublicInstalledPackage } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access, constants, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { valid } from 'semver';

import { NODE_PACKAGE_PREFIX, NPM_PACKAGE_STATUS_GOOD, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
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

type PackageJson = {
	name: 'installed-nodes';
	private: true;
	dependencies: Record<string, string>;
};

@Service()
export class CommunityPackagesService {
	missingPackages: string[] = [];

	private readonly downloadFolder = this.instanceSettings.nodesDownloadDir;

	private readonly packageJsonPath = join(this.downloadFolder, 'package.json');

	private readonly http: HttpRequestClient;

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
			ssrf: 'disabled', // Fixed, n8n-controlled host
			timeout: REQUEST_TIMEOUT_MS,
		});
	}

	async init() {
		await this.ensurePackageJson();
		await this.checkForMissingPackages();
	}

	get hasMissingPackages() {
		return this.missingPackages.length > 0;
	}

	async findInstalledPackage(packageName: string) {
		return await this.installedPackageRepository.findOne({
			where: { packageName },
			relations: ['installedNodes'],
		});
	}

	async isPackageInstalled(packageName: string) {
		return await this.installedPackageRepository.exist({ where: { packageName } });
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

	matchMissingPackages(installedPackages: PublicInstalledPackage[]) {
		const missingPackagesList = this.missingPackages
			.map((name) => {
				try {
					// Strip away versions but maintain scope and package name
					const parsedPackageData = this.parseNpmPackageName(name);
					return parsedPackageData.packageName;
				} catch {
					return;
				}
			})
			.filter((i): i is string => i !== undefined);

		const packages: PublicInstalledPackage[] = [];

		for (const installedPackage of installedPackages) {
			const pkg = { ...installedPackage };

			if (missingPackagesList.includes(pkg.packageName)) {
				pkg.failedLoading = true;
			}

			packages.push(pkg);
		}

		return packages;
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

	hasPackageLoaded(packageName: string) {
		if (!this.missingPackages.length) return true;

		return !this.missingPackages.some(
			(packageNameAndVersion) =>
				packageNameAndVersion.startsWith(packageName) &&
				packageNameAndVersion.replace(packageName, '').startsWith('@'),
		);
	}

	removePackageFromMissingList(packageName: string) {
		try {
			this.missingPackages = this.missingPackages.filter(
				(packageNameAndVersion) =>
					!packageNameAndVersion.startsWith(packageName) ||
					!packageNameAndVersion.replace(packageName, '').startsWith('@'),
			);
		} catch {
			// do nothing
		}
	}

	async ensurePackageJson() {
		try {
			await access(this.packageJsonPath, constants.F_OK);
		} catch {
			await mkdir(this.downloadFolder, { recursive: true });
			const packageJson: PackageJson = {
				name: 'installed-nodes',
				private: true,
				dependencies: {},
			};
			await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
		}
	}

	async checkForMissingPackages() {
		const installedPackages = await this.getAllInstalledPackages();
		const missingPackages = new Set<{ packageName: string; version: string }>();

		installedPackages.forEach((installedPackage) => {
			installedPackage.installedNodes.forEach((installedNode) => {
				if (!this.loadNodesAndCredentials.isKnownNode(installedNode.type)) {
					// Leave the list ready for installing in case we need.
					missingPackages.add({
						packageName: installedPackage.packageName,
						version: installedPackage.installedVersion,
					});
				}
			});
		});

		this.missingPackages = [];

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

		this.missingPackages = [...missingPackages].map(
			(missingPackage) => `${missingPackage.packageName}@${missingPackage.version}`,
		);
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
		void this.publisher.publishCommand({
			command: 'community-package-uninstall',
			payload: { packageName },
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

		const previousVersion = isUpdate ? options.installedPackage.installedVersion : undefined;

		// Keep the previous version aside so a failed update can be rolled back
		const backupDirectory =
			isUpdate && (await this.packageDirectoryExists(packageName))
				? await this.backupPackageDirectory(packageName)
				: undefined;

		try {
			await this.downloadPackage(packageName, packageVersion, authToken);
		} catch (error) {
			// No reload here: the previous package was not unloaded before the download
			await this.restoreFailedPackageInstallation(packageName, {
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
				reloadPackage: isUpdate,
			});
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, { cause: error });
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
					reloadPackage: isUpdate,
				});

				throw new UnexpectedError('Failed to save installed package', {
					extra: { packageName },
					cause: error,
				});
			}

			// The new version is now authoritative; later failures must not roll back,
			// or the DB record would end up inconsistent with the restored files.
			// Removing the backup is housekeeping — a failure here must not fail the update.
			if (backupDirectory) {
				try {
					await rm(backupDirectory, { recursive: true, force: true });
				} catch (error) {
					this.logger.warn('Failed to remove community package backup directory', {
						error: ensureError(error),
						packageName,
						backupDirectory,
					});
				}
			}
			void this.publisher.publishCommand({
				command: isUpdate ? 'community-package-update' : 'community-package-install',
				payload: { packageName, packageVersion },
			});
			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
			this.logger.info(`Community package installed: ${packageName}`);
			return installedPackage;
		} else {
			await this.restoreFailedPackageInstallation(packageName, {
				backupDirectory,
				previousVersion,
				reloadPackage: isUpdate,
			});

			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	@OnPubSubEvent('community-package-install')
	@OnPubSubEvent('community-package-update')
	async handleInstallEvent({
		packageName,
		packageVersion,
	}: { packageName: string; packageVersion: string }) {
		await this.installOrUpdateNpmPackage(packageName, packageVersion);
	}

	@OnPubSubEvent('community-package-uninstall')
	async handleUninstallEvent({ packageName }: { packageName: string }) {
		await this.removeNpmPackage(packageName);
	}

	private async installOrUpdateNpmPackage(packageName: string, packageVersion: string) {
		const authToken = this.getNpmAuthToken();
		await this.downloadPackage(packageName, packageVersion, authToken);
		await this.loadNodesAndCredentials.unloadPackage(packageName);
		await this.loadNodesAndCredentials.loadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.loadNodesAndCredentials.releaseTypes();
		this.logger.info(`Community package installed: ${packageName}`);
	}

	private async removeNpmPackage(packageName: string) {
		await this.deletePackageDirectory(packageName);
		await this.loadNodesAndCredentials.unloadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.loadNodesAndCredentials.releaseTypes();
		this.logger.info(`Community package uninstalled: ${packageName}`);
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

	private async backupPackageDirectory(packageName: string) {
		const packageDirectory = this.resolvePackageDirectory(packageName);
		const backupDirectory = `${packageDirectory}.backup-${Date.now()}`;
		await rename(packageDirectory, backupDirectory);
		return backupDirectory;
	}

	private async restoreFailedPackageInstallation(
		packageName: string,
		options: { backupDirectory?: string; previousVersion?: string; reloadPackage?: boolean },
	) {
		const { backupDirectory, previousVersion, reloadPackage = false } = options;

		try {
			await this.deletePackageDirectory(packageName);

			if (previousVersion) {
				await this.updatePackageJsonDependency(packageName, previousVersion);
			} else {
				await this.removePackageJsonDependency(packageName);
			}

			if (!backupDirectory) return;

			await rename(backupDirectory, this.resolvePackageDirectory(packageName));

			if (!reloadPackage) return;

			await this.loadNodesAndCredentials.unloadPackage(packageName);
			await this.loadNodesAndCredentials.loadPackage(packageName);
			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
		} catch (cleanupError) {
			this.logger.warn('Failed to restore community package after failed installation', {
				error: ensureError(cleanupError),
				packageName,
			});
		}
	}

	private async downloadPackage(
		packageName: string,
		packageVersion: string,
		authToken?: string,
	): Promise<string> {
		const registry = this.getNpmRegistry();
		const packageDirectory = this.resolvePackageDirectory(packageName);

		// (Re)create the packageDir
		await this.deletePackageDirectory(packageName);
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
			await rm(join(this.downloadFolder, tarballName));
		}

		return packageDirectory;
	}

	private async deletePackageDirectory(packageName: string) {
		const packageDirectory = this.resolvePackageDirectory(packageName);
		await rm(packageDirectory, { recursive: true, force: true });
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
		const existingContent = await readFile(this.packageJsonPath, 'utf-8');
		const packageJson = jsonParse<PackageJson>(existingContent);
		mutate(packageJson.dependencies);
		await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
	}
}
