import path from 'path';
import { access as fsAccess, readdir as fsReaddir, stat as fsStat } from 'fs/promises';
import {
	CustomDirectoryLoader,
	DirectoryLoader,
	PackageDirectoryLoader,
	CUSTOM_EXTENSION_ENV,
	UserSettings,
} from 'n8n-core';
import { ICredentialTypeData, INodeTypeData, LoggerProxy } from 'n8n-workflow';
import config from '../config';
import { NodeTypes } from '.';
import { InstalledPackages } from './databases/entities/InstalledPackages';
import { InstalledNodes } from './databases/entities/InstalledNodes';
import { executeCommand } from './CommunityNodes/helpers';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import {
	persistInstalledPackageData,
	removePackageFromDatabase,
} from './CommunityNodes/packageModel';

class LoadNodesAndCredentialsClass {
	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	excludeNodes: string | undefined = undefined;

	includeNodes: string | undefined = undefined;

	nodeModulesPath = '';

	async init() {
		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		module.constructor._initPaths();

		this.nodeModulesPath = await this.getNodeModulesFolderLocation();

		this.excludeNodes = config.getEnv('nodes.exclude');
		this.includeNodes = config.getEnv('nodes.include');

		// Get all the installed packages which contain n8n nodes
		const nodePackages = await this.getN8nNodePackages(this.nodeModulesPath);

		for (const packagePath of nodePackages) {
			await this.loadClasses(PackageDirectoryLoader, packagePath);
		}

		await this.loadNodesFromDownloadedPackages();

		await this.loadNodesFromCustomFolders();
	}

