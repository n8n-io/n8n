import { Logger } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import axios from 'axios';
import type { PackageDirectoryLoader } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import {
	ensureError,
	jsonParse,
	UnexpectedError,
	UserError,
	type PublicInstalledPackage,
} from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import npa from 'npm-package-arg';
import { gt as semverGt } from 'semver';

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
import { executeNpmCommand, resolvePackageVersionSpecOrThrow, verifyIntegrity } from './npm-utils';

const asyncExecFile = promisify(execFile);

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const NPM_COMMON_ARGS = ['--audit=false', '--fund=false'];
const NPM_INSTALL_ARGS = [
	'--bin-links=false',
	'--install-strategy=shallow',
	'--ignore-scripts=true',
	'--package-lock=false',
];

const { PACKAGE_NAME_NOT_PROVIDED } = RESPONSE_ERROR_MESSAGES;

type PackageJson = {
	name: 'installed-nodes';
	private: true;
	dependencies: Record<string, string>;
};

type PackageVersionSelection = {
	version: string;
	requestedDistTag?: string;
};

type MissingPackage = {
	packageName: string;
	version: string;
	requestedDistTag?: string;
};

type InstallOrUpdatePackageOptions = {
	installedPackage?: InstalledPackages;
	version?: string;
	checksum?: string;
	requestedDistTag?: string;
};

type CommunityPackageInstallEventPayload = {
	packageName: string;
	packageVersion: string;
	requestedDistTag?: string;
};

@Service()
export class CommunityPackagesService {
	missingPackages: string[] = [];

	private readonly downloadFolder = this.instanceSettings.nodesDownloadDir;

