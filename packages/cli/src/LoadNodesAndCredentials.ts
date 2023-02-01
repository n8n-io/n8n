import uniq from 'lodash.uniq';
import type { DirectoryLoader, Types } from 'n8n-core';
import {
	CUSTOM_EXTENSION_ENV,
	UserSettings,
	CustomDirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
} from 'n8n-core';
import type {
	ICredentialTypes,
	ILogger,
	INodesAndCredentials,
	KnownNodesAndCredentials,
	LoadedNodesAndCredentials,
} from 'n8n-workflow';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import { createWriteStream } from 'fs';
import {
	access as fsAccess,
	copyFile,
	mkdir,
	readdir as fsReaddir,
	stat as fsStat,
} from 'fs/promises';
import path from 'path';
import config from '@/config';
import type { InstalledPackages } from '@db/entities/InstalledPackages';
import type { InstalledNodes } from '@db/entities/InstalledNodes';
import { executeCommand } from '@/CommunityNodes/helpers';
import { CLI_DIR, GENERATED_STATIC_DIR, RESPONSE_ERROR_MESSAGES } from '@/constants';
import {
	persistInstalledPackageData,
	removePackageFromDatabase,
} from '@/CommunityNodes/packageModel';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';

export class LoadNodesAndCredentialsClass implements INodesAndCredentials {
	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	excludeNodes = config.getEnv('nodes.exclude');

	includeNodes = config.getEnv('nodes.include');

	credentialTypes: ICredentialTypes;

	logger: ILogger;

	async init() {
		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);

		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		module.constructor._initPaths();

		await mkdir(path.join(GENERATED_STATIC_DIR, 'icons/nodes'), { recursive: true });
		await mkdir(path.join(GENERATED_STATIC_DIR, 'icons/credentials'), { recursive: true });

		await this.loadNodesFromBasePackages();
		await this.loadNodesFromDownloadedPackages();
		await this.loadNodesFromCustomDirectories();
	}

	async generateTypesForFrontend() {
		const credentialsOverwrites = CredentialsOverwrites().getAll();
		for (const credential of this.types.credentials) {
			const overwrittenProperties = [];
			this.credentialTypes
				.getParentTypes(credential.name)
				.reverse()
				.map((name) => credentialsOverwrites[name])
				.forEach((overwrite) => {
					if (overwrite) overwrittenProperties.push(...Object.keys(overwrite));
				});

			if (credential.name in credentialsOverwrites) {
				overwrittenProperties.push(...Object.keys(credentialsOverwrites[credential.name]));
			}

			if (overwrittenProperties.length) {
				credential.__overwrittenProperties = uniq(overwrittenProperties);
			}
		}

		// pre-render all the node and credential types as static json files
		await mkdir(path.join(GENERATED_STATIC_DIR, 'types'), { recursive: true });

		const writeStaticJSON = async (name: string, data: object[]) => {
			const filePath = path.join(GENERATED_STATIC_DIR, `types/${name}.json`);
			const stream = createWriteStream(filePath, 'utf-8');
			stream.write('[\n');
			data.forEach((entry, index) => {
				stream.write(JSON.stringify(entry));
				if (index !== data.length - 1) stream.write(',');
				stream.write('\n');
			});
			stream.write(']\n');
			stream.end();
		};

		await writeStaticJSON('nodes', this.types.nodes);
		await writeStaticJSON('credentials', this.types.credentials);
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

	getCustomDirectories(): string[] {
		const customDirectories = [UserSettings.getUserN8nFolderCustomExtensionPath()];

		if (process.env[CUSTOM_EXTENSION_ENV] !== undefined) {
			const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV].split(';');
			customDirectories.push(...customExtensionFolders);
		}

		return customDirectories;
	}

	async loadNodesFromCustomDirectories(): Promise<void> {
		for (const directory of this.getCustomDirectories()) {
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
					this.loaded.nodes,
					packageJson.author?.name,
					packageJson.author?.email,
				);
				this.attachNodesToNodeTypes(installedPackage.installedNodes);
				await this.generateTypesForFrontend();
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

		await removePackageFromDatabase(installedPackage);

		await this.generateTypesForFrontend();

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
					this.loaded.nodes,
					packageJson.author?.name,
					packageJson.author?.email,
				);

				this.attachNodesToNodeTypes(newlyInstalledPackage.installedNodes);

				await this.generateTypesForFrontend();

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

	private unloadNodes(installedNodes: InstalledNodes[]): void {
		installedNodes.forEach((installedNode) => {
			delete this.loaded.nodes[installedNode.type];
		});
	}

	private attachNodesToNodeTypes(installedNodes: InstalledNodes[]): void {
		const loadedNodes = this.loaded.nodes;
		installedNodes.forEach((installedNode) => {
			const { type, sourcePath } = loadedNodes[installedNode.type];
			loadedNodes[installedNode.type] = { type, sourcePath };
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

		// list of node & credential types that will be sent to the frontend
		const { types } = loader;
		this.types.nodes = this.types.nodes.concat(types.nodes);
		this.types.credentials = this.types.credentials.concat(types.credentials);

		// Copy over all icons and set `iconUrl` for the frontend
		const iconPromises = Object.entries(types).flatMap(([typeName, typesArr]) =>
			typesArr.map((type) => {
				if (!type.icon?.startsWith('file:')) return;
				const icon = type.icon.substring(5);
				const iconUrl = `icons/${typeName}/${type.name}${path.extname(icon)}`;
				delete type.icon;
				type.iconUrl = iconUrl;
				const source = path.join(dir, icon);
				const destination = path.join(GENERATED_STATIC_DIR, iconUrl);
				return mkdir(path.dirname(destination), { recursive: true }).then(async () =>
					copyFile(source, destination),
				);
			}),
		);

		await Promise.all(iconPromises);

		// Nodes and credentials that have been loaded immediately
		for (const nodeTypeName in loader.nodeTypes) {
			this.loaded.nodes[nodeTypeName] = loader.nodeTypes[nodeTypeName];
		}

		for (const credentialTypeName in loader.credentialTypes) {
			this.loaded.credentials[credentialTypeName] = loader.credentialTypes[credentialTypeName];
		}

		// Nodes and credentials that will be lazy loaded
		if (loader instanceof PackageDirectoryLoader) {
			const { packageName, known } = loader;

			for (const type in known.nodes) {
				const { className, sourcePath } = known.nodes[type];
				this.known.nodes[type] = {
					className,
					sourcePath: path.join(dir, sourcePath),
				};
			}

			for (const type in known.credentials) {
				const { className, sourcePath, nodesToTestWith } = known.credentials[type];
				this.known.credentials[type] = {
					className,
					sourcePath: path.join(dir, sourcePath),
					nodesToTestWith: nodesToTestWith?.map((nodeName) => `${packageName}.${nodeName}`),
				};
			}
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
