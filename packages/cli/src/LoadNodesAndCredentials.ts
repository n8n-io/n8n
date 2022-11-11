/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import {
	CUSTOM_EXTENSION_ENV,
	UserSettings,
	Known,
	CustomDirectoryLoader,
	DirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
	Types,
} from 'n8n-core';
import {
	ICredentialTypeData,
	ILogger,
	INodeTypeData,
	LoggerProxy,
	ErrorReporterProxy as ErrorReporter,
} from 'n8n-workflow';

import { access as fsAccess, cp, readdir as fsReaddir, stat as fsStat } from 'fs/promises';
import path from 'path';
import config from '@/config';
import { NodeTypes } from '@/NodeTypes';
import { InstalledPackages } from '@db/entities/InstalledPackages';
import { InstalledNodes } from '@db/entities/InstalledNodes';
import { executeCommand } from '@/CommunityNodes/helpers';
import { CLI_DIR, GENERATED_STATIC_DIR, RESPONSE_ERROR_MESSAGES } from '@/constants';
import {
	persistInstalledPackageData,
	removePackageFromDatabase,
} from '@/CommunityNodes/packageModel';

class LoadNodesAndCredentialsClass {
	known: Known = { nodes: {}, credentials: {} };

	types: Types = { allNodes: [], latestNodes: [], credentials: [] };

	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	excludeNodes = config.getEnv('nodes.exclude');

	includeNodes = config.getEnv('nodes.include');

	logger: ILogger;

	async init() {
		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);

		// @ts-ignore
		module.constructor._initPaths();

		await this.loadNodesFromBasePackages();
		await this.loadNodesFromDownloadedPackages();
		await this.loadNodesFromCustomDirectories();
	}

	async loadNodesFromBasePackages() {
		const nodeModulesPath = await this.getNodeModulesPath();
		const nodePackagePaths = await this.getN8nNodePackages(nodeModulesPath);

		for (const packagePath of nodePackagePaths) {
			await this.runDirectoryLoader(LazyPackageDirectoryLoader, packagePath);
		}
	}

	async loadNodesFromDownloadedPackages(): Promise<void> {
		const nodePackages = [];
		try {
			// Read downloaded nodes and credentials
			const downloadedNodesDir = UserSettings.getUserN8nFolderDownloadedNodesPath();
			const downloadedNodesDirModules = path.join(downloadedNodesDir, 'node_modules');
			await fsAccess(downloadedNodesDirModules);
			const downloadedPackages = await this.getN8nNodePackages(downloadedNodesDirModules);
			nodePackages.push(...downloadedPackages);
		} catch (error) {
			// Folder does not exist so ignore and return
			return;
		}

		for (const packagePath of nodePackages) {
			try {
				await this.runDirectoryLoader(PackageDirectoryLoader, packagePath);
			} catch (error) {
				ErrorReporter.error(error);
			}
		}
	}

	async loadNodesFromCustomDirectories(): Promise<void> {
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
			await this.runDirectoryLoader(CustomDirectoryLoader, directory);
		}
	}

	/**
	 * Returns all the names of the packages which could
	 * contain n8n nodes
	 *
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
		const downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();
		const command = `npm install ${packageName}${version ? `@${version}` : ''}`;

		await executeCommand(command);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const { loadedNodes, packageJson } = await this.runDirectoryLoader(
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
		const downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();

		const command = `npm i ${packageName}@latest`;

		try {
			await executeCommand(command);
		} catch (error) {
			if (error instanceof Error && error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		this.unloadNodes(installedPackage.installedNodes);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const { loadedNodes, packageJson } = await this.runDirectoryLoader(
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

	/**
	 * Run a loader of source files of nodes and credentials in a directory.
	 */
	private async runDirectoryLoader<T extends DirectoryLoader>(
		constructor: new (...args: ConstructorParameters<typeof DirectoryLoader>) => T,
		dir: string,
	) {
		const loader = new constructor(dir, this.excludeNodes, this.includeNodes);
		await loader.loadAll();

		for (const nodeTypeName in loader.nodeTypes) {
			this.nodeTypes[nodeTypeName] = loader.nodeTypes[nodeTypeName];
		}

		for (const credentialTypeName in loader.credentialTypes) {
			this.credentialTypes[credentialTypeName] = loader.credentialTypes[credentialTypeName];
		}

		if (loader instanceof PackageDirectoryLoader) {
			const { packageName, known, types } = loader;

			for (const node in known.nodes) {
				this.known.nodes[`${packageName}.${node}`] = path.join(dir, known.nodes[node]);
			}

			for (const credential in known.credentials) {
				this.known.credentials[credential] = path.join(dir, known.credentials[credential]);
			}

			this.types.allNodes = this.types.allNodes.concat(types.allNodes);
			this.types.latestNodes = this.types.latestNodes.concat(types.latestNodes);
			this.types.credentials = this.types.credentials.concat(types.credentials);

			await cp(path.resolve(dir, 'dist/icons'), path.join(GENERATED_STATIC_DIR, 'icons'), {
				recursive: true,
			});
		}

		return loader;
	}

	private async getNodeModulesPath(): Promise<string> {
		// Get the path to the node-modules folder to be later able
		// to load the credentials and nodes
		const checkPaths = [
			// In case "n8n" package is in same node_modules folder.
			path.join(CLI_DIR, '..', 'n8n-workflow'),
			// In case "n8n" package is the root and the packages are
			// in the "node_modules" folder underneath it.
			path.join(CLI_DIR, 'node_modules', 'n8n-workflow'),
			// In case "n8n" package is installed using npm/yarn workspaces
			// the node_modules folder is in the root of the workspace.
			path.join(CLI_DIR, '..', '..', 'node_modules', 'n8n-workflow'),
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
}

let packagesInformationInstance: LoadNodesAndCredentialsClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass {
	if (packagesInformationInstance === undefined) {
		packagesInformationInstance = new LoadNodesAndCredentialsClass();
	}

	return packagesInformationInstance;
}