	private readonly packageJsonPath = join(this.downloadFolder, 'package.json');

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly installedPackageRepository: InstalledPackagesRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly publisher: Publisher,
		private readonly license: License,
		private readonly config: CommunityPackagesConfig,
	) {}

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

	private async persistInstalledPackage(
		packageLoader: PackageDirectoryLoader,
		requestedDistTag?: string,
	) {
		try {
			return await this.installedPackageRepository.saveInstalledPackageWithNodes(
				packageLoader,
				requestedDistTag,
			);
		} catch (maybeError) {
			const error = toError(maybeError);

			this.logger.error('Failed to save installed packages and nodes', {
				error,
				packageName: packageLoader.packageJson.name,
			});

			throw error;
		}
	}

	parseNpmPackageName(rawString?: string): CommunityPackages.ParsedPackageName {
		if (!rawString) throw new UnexpectedError(PACKAGE_NAME_NOT_PROVIDED);

		const versionSpec = this.extractVersionSpec(rawString);

		let parsedPackageSpec: ReturnType<typeof npa>;
		try {
			parsedPackageSpec = npa(rawString);
		} catch {
			throw this.createInvalidPackageSpecError(rawString);
		}

		const packageName = parsedPackageSpec.name;
		if (!packageName) {
			throw this.createInvalidPackageSpecError(rawString);
		}

		this.assertPackageNamePrefix(packageName);

		const scope = parsedPackageSpec.scope;

		if (rawString === packageName) {
			return { packageName, rawString, scope };
		}

		if (!parsedPackageSpec.registry || !this.isSupportedRegistrySpec(parsedPackageSpec.type)) {
			throw new UnexpectedError(`Invalid version: ${versionSpec ?? parsedPackageSpec.rawSpec}`);
		}

		const requestedVersion = parsedPackageSpec.rawSpec;
		if (!requestedVersion) {
			throw this.createInvalidPackageSpecError(rawString);
		}

		return {
			packageName,
			rawString,
			scope,
			version: requestedVersion,
			requestedDistTag:
				parsedPackageSpec.type === 'tag' && requestedVersion !== 'latest'
					? requestedVersion
					: undefined,
		};
	}

	parsePackageVersion(packageName: string, version: string): PackageVersionSelection {
		const parsedPackage = this.parseNpmPackageName(`${packageName}@${version}`);

		if (!parsedPackage.version) {
			throw new UnexpectedError(`Invalid version: ${version}`);
		}

		return {
			version: parsedPackage.version,
			requestedDistTag: parsedPackage.requestedDistTag,
		};
	}

	toPublicInstalledPackage(installedPackage: InstalledPackages): PublicInstalledPackage {
		return {
			packageName: installedPackage.packageName,
			installedVersion: installedPackage.installedVersion,
			authorName: installedPackage.authorName,
			authorEmail: installedPackage.authorEmail,
			installedNodes: installedPackage.installedNodes,
			createdAt: installedPackage.createdAt,
			updatedAt: installedPackage.updatedAt,
		};
	}

	matchPackagesWithUpdates(
		packages: InstalledPackages[],
		updates?: CommunityPackages.AvailableUpdates,
	) {
		if (!updates) return packages.map((pkg) => this.toPublicInstalledPackage(pkg));

		return packages.reduce<PublicInstalledPackage[]>((acc, cur) => {
			const publicPackage = this.toPublicInstalledPackage(cur);

			const update = updates[cur.packageName];

			if (update) {
				const updateVersion = cur.requestedDistTag ? update.wanted : update.latest;

				if (updateVersion && semverGt(updateVersion, cur.installedVersion)) {
					publicPackage.updateAvailable = updateVersion;
				}
			}

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

		const hydratedPackageList: PublicInstalledPackage[] = [];

		installedPackages.forEach((installedPackage) => {
			const hydratedInstalledPackage = { ...installedPackage };

			if (missingPackagesList.includes(hydratedInstalledPackage.packageName)) {
				hydratedInstalledPackage.failedLoading = true;
			}

			hydratedPackageList.push(hydratedInstalledPackage);
		});

		return hydratedPackageList;
	}

	async checkNpmPackageStatus(packageName: string) {
		const N8N_BACKEND_SERVICE_URL = 'https://api.n8n.io/api/package';

		try {
			const response = await axios.post<CommunityPackages.PackageStatusCheck>(
				N8N_BACKEND_SERVICE_URL,
				{ name: packageName },
				{ method: 'POST' },
			);

			if (response.data.status !== NPM_PACKAGE_STATUS_GOOD) return response.data;
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
		const missingPackages = new Map<string, MissingPackage>();

		installedPackages.forEach((installedPackage) => {
			installedPackage.installedNodes.forEach((installedNode) => {
				if (!this.loadNodesAndCredentials.isKnownNode(installedNode.type)) {
					// Leave the list ready for installing in case we need.
					missingPackages.set(installedPackage.packageName, {
						packageName: installedPackage.packageName,
						version: installedPackage.installedVersion,
						requestedDistTag: this.normalizeRequestedDistTag(installedPackage.requestedDistTag),
					});
				}
			});
		});

		this.missingPackages = [];

		if (missingPackages.size === 0) return;

		const { reinstallMissing } = this.config;
		if (reinstallMissing) {
			this.logger.info('Attempting to reinstall missing packages', {
				missingPackages: [...missingPackages.values()],
			});
			const environment = process.env.ENVIRONMENT === 'staging' ? 'staging' : 'production';

			const missingPackageEntries = [...missingPackages.values()];
			const packageNames = missingPackageEntries.map((p) => p.packageName);

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

			for (const missingPackage of missingPackageEntries) {
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

					await this.installPackage(
						missingPackage.packageName,
						missingPackage.version,
						checksum,
						missingPackage.requestedDistTag,
					);
					missingPackages.delete(missingPackage.packageName);
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

		this.missingPackages = [...missingPackages.values()].map(
			(missingPackage) => `${missingPackage.packageName}@${missingPackage.version}`,
		);
	}

	async installPackage(
		packageName: string,
		version?: string,
		checksum?: string,
		requestedDistTag?: string,
	): Promise<InstalledPackages> {
		return await this.installOrUpdatePackage(packageName, {
			version,
			checksum,
			requestedDistTag,
		});
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
		await this.removePackageJsonDependency(packageName);
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

	private getNpmInstallArgs() {
		return [...NPM_COMMON_ARGS, ...NPM_INSTALL_ARGS, `--registry=${this.getNpmRegistry()}`];
	}

	private checkInstallPermissions(checksumProvided: boolean) {
		if (!this.config.unverifiedEnabled && !checksumProvided) {
			throw new UnexpectedError('Installation of unverified community packages is forbidden!');
		}
	}

	private async installOrUpdatePackage(
		packageName: string,
		options: InstallOrUpdatePackageOptions = {},
	) {
		const isUpdate = options.installedPackage !== undefined;
		const shouldValidateChecksum = 'checksum' in options && Boolean(options.checksum);
		this.checkInstallPermissions(shouldValidateChecksum);
		const requestedVersionSelection = this.getRequestedVersionSelection(packageName, options);

		const registry = this.getNpmRegistry();
		const resolvedPackageVersion = await resolvePackageVersionSpecOrThrow(
			packageName,
			requestedVersionSelection.version,
			registry,
		);

		if (options.checksum) {
			await verifyIntegrity(packageName, resolvedPackageVersion, registry, options.checksum);
		}

		try {
			await this.downloadPackage(
				packageName,
				resolvedPackageVersion,
				requestedVersionSelection.requestedDistTag ?? resolvedPackageVersion,
			);
		} catch (error) {
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
			// Remove this package since loading it failed
			try {
				await this.deletePackageDirectory(packageName);
			} catch {
				// Ignore cleanup errors
			}
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, { cause: error });
		}

		if (loader.loadedNodes.length > 0) {
			// Save info to DB
			try {
				if (options.installedPackage) {
					await this.removePackageFromDatabase(options.installedPackage);
				}
				const installedPackage = await this.persistInstalledPackage(
					loader,
					requestedVersionSelection.requestedDistTag,
				);
				const pubSubPayload: CommunityPackageInstallEventPayload = {
					packageName,
					packageVersion: resolvedPackageVersion,
				};

				if (requestedVersionSelection.requestedDistTag) {
					pubSubPayload.requestedDistTag = requestedVersionSelection.requestedDistTag;
				}

				void this.publisher.publishCommand({
					command: isUpdate ? 'community-package-update' : 'community-package-install',
					payload: pubSubPayload,
				});
				await this.loadNodesAndCredentials.postProcessLoaders();
				this.loadNodesAndCredentials.releaseTypes();
				this.logger.info(`Community package installed: ${packageName}`);
				return installedPackage;
			} catch (error) {
				throw new UnexpectedError('Failed to save installed package', {
					extra: { packageName },
					cause: error,
				});
			}
		} else {
			// Remove this package since it contains no loadable nodes
			try {
				await this.deletePackageDirectory(packageName);
			} catch {
				// Ignore cleanup errors
			}
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	@OnPubSubEvent('community-package-install')
	@OnPubSubEvent('community-package-update')
	async handleInstallEvent({
		packageName,
		packageVersion,
		requestedDistTag,
	}: CommunityPackageInstallEventPayload) {
		await this.installOrUpdateNpmPackage(
			packageName,
			packageVersion,
			requestedDistTag ?? packageVersion,
		);
	}

	@OnPubSubEvent('community-package-uninstall')
	async handleUninstallEvent({ packageName }: { packageName: string }) {
		await this.removeNpmPackage(packageName);
	}

	private async installOrUpdateNpmPackage(
		packageName: string,
		packageVersion: string,
		dependencyVersion: string,
	) {
		await this.downloadPackage(packageName, packageVersion, dependencyVersion);
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

	private async downloadPackage(
		packageName: string,
		packageVersion: string,
		dependencyVersion: string,
	): Promise<string> {
		const registry = this.getNpmRegistry();
		const packageDirectory = this.resolvePackageDirectory(packageName);

		// (Re)create the packageDir
		await this.deletePackageDirectory(packageName);
		await mkdir(packageDirectory, { recursive: true });

		// TODO: make sure that this works for scoped packages as well
		// if (packageName.startsWith('@') && packageName.includes('/')) {}
		const tarOutput = await executeNpmCommand(
			['pack', `${packageName}@${packageVersion}`, `--registry=${registry}`, '--quiet'],
			{ cwd: this.downloadFolder },
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

			await executeNpmCommand(['install', ...this.getNpmInstallArgs()], {
				cwd: packageDirectory,
			});
			await this.updatePackageJsonDependency(packageName, dependencyVersion);
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
		const existingContent = await readFile(this.packageJsonPath, 'utf-8');
		const packageJson = jsonParse<PackageJson>(existingContent);
		packageJson.dependencies[packageName] = version;
		await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
	}

	async removePackageJsonDependency(packageName: string) {
		const existingContent = await readFile(this.packageJsonPath, 'utf-8');
		const packageJson = jsonParse<PackageJson>(existingContent);
		delete packageJson.dependencies[packageName];
		await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
	}

	private getRequestedVersionSelection(
		packageName: string,
		options: InstallOrUpdatePackageOptions,
	): PackageVersionSelection {
		if (options.version) {
			const requestedVersionSelection = this.parsePackageVersion(packageName, options.version);

			// Missing-package recovery reinstalls the exact version that vanished, but updates
			// should continue to follow the original dist-tag the user selected.
			if (!requestedVersionSelection.requestedDistTag && options.requestedDistTag) {
				requestedVersionSelection.requestedDistTag = options.requestedDistTag;
			}

			return requestedVersionSelection;
		}

		const requestedVersion =
			options.requestedDistTag ??
			this.normalizeRequestedDistTag(options.installedPackage?.requestedDistTag);

		if (!requestedVersion) return { version: 'latest' };

		return this.parsePackageVersion(packageName, requestedVersion);
	}

	private normalizeRequestedDistTag(requestedDistTag: unknown): string | undefined {
		return typeof requestedDistTag === 'string' ? requestedDistTag : undefined;
	}

	private createInvalidPackageSpecError(rawString: string) {
		const versionSpec = this.extractVersionSpec(rawString);

		if (versionSpec) {
			return new UnexpectedError(`Invalid version: ${versionSpec}`);
		}

		return new UnexpectedError('Package name must be a single word');
	}

	private extractVersionSpec(rawString: string) {
		const versionSeparatorIndex = rawString.startsWith('@')
			? rawString.indexOf('@', rawString.indexOf('/') + 1)
			: rawString.indexOf('@');

		if (versionSeparatorIndex <= 0) return undefined;

		return rawString.slice(versionSeparatorIndex + 1);
	}

	private assertPackageNamePrefix(packageName: string) {
		const packageNameWithoutScope = packageName.includes('/')
			? packageName.split('/').at(-1)
			: packageName;

		if (!packageNameWithoutScope?.startsWith(NODE_PACKAGE_PREFIX)) {
			throw new UnexpectedError(`Package name must start with ${NODE_PACKAGE_PREFIX}`);
		}
	}

	private isSupportedRegistrySpec(type: string): type is 'tag' | 'version' {
		return type === 'tag' || type === 'version';
	}
}
