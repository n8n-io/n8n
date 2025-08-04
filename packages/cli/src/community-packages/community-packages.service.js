'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommunityPackagesService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const child_process_1 = require('child_process');
const promises_1 = require('fs/promises');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = require('path');
const util_1 = require('util');
const constants_2 = require('@/constants');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const license_1 = require('@/license');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const utils_1 = require('@/utils');
const community_packages_config_1 = require('./community-packages.config');
const npm_utils_1 = require('./npm-utils');
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
} = constants_2.RESPONSE_ERROR_MESSAGES;
const {
	NPM_PACKAGE_NOT_FOUND_ERROR,
	NPM_NO_VERSION_AVAILABLE,
	NPM_DISK_NO_SPACE,
	NPM_DISK_INSUFFICIENT_SPACE,
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR,
} = constants_2.NPM_COMMAND_TOKENS;
const asyncExec = (0, util_1.promisify)(child_process_1.exec);
const INVALID_OR_SUSPICIOUS_PACKAGE_NAME = /[^0-9a-z@\-._/]/;
let CommunityPackagesService = class CommunityPackagesService {
	constructor(
		instanceSettings,
		logger,
		installedPackageRepository,
		loadNodesAndCredentials,
		publisher,
		license,
		config,
	) {
		this.instanceSettings = instanceSettings;
		this.logger = logger;
		this.installedPackageRepository = installedPackageRepository;
		this.loadNodesAndCredentials = loadNodesAndCredentials;
		this.publisher = publisher;
		this.license = license;
		this.config = config;
		this.reinstallMissingPackages = false;
		this.missingPackages = [];
		this.downloadFolder = this.instanceSettings.nodesDownloadDir;
		this.packageJsonPath = (0, path_1.join)(this.downloadFolder, 'package.json');
	}
	async init() {
		await this.ensurePackageJson();
		await this.checkForMissingPackages();
	}
	get hasMissingPackages() {
		return this.missingPackages.length > 0;
	}
	async findInstalledPackage(packageName) {
		return await this.installedPackageRepository.findOne({
			where: { packageName },
			relations: ['installedNodes'],
		});
	}
	async isPackageInstalled(packageName) {
		return await this.installedPackageRepository.exist({ where: { packageName } });
	}
	async getAllInstalledPackages() {
		return await this.installedPackageRepository.find({ relations: ['installedNodes'] });
	}
	async removePackageFromDatabase(packageName) {
		return await this.installedPackageRepository.remove(packageName);
	}
	async persistInstalledPackage(packageLoader) {
		try {
			return await this.installedPackageRepository.saveInstalledPackageWithNodes(packageLoader);
		} catch (maybeError) {
			const error = (0, utils_1.toError)(maybeError);
			this.logger.error('Failed to save installed packages and nodes', {
				error,
				packageName: packageLoader.packageJson.name,
			});
			throw error;
		}
	}
	parseNpmPackageName(rawString) {
		if (!rawString) throw new n8n_workflow_1.UnexpectedError(PACKAGE_NAME_NOT_PROVIDED);
		if (INVALID_OR_SUSPICIOUS_PACKAGE_NAME.test(rawString)) {
			throw new n8n_workflow_1.UnexpectedError('Package name must be a single word');
		}
		const scope = rawString.includes('/') ? rawString.split('/')[0] : undefined;
		const packageNameWithoutScope = scope ? rawString.replace(`${scope}/`, '') : rawString;
		if (!packageNameWithoutScope.startsWith(constants_2.NODE_PACKAGE_PREFIX)) {
			throw new n8n_workflow_1.UnexpectedError(
				`Package name must start with ${constants_2.NODE_PACKAGE_PREFIX}`,
			);
		}
		const version = packageNameWithoutScope.includes('@')
			? packageNameWithoutScope.split('@')[1]
			: undefined;
		const packageName = version ? rawString.replace(`@${version}`, '') : rawString;
		return { packageName, scope, version, rawString };
	}
	async executeNpmCommand(command, options) {
		const execOptions = {
			cwd: this.downloadFolder,
			env: {
				NODE_PATH: process.env.NODE_PATH,
				PATH: process.env.PATH,
				APPDATA: process.env.APPDATA,
				NODE_ENV: 'production',
			},
		};
		try {
			const commandResult = await asyncExec(command, execOptions);
			return commandResult.stdout;
		} catch (error) {
			if (options?.doNotHandleError) throw error;
			const errorMessage =
				error instanceof Error ? error.message : constants_2.UNKNOWN_FAILURE_REASON;
			const map = {
				[NPM_PACKAGE_NOT_FOUND_ERROR]: PACKAGE_NOT_FOUND,
				[NPM_NO_VERSION_AVAILABLE]: PACKAGE_NOT_FOUND,
				[NPM_PACKAGE_VERSION_NOT_FOUND_ERROR]: PACKAGE_VERSION_NOT_FOUND,
				[NPM_DISK_NO_SPACE]: DISK_IS_FULL,
				[NPM_DISK_INSUFFICIENT_SPACE]: DISK_IS_FULL,
			};
			Object.entries(map).forEach(([npmMessage, n8nMessage]) => {
				if (errorMessage.includes(npmMessage)) throw new n8n_workflow_1.UnexpectedError(n8nMessage);
			});
			this.logger.warn('npm command failed', { errorMessage });
			throw new n8n_workflow_1.UnexpectedError(PACKAGE_FAILED_TO_INSTALL);
		}
	}
	matchPackagesWithUpdates(packages, updates) {
		if (!updates) return packages;
		return packages.reduce((acc, cur) => {
			const publicPackage = { ...cur };
			const update = updates[cur.packageName];
			if (update) publicPackage.updateAvailable = update.latest;
			acc.push(publicPackage);
			return acc;
		}, []);
	}
	matchMissingPackages(installedPackages) {
		const missingPackagesList = this.missingPackages
			.map((name) => {
				try {
					const parsedPackageData = this.parseNpmPackageName(name);
					return parsedPackageData.packageName;
				} catch {
					return;
				}
			})
			.filter((i) => i !== undefined);
		const hydratedPackageList = [];
		installedPackages.forEach((installedPackage) => {
			const hydratedInstalledPackage = { ...installedPackage };
			if (missingPackagesList.includes(hydratedInstalledPackage.packageName)) {
				hydratedInstalledPackage.failedLoading = true;
			}
			hydratedPackageList.push(hydratedInstalledPackage);
		});
		return hydratedPackageList;
	}
	async checkNpmPackageStatus(packageName) {
		const N8N_BACKEND_SERVICE_URL = 'https://api.n8n.io/api/package';
		try {
			const response = await axios_1.default.post(
				N8N_BACKEND_SERVICE_URL,
				{ name: packageName },
				{ method: 'POST' },
			);
			if (response.data.status !== constants_2.NPM_PACKAGE_STATUS_GOOD) return response.data;
		} catch {}
		return { status: constants_2.NPM_PACKAGE_STATUS_GOOD };
	}
	hasPackageLoaded(packageName) {
		if (!this.missingPackages.length) return true;
		return !this.missingPackages.some(
			(packageNameAndVersion) =>
				packageNameAndVersion.startsWith(packageName) &&
				packageNameAndVersion.replace(packageName, '').startsWith('@'),
		);
	}
	removePackageFromMissingList(packageName) {
		try {
			this.missingPackages = this.missingPackages.filter(
				(packageNameAndVersion) =>
					!packageNameAndVersion.startsWith(packageName) ||
					!packageNameAndVersion.replace(packageName, '').startsWith('@'),
			);
		} catch {}
	}
	async ensurePackageJson() {
		try {
			await (0, promises_1.access)(this.packageJsonPath, promises_1.constants.F_OK);
		} catch {
			await (0, promises_1.mkdir)(this.downloadFolder, { recursive: true });
			const packageJson = {
				name: 'installed-nodes',
				private: true,
				dependencies: {},
			};
			await (0, promises_1.writeFile)(
				this.packageJsonPath,
				JSON.stringify(packageJson, null, 2),
				'utf-8',
			);
		}
	}
	async checkForMissingPackages() {
		const installedPackages = await this.getAllInstalledPackages();
		const missingPackages = new Set();
		installedPackages.forEach((installedPackage) => {
			installedPackage.installedNodes.forEach((installedNode) => {
				if (!this.loadNodesAndCredentials.isKnownNode(installedNode.type)) {
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
			this.logger.info('Attempting to reinstall missing packages', { missingPackages });
			try {
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
	async installPackage(packageName, version, checksum) {
		return await this.installOrUpdatePackage(packageName, { version, checksum });
	}
	async updatePackage(packageName, installedPackage, version, checksum) {
		return await this.installOrUpdatePackage(packageName, { installedPackage, version, checksum });
	}
	async removePackage(packageName, installedPackage) {
		await this.removeNpmPackage(packageName);
		await this.removePackageFromDatabase(installedPackage);
		void this.publisher.publishCommand({
			command: 'community-package-uninstall',
			payload: { packageName },
		});
	}
	getNpmRegistry() {
		const { registry } = this.config;
		if (registry !== DEFAULT_REGISTRY && !this.license.isCustomNpmRegistryEnabled()) {
			throw new feature_not_licensed_error_1.FeatureNotLicensedError(
				constants_1.LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY,
			);
		}
		return registry;
	}
	getNpmInstallArgs() {
		return [...NPM_COMMON_ARGS, ...NPM_INSTALL_ARGS, `--registry=${this.getNpmRegistry()}`].join(
			' ',
		);
	}
	checkInstallPermissions(checksumProvided) {
		if (!this.config.unverifiedEnabled && !checksumProvided) {
			throw new n8n_workflow_1.UnexpectedError(
				'Installation of unverified community packages is forbidden!',
			);
		}
	}
	async installOrUpdatePackage(packageName, options = {}) {
		const isUpdate = 'installedPackage' in options;
		const packageVersion = !options.version ? 'latest' : options.version;
		const shouldValidateChecksum = 'checksum' in options && Boolean(options.checksum);
		this.checkInstallPermissions(shouldValidateChecksum);
		if (options.checksum) {
			await (0, npm_utils_1.verifyIntegrity)(
				packageName,
				packageVersion,
				this.getNpmRegistry(),
				options.checksum,
			);
		}
		await (0, npm_utils_1.isVersionExists)(packageName, packageVersion, this.getNpmRegistry());
		try {
			await this.downloadPackage(packageName, packageVersion);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === constants_2.RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND
			) {
				throw new n8n_workflow_1.UserError('npm package not found', { extra: { packageName } });
			}
			throw error;
		}
		let loader;
		try {
			await this.loadNodesAndCredentials.unloadPackage(packageName);
			loader = await this.loadNodesAndCredentials.loadPackage(packageName);
		} catch (error) {
			try {
				await this.deletePackageDirectory(packageName);
			} catch {}
			throw new n8n_workflow_1.UnexpectedError(
				constants_2.RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED,
				{ cause: error },
			);
		}
		if (loader.loadedNodes.length > 0) {
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
				throw new n8n_workflow_1.UnexpectedError('Failed to save installed package', {
					extra: { packageName },
					cause: error,
				});
			}
		} else {
			try {
				await this.deletePackageDirectory(packageName);
			} catch {}
			throw new n8n_workflow_1.UnexpectedError(
				constants_2.RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES,
			);
		}
	}
	async handleInstallEvent({ packageName, packageVersion }) {
		await this.installOrUpdateNpmPackage(packageName, packageVersion);
	}
	async handleUninstallEvent({ packageName }) {
		await this.removeNpmPackage(packageName);
	}
	async installOrUpdateNpmPackage(packageName, packageVersion) {
		await this.downloadPackage(packageName, packageVersion);
		await this.loadNodesAndCredentials.loadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.logger.info(`Community package installed: ${packageName}`);
	}
	async removeNpmPackage(packageName) {
		await this.deletePackageDirectory(packageName);
		await this.loadNodesAndCredentials.unloadPackage(packageName);
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.logger.info(`Community package uninstalled: ${packageName}`);
	}
	resolvePackageDirectory(packageName) {
		return `${this.downloadFolder}/node_modules/${packageName}`;
	}
	async downloadPackage(packageName, packageVersion) {
		const registry = this.getNpmRegistry();
		const packageDirectory = this.resolvePackageDirectory(packageName);
		await this.deletePackageDirectory(packageName);
		await (0, promises_1.mkdir)(packageDirectory, { recursive: true });
		const { stdout: tarOutput } = await asyncExec(
			`npm pack ${packageName}@${packageVersion} --registry=${registry} --quiet`,
			{ cwd: this.downloadFolder },
		);
		const tarballName = tarOutput?.trim();
		try {
			await asyncExec(`tar -xzf ${tarballName} -C ${packageDirectory} --strip-components=1`, {
				cwd: this.downloadFolder,
			});
			const packageJsonPath = `${packageDirectory}/package.json`;
			const packageJsonContent = await (0, promises_1.readFile)(packageJsonPath, 'utf-8');
			const { devDependencies, peerDependencies, optionalDependencies, ...packageJson } =
				JSON.parse(packageJsonContent);
			await (0, promises_1.writeFile)(
				packageJsonPath,
				JSON.stringify(packageJson, null, 2),
				'utf-8',
			);
			await asyncExec(`npm install ${this.getNpmInstallArgs()}`, { cwd: packageDirectory });
			await this.updatePackageJsonDependency(packageName, packageJson.version);
		} finally {
			await (0, promises_1.rm)((0, path_1.join)(this.downloadFolder, tarballName));
		}
		return packageDirectory;
	}
	async deletePackageDirectory(packageName) {
		const packageDirectory = this.resolvePackageDirectory(packageName);
		await (0, promises_1.rm)(packageDirectory, { recursive: true, force: true });
	}
	async updatePackageJsonDependency(packageName, version) {
		const existingContent = await (0, promises_1.readFile)(this.packageJsonPath, 'utf-8');
		const packageJson = (0, n8n_workflow_1.jsonParse)(existingContent);
		packageJson.dependencies[packageName] = version;
		await (0, promises_1.writeFile)(
			this.packageJsonPath,
			JSON.stringify(packageJson, null, 2),
			'utf-8',
		);
	}
};
exports.CommunityPackagesService = CommunityPackagesService;
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('community-package-install'),
		(0, decorators_1.OnPubSubEvent)('community-package-update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesService.prototype,
	'handleInstallEvent',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('community-package-uninstall'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CommunityPackagesService.prototype,
	'handleUninstallEvent',
	null,
);
exports.CommunityPackagesService = CommunityPackagesService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			n8n_core_1.InstanceSettings,
			backend_common_1.Logger,
			db_1.InstalledPackagesRepository,
			load_nodes_and_credentials_1.LoadNodesAndCredentials,
			publisher_service_1.Publisher,
			license_1.License,
			community_packages_config_1.CommunityPackagesConfig,
		]),
	],
	CommunityPackagesService,
);
//# sourceMappingURL=community-packages.service.js.map
