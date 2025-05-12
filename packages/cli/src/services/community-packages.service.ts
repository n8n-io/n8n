import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { InstalledPackages } from '@n8n/db';
import { InstalledPackagesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import axios from 'axios';
import { exec } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { PackageDirectoryLoader } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';
import { UnexpectedError, UserError, type PublicInstalledPackage } from 'n8n-workflow';
import { promisify } from 'util';

import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import type { CommunityPackages } from '@/interfaces';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { toError } from '@/utils';

import { verifyIntegrity } from '../utils/npm-utils';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const NPM_COMMON_ARGS = ['--audit=false', '--fund=false'];
const NPM_INSTALL_ARGS = [
	'--bin-links=false',
	'--install-strategy=shallow',
	'--ignore-scripts=true',
	'--package-lock=false',
];

const {
	PACKAGE_NAME_NOT_PROVIDED,
	DISK_IS_FULL,
	PACKAGE_FAILED_TO_INSTALL,
	PACKAGE_VERSION_NOT_FOUND,
	PACKAGE_NOT_FOUND,
} = RESPONSE_ERROR_MESSAGES;

const {
	NPM_PACKAGE_NOT_FOUND_ERROR,
	NPM_NO_VERSION_AVAILABLE,
	NPM_DISK_NO_SPACE,
	NPM_DISK_INSUFFICIENT_SPACE,
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR,
} = NPM_COMMAND_TOKENS;

const asyncExec = promisify(exec);

const INVALID_OR_SUSPICIOUS_PACKAGE_NAME = /[^0-9a-z@\-./]/;

@Service()
export class CommunityPackagesService {
	reinstallMissingPackages = false;

	missingPackages: string[] = [];

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly installedPackageRepository: InstalledPackagesRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly publisher: Publisher,
		private readonly license: License,
		private readonly globalConfig: GlobalConfig,
	) {}

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

		const packageName = version ? rawString.replace(`@${version}`, '') : rawString;

		return { packageName, scope, version, rawString };
	}

	/** @deprecated */
	async executeNpmCommand(command: string, options?: { doNotHandleError?: boolean }) {
		const downloadFolder = this.instanceSettings.nodesDownloadDir;

		const execOptions = {
			cwd: downloadFolder,
			env: {
				NODE_PATH: process.env.NODE_PATH,
				PATH: process.env.PATH,
				APPDATA: process.env.APPDATA,
				NODE_ENV: 'production',
			},
		};

		await mkdir(downloadFolder, { recursive: true });

		try {
			const commandResult = await asyncExec(command, execOptions);

			return commandResult.stdout;
		} catch (error) {
			if (options?.doNotHandleError) throw error;

			const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

			const map = {
				[NPM_PACKAGE_NOT_FOUND_ERROR]: PACKAGE_NOT_FOUND,
				[NPM_NO_VERSION_AVAILABLE]: PACKAGE_NOT_FOUND,
				[NPM_PACKAGE_VERSION_NOT_FOUND_ERROR]: PACKAGE_VERSION_NOT_FOUND,
				[NPM_DISK_NO_SPACE]: DISK_IS_FULL,
				[NPM_DISK_INSUFFICIENT_SPACE]: DISK_IS_FULL,
			};

			Object.entries(map).forEach(([npmMessage, n8nMessage]) => {
				if (errorMessage.includes(npmMessage)) throw new UnexpectedError(n8nMessage);
			});

			this.logger.warn('npm command failed', { errorMessage });

			throw new UnexpectedError(PACKAGE_FAILED_TO_INSTALL);
		}
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

		const { reinstallMissing } = this.globalConfig.nodes.communityPackages;
		if (reinstallMissing) {
			this.logger.info('Attempting to reinstall missing packages', { missingPackages });
			try {
				// Optimistic approach - stop if any installation fails
				for (const missingPackage of missingPackages) {
					await this.installPackage(missingPackage.packageName, missingPackage.version);

					missingPackages.delete(missingPackage);
				}
				this.logger.info('Packages reinstalled successfully. Resuming regular initialization.');
				await this.loadNodesAndCredentials.postProcessLoaders();
			} catch (error) {
				this.logger.error('n8n was unable to install the missing packages.');
			}
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
	): Promise<InstalledPackages> {
		return await this.installOrUpdatePackage(packageName, { installedPackage });
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
		const { registry } = this.globalConfig.nodes.communityPackages;
		if (registry !== DEFAULT_REGISTRY && !this.license.isCustomNpmRegistryEnabled()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY);
		}
		return registry;
	}

	private getNpmInstallArgs() {
		return [...NPM_COMMON_ARGS, ...NPM_INSTALL_ARGS, `--registry=${this.getNpmRegistry()}`].join(
			' ',
		);
	}

	private checkInstallPermissions(isUpdate: boolean, checksumProvided: boolean) {
		if (isUpdate) return;

		if (!this.globalConfig.nodes.communityPackages.unverifiedEnabled && !checksumProvided) {
			throw new UnexpectedError('Installation of unverified community packages is forbidden!');
		}
	}

	private async installOrUpdatePackage(
		packageName: string,
		options: { version?: string; checksum?: string } | { installedPackage: InstalledPackages },
	) {
		const isUpdate = 'installedPackage' in options;
		const packageVersion = isUpdate || !options.version ? 'latest' : options.version;

		const shouldValidateChecksum = 'checksum' in options && Boolean(options.checksum);
		this.checkInstallPermissions(isUpdate, shouldValidateChecksum);

		if (!isUpdate && options.checksum) {
			await verifyIntegrity(packageName, packageVersion, this.getNpmRegistry(), options.checksum);
		}

		try {
			await this.downloadPackage(packageName, packageVersion);
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
			} catch {}
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, { cause: error });
		}

		if (loader.loadedNodes.length > 0) {
			// Save info to DB
			try {
				if (isUpdate) {
					await this.removePackageFromDatabase(options.installedPackage);
				}
				const installedPackage = await this.persistInstalledPackage(loader);
				void this.publisher.publishCommand({
					command: isUpdate ? 'community-package-update' : 'community-package-install',
					payload: { packageName, packageVersion },
				});
				await this.loadNodesAndCredentials.postProcessLoaders();
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
			} catch {}
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	async installOrUpdateNpmPackage(packageName: string, packageVersion: string) {
		await this.downloadPackage(packageName, packageVersion);
		await this.loadNodesAndCredentials.loadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.logger.info(`Community package installed: ${packageName}`);
	}

	async removeNpmPackage(packageName: string) {
		await this.deletePackageDirectory(packageName);
		await this.loadNodesAndCredentials.unloadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.logger.info(`Community package uninstalled: ${packageName}`);
	}

	private resolvePackageDirectory(packageName: string) {
		const downloadFolder = this.instanceSettings.nodesDownloadDir;
		return `${downloadFolder}/node_modules/${packageName}`;
	}

	private async downloadPackage(packageName: string, packageVersion: string): Promise<string> {
		const registry = this.getNpmRegistry();
		const downloadFolder = this.instanceSettings.nodesDownloadDir;
		const packageDirectory = this.resolvePackageDirectory(packageName);

		// (Re)create the packageDir
		await this.deletePackageDirectory(packageName);
		await mkdir(packageDirectory, { recursive: true });

		// TODO: make sure that this works for scoped packages as well
		// if (packageName.startsWith('@') && packageName.includes('/')) {}

		const { stdout: tarOutput } = await asyncExec(
			`npm pack ${packageName}@${packageVersion} --registry=${registry} --quiet`,
			{ cwd: downloadFolder },
		);

		const tarballName = tarOutput?.trim();

		try {
			await asyncExec(`tar -xzf ${tarballName} -C ${packageDirectory} --strip-components=1`, {
				cwd: downloadFolder,
			});

			// Strip dev, optional, and peer dependencies before running `npm install`
			const packageJsonPath = `${packageDirectory}/package.json`;
			const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { devDependencies, peerDependencies, optionalDependencies, ...packageJson } =
				JSON.parse(packageJsonContent);
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

			await asyncExec(`npm install ${this.getNpmInstallArgs()}`, { cwd: packageDirectory });
		} finally {
			await asyncExec(`rm ${tarballName}`, { cwd: downloadFolder });
		}

		return packageDirectory;
	}

	private async deletePackageDirectory(packageName: string) {
		const packageDirectory = this.resolvePackageDirectory(packageName);
		await asyncExec(`rm -rf ${packageDirectory}`);
	}
}