	async getNodeModulesFolderLocation(): Promise<string> {
		// Get the path to the node-modules folder to be later able
		// to load the credentials and nodes
		const checkPaths = [
			// In case "n8n" package is in same node_modules folder.
			path.join(__dirname, '..', '..', '..', 'n8n-workflow'),
			// In case "n8n" package is the root and the packages are
			// in the "node_modules" folder underneath it.
			path.join(__dirname, '..', '..', 'node_modules', 'n8n-workflow'),
			// In case "n8n" package is installed using npm/yarn workspaces
			// the node_modules folder is in the root of the workspace.
			path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'n8n-workflow'),
		];
		for (const checkPath of checkPaths) {
			try {
				await fsAccess(checkPath);
				// Folder exists, so use it.
				return path.dirname(checkPath);
			} catch (_) {} // Folder does not exist so get next one
		}
		throw new Error('Could not find "node_modules" folder!');
	}

	async loadNodesFromDownloadedPackages(): Promise<void> {
		const nodePackages = [];
		try {
			// Read downloaded nodes and credentials
			const downloadedNodesFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();
			const downloadedNodesFolderModules = path.join(downloadedNodesFolder, 'node_modules');
			await fsAccess(downloadedNodesFolderModules);
			const downloadedPackages = await this.getN8nNodePackages(downloadedNodesFolderModules);
			nodePackages.push(...downloadedPackages);
		} catch (_) {}

		for (const packagePath of nodePackages) {
			try {
				await this.loadClasses(PackageDirectoryLoader, packagePath);
			} catch (_) {}
		}
	}

	async loadNodesFromCustomFolders(): Promise<void> {
		// Read nodes and credentials from custom directories
		const customDirectories = [];

		// Add "custom" folder in user-n8n folder
		customDirectories.push(UserSettings.getUserN8nFolderCustomExtensionPath());

		// Add folders from special environment variable
		if (process.env[CUSTOM_EXTENSION_ENV] !== undefined) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV]!.split(';');
			customDirectories.push(...customExtensionFolders);
		}

		for (const directory of customDirectories) {
			await this.loadClasses(CustomDirectoryLoader, directory);
		}
	}

	private cache: Record<string, DirectoryLoader> = {};

	async loadClasses<T extends DirectoryLoader>(
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Ctor: new (directory: string, excludeNodes?: string, includeNodes?: string) => T,
		directory: string,
	) {
		if (!(directory in this.cache)) {
			const loader = new Ctor(directory, this.excludeNodes, this.includeNodes);
			await loader.init();

			for (const nodeName in loader.nodeTypes) {
				this.nodeTypes[nodeName] = loader.nodeTypes[nodeName];
			}

			for (const credentialName in loader.credentialTypes) {
				this.credentialTypes[credentialName] = loader.credentialTypes[credentialName];
			}

			this.cache[directory] = loader;
		}
		return this.cache[directory] as T;
	}

	/**
	 * Returns all the names of the packages which could
	 * contain n8n nodes
	 *
	 * @returns {Promise<string[]>}
	 * @memberof LoadNodesAndCredentialsClass
	 */
	async getN8nNodePackages(baseModulesPath: string): Promise<string[]> {
		const getN8nNodePackagesRecursive = async (relativePath: string): Promise<string[]> => {
			const results: string[] = [];
			const nodeModulesPath = `${baseModulesPath}/${relativePath}`;
			for (const file of await fsReaddir(nodeModulesPath)) {
				const isN8nNodesPackage = file.indexOf('n8n-nodes-') === 0;
				const isNpmScopedPackage = file.indexOf('@') === 0;
				if (!isN8nNodesPackage && !isNpmScopedPackage) {
					continue;
				}
				if (!(await fsStat(nodeModulesPath)).isDirectory()) {
					continue;
				}
				if (isN8nNodesPackage) {
					results.push(`${baseModulesPath}/${relativePath}${file}`);
				}
				if (isNpmScopedPackage) {
					results.push(...(await getN8nNodePackagesRecursive(`${relativePath}${file}/`)));
				}
			}
			return results;
		};
		return getN8nNodePackagesRecursive('');
	}

	async loadNpmModule(packageName: string, version?: string): Promise<InstalledPackages> {
		const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();
		const command = `npm install ${packageName}${version ? `@${version}` : ''}`;

		await executeCommand(command);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const { loadedNodes, packageJson } = await this.loadClasses(
			PackageDirectoryLoader,
			finalNodeUnpackedPath,
		);
		if (loadedNodes.length > 0) {
			// Save info to DB
			try {
				const installedPackage = await persistInstalledPackageData(
					packageJson.name,
					packageJson.version,
					loadedNodes,
					this.nodeTypes,
					packageJson.author?.name,
					packageJson.author?.email,
				);
				this.attachNodesToNodeTypes(installedPackage.installedNodes);
				return installedPackage;
			} catch (error) {
				LoggerProxy.error('Failed to save installed packages and nodes', {
					error: error as Error,
					packageName,
				});
				throw error;
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch (_) {}

			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	async removeNpmModule(packageName: string, installedPackage: InstalledPackages): Promise<void> {
		const command = `npm remove ${packageName}`;

		await executeCommand(command);

		void (await removePackageFromDatabase(installedPackage));

		this.unloadNodes(installedPackage.installedNodes);
	}

	async updateNpmModule(
		packageName: string,
		installedPackage: InstalledPackages,
	): Promise<InstalledPackages> {
		const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();

		const command = `npm i ${packageName}@latest`;

		try {
			await executeCommand(command);
		} catch (error) {
			if ((error as Error).message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		this.unloadNodes(installedPackage.installedNodes);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const { loadedNodes, packageJson } = await this.loadClasses(
			PackageDirectoryLoader,
			finalNodeUnpackedPath,
		);
		if (loadedNodes.length > 0) {
			// Save info to DB
			try {
				await removePackageFromDatabase(installedPackage);

				const newlyInstalledPackage = await persistInstalledPackageData(
					packageJson.name,
					packageJson.version,
					loadedNodes,
					this.nodeTypes,
					packageJson.author?.name,
					packageJson.author?.email,
				);

				this.attachNodesToNodeTypes(newlyInstalledPackage.installedNodes);

				return newlyInstalledPackage;
			} catch (error) {
				LoggerProxy.error('Failed to save installed packages and nodes', {
					error: error as Error,
					packageName,
				});
				throw error;
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch (_) {}
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	unloadNodes(installedNodes: InstalledNodes[]): void {
		const nodeTypes = NodeTypes();
		installedNodes.forEach((installedNode) => {
			nodeTypes.removeNodeType(installedNode.type);
			delete this.nodeTypes[installedNode.type];
		});
	}

	attachNodesToNodeTypes(installedNodes: InstalledNodes[]): void {
		const nodeTypes = NodeTypes();
		installedNodes.forEach((installedNode) => {
			nodeTypes.attachNodeType(
				installedNode.type,
				this.nodeTypes[installedNode.type].type,
				this.nodeTypes[installedNode.type].sourcePath,
			);
		});
	}
}

let packagesInformationInstance: LoadNodesAndCredentialsClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass {
	if (packagesInformationInstance === undefined) {
		packagesInformationInstance = new LoadNodesAndCredentialsClass();
	}

	return packagesInformationInstance;
}
