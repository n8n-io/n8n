import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';
import { Service } from 'typedi';
import { promisify } from 'util';
import axios from 'axios';

import { LoggerProxy as Logger } from 'n8n-workflow';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { UserSettings } from 'n8n-core';
import type { PackageDirectoryLoader } from 'n8n-core';

import { toError } from '@/utils';
import { InstalledPackagesRepository } from '@/databases/repositories/installedPackages.repository';
import type { InstalledPackages } from '@/databases/entities/InstalledPackages';
import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import type { CommunityPackages } from '@/Interfaces';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

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
	missingPackages: string[] = [];

	constructor(
		private readonly installedPackageRepository: InstalledPackagesRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	get hasMissingPackages() {
		return this.missingPackages.length > 0;
	}

	async findInstalledPackage(packageName: string) {
		return this.installedPackageRepository.findOne({
			where: { packageName },
			relations: ['installedNodes'],
		});
	}

	async isPackageInstalled(packageName: string) {
		return this.installedPackageRepository.exist({ where: { packageName } });
	}

	async getAllInstalledPackages() {
		return this.installedPackageRepository.find({ relations: ['installedNodes'] });
	}

	async removePackageFromDatabase(packageName: InstalledPackages) {
		return this.installedPackageRepository.remove(packageName);
	}

	async persistInstalledPackage(packageLoader: PackageDirectoryLoader) {
		try {
			return await this.installedPackageRepository.saveInstalledPackageWithNodes(packageLoader);
		} catch (maybeError) {
			const error = toError(maybeError);

			Logger.error('Failed to save installed packages and nodes', {
				error,
				packageName: packageLoader.packageJson.name,
			});

			throw error;
		}
	}

	parseNpmPackageName(rawString?: string): CommunityPackages.ParsedPackageName {
		if (!rawString) throw new Error(PACKAGE_NAME_NOT_PROVIDED);

		if (INVALID_OR_SUSPICIOUS_PACKAGE_NAME.test(rawString)) {
			throw new Error('Package name must be a single word');
		}

		const scope = rawString.includes('/') ? rawString.split('/')[0] : undefined;

		const packageNameWithoutScope = scope ? rawString.replace(`${scope}/`, '') : rawString;

		if (!packageNameWithoutScope.startsWith(NODE_PACKAGE_PREFIX)) {
			throw new Error(`Package name must start with ${NODE_PACKAGE_PREFIX}`);
		}

		const version = packageNameWithoutScope.includes('@')
			? packageNameWithoutScope.split('@')[1]
			: undefined;

		const packageName = version ? rawString.replace(`@${version}`, '') : rawString;

		return { packageName, scope, version, rawString };
	}

	async executeNpmCommand(command: string, options?: { doNotHandleError?: boolean }) {
		const downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();

		const execOptions = {
			cwd: downloadFolder,
			env: {
				NODE_PATH: process.env.NODE_PATH,
				PATH: process.env.PATH,
				APPDATA: process.env.APPDATA,
			},
		};

		try {
			await fsAccess(downloadFolder);
		} catch {
			await fsMkdir(downloadFolder);
			// Also init the folder since some versions
			// of npm complain if the folder is empty
			await asyncExec('npm init -y', execOptions);
		}

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
				if (errorMessage.includes(npmMessage)) throw new Error(n8nMessage);
			});

			Logger.warn('npm command failed', { errorMessage });

			throw new Error(PACKAGE_FAILED_TO_INSTALL);
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

	async setMissingPackages({ reinstallMissingPackages }: { reinstallMissingPackages: boolean }) {
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

		Logger.error(
			'n8n detected that some packages are missing. For more information, visit https://docs.n8n.io/integrations/community-nodes/troubleshooting/',
		);

		if (reinstallMissingPackages || process.env.N8N_REINSTALL_MISSING_PACKAGES) {
			Logger.info('Attempting to reinstall missing packages', { missingPackages });
			try {
				// Optimistic approach - stop if any installation fails

				for (const missingPackage of missingPackages) {
					await this.installNpmModule(missingPackage.packageName, missingPackage.version);

					missingPackages.delete(missingPackage);
				}
				Logger.info('Packages reinstalled successfully. Resuming regular initialization.');
			} catch (error) {
				Logger.error('n8n was unable to install the missing packages.');
			}
		}

		this.missingPackages = [...missingPackages].map(
			(missingPackage) => `${missingPackage.packageName}@${missingPackage.version}`,
		);
	}

	async installNpmModule(packageName: string, version?: string): Promise<InstalledPackages> {
		return this.installOrUpdateNpmModule(packageName, { version });
	}

	async updateNpmModule(
		packageName: string,
		installedPackage: InstalledPackages,
	): Promise<InstalledPackages> {
		return this.installOrUpdateNpmModule(packageName, { installedPackage });
	}

	async removeNpmModule(packageName: string, installedPackage: InstalledPackages): Promise<void> {
		await this.executeNpmCommand(`npm remove ${packageName}`);
		await this.removePackageFromDatabase(installedPackage);
		await this.loadNodesAndCredentials.unloadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
	}

	private async installOrUpdateNpmModule(
		packageName: string,
		options: { version?: string } | { installedPackage: InstalledPackages },
	) {
		const isUpdate = 'installedPackage' in options;
		const command = isUpdate
			? `npm update ${packageName}`
			: `npm install ${packageName}${options.version ? `@${options.version}` : ''}`;

		try {
			await this.executeNpmCommand(command);
		} catch (error) {
			if (error instanceof Error && error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		let loader: PackageDirectoryLoader;
		try {
			loader = await this.loadNodesAndCredentials.loadPackage(packageName);
		} catch (error) {
			// Remove this package since loading it failed
			const removeCommand = `npm remove ${packageName}`;
			try {
				await this.executeNpmCommand(removeCommand);
			} catch {}
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, { cause: error });
		}

		if (loader.loadedNodes.length > 0) {
			// Save info to DB
			try {
				if (isUpdate) {
					await this.removePackageFromDatabase(options.installedPackage);
				}
				const installedPackage = await this.persistInstalledPackage(loader);
				await this.loadNodesAndCredentials.postProcessLoaders();
				return installedPackage;
			} catch (error) {
				throw new Error(`Failed to save installed package: ${packageName}`, { cause: error });
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await this.executeNpmCommand(removeCommand);
			} catch {}

			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}
}
