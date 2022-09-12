/* eslint-disable import/no-cycle */
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
import { CUSTOM_EXTENSION_ENV, UserSettings } from 'n8n-core';
import {
	CodexData,
	ICredentialType,
	ICredentialTypeData,
	ILogger,
	INodeType,
	INodeTypeData,
	INodeTypeNameVersion,
	INodeVersionedType,
	LoggerProxy,
} from 'n8n-workflow';

import {
	access as fsAccess,
	readdir as fsReaddir,
	readFile as fsReadFile,
	stat as fsStat,
} from 'fs/promises';
import glob from 'fast-glob';
import path from 'path';
import { IN8nNodePackageJson } from './Interfaces';
import { getLogger } from './Logger';
import config from '../config';
import { NodeTypes } from '.';
import { InstalledPackages } from './databases/entities/InstalledPackages';
import { InstalledNodes } from './databases/entities/InstalledNodes';
import { executeCommand, loadClassInIsolation } from './CommunityNodes/helpers';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import {
	persistInstalledPackageData,
	removePackageFromDatabase,
} from './CommunityNodes/packageModel';

const CUSTOM_NODES_CATEGORY = 'Custom Nodes';

function toJSON() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return {
		...this,
		authenticate: typeof this.authenticate === 'function' ? {} : this.authenticate,
	};
}

class LoadNodesAndCredentialsClass {
	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	excludeNodes: string | undefined = undefined;

	includeNodes: string | undefined = undefined;

	nodeModulesPath = '';

	logger: ILogger;

	async init() {
		this.logger = getLogger();
		LoggerProxy.init(this.logger);

		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);
		// @ts-ignore
		module.constructor._initPaths();

		this.nodeModulesPath = await this.getNodeModulesFolderLocation();

		this.excludeNodes = config.getEnv('nodes.exclude');
		this.includeNodes = config.getEnv('nodes.include');

		// Get all the installed packages which contain n8n nodes
		const nodePackages = await this.getN8nNodePackages(this.nodeModulesPath);

		for (const packagePath of nodePackages) {
			await this.loadDataFromPackage(packagePath);
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
			} catch (_) {
				// Folder does not exist so get next one
			}
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
			// eslint-disable-next-line no-empty
		} catch (error) {}

		for (const packagePath of nodePackages) {
			try {
				await this.loadDataFromPackage(packagePath);
				// eslint-disable-next-line no-empty
			} catch (error) {}
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
			await this.loadDataFromDirectory('CUSTOM', directory);
		}
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

	/**
	 * Loads credentials from a file
	 *
	 * @param {string} credentialName The name of the credentials
	 * @param {string} filePath The file to read credentials from
	 * @returns {Promise<void>}
	 */
	loadCredentialsFromFile(credentialName: string, filePath: string): void {
		let tempCredential: ICredentialType;
		try {
			tempCredential = loadClassInIsolation(filePath, credentialName);

			// Add serializer method "toJSON" to the class so that authenticate method (if defined)
			// gets mapped to the authenticate attribute before it is sent to the client.
			// The authenticate property is used by the client to decide whether or not to
			// include the credential type in the predefined credentials (HTTP node)
			Object.assign(tempCredential, { toJSON });

			if (tempCredential.icon && tempCredential.icon.startsWith('file:')) {
				// If a file icon gets used add the full path
				tempCredential.icon = `file:${path.join(
					path.dirname(filePath),
					tempCredential.icon.substr(5),
				)}`;
			}
		} catch (e) {
			if (e instanceof TypeError) {
				throw new Error(
					`Class with name "${credentialName}" could not be found. Please check if the class is named correctly!`,
				);
			} else {
				throw e;
			}
		}

		this.credentialTypes[tempCredential.name] = {
			type: tempCredential,
			sourcePath: filePath,
		};
	}

	async loadNpmModule(packageName: string, version?: string): Promise<InstalledPackages> {
		const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();
		const command = `npm install ${packageName}${version ? `@${version}` : ''}`;

		await executeCommand(command);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const loadedNodes = await this.loadDataFromPackage(finalNodeUnpackedPath);

		if (loadedNodes.length > 0) {
			const packageFile = await this.readPackageJson(finalNodeUnpackedPath);
			// Save info to DB
			try {
				const installedPackage = await persistInstalledPackageData(
					packageFile.name,
					packageFile.version,
					loadedNodes,
					this.nodeTypes,
					packageFile.author?.name,
					packageFile.author?.email,
				);
				this.attachNodesToNodeTypes(installedPackage.installedNodes);
				return installedPackage;
			} catch (error) {
				LoggerProxy.error('Failed to save installed packages and nodes', { error, packageName });
				throw error;
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch (error) {
				// Do nothing
			}

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
			if (error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		this.unloadNodes(installedPackage.installedNodes);

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', packageName);

		const loadedNodes = await this.loadDataFromPackage(finalNodeUnpackedPath);

		if (loadedNodes.length > 0) {
			const packageFile = await this.readPackageJson(finalNodeUnpackedPath);

			// Save info to DB
			try {
				await removePackageFromDatabase(installedPackage);

				const newlyInstalledPackage = await persistInstalledPackageData(
					packageFile.name,
					packageFile.version,
					loadedNodes,
					this.nodeTypes,
					packageFile.author?.name,
					packageFile.author?.email,
				);

				this.attachNodesToNodeTypes(newlyInstalledPackage.installedNodes);

				return newlyInstalledPackage;
			} catch (error) {
				LoggerProxy.error('Failed to save installed packages and nodes', { error, packageName });
				throw error;
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch (error) {
				// Do nothing
			}
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	/**
	 * Loads a node from a file
	 *
	 * @param {string} packageName The package name to set for the found nodes
	 * @param {string} nodeName Tha name of the node
	 * @param {string} filePath The file to read node from
	 * @returns {Promise<void>}
	 */
	loadNodeFromFile(
		packageName: string,
		nodeName: string,
		filePath: string,
	): INodeTypeNameVersion | undefined {
		let tempNode: INodeType | INodeVersionedType;
		let nodeVersion = 1;

		try {
			tempNode = loadClassInIsolation(filePath, nodeName);
			this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
		} catch (error) {
			// eslint-disable-next-line no-console, @typescript-eslint/restrict-template-expressions
			console.error(`Error loading node "${nodeName}" from: "${filePath}" - ${error.message}`);
			throw error;
		}

		const fullNodeName = `${packageName}.${tempNode.description.name}`;
		tempNode.description.name = fullNodeName;

		if (tempNode.description.icon !== undefined && tempNode.description.icon.startsWith('file:')) {
			// If a file icon gets used add the full path
			tempNode.description.icon = `file:${path.join(
				path.dirname(filePath),
				tempNode.description.icon.substr(5),
			)}`;
		}

		if (tempNode.hasOwnProperty('nodeVersions')) {
			const versionedNodeType = (tempNode as INodeVersionedType).getNodeType();
			this.addCodex({ node: versionedNodeType, filePath, isCustom: packageName === 'CUSTOM' });
			nodeVersion = (tempNode as INodeVersionedType).currentVersion;

			if (
				versionedNodeType.description.icon !== undefined &&
				versionedNodeType.description.icon.startsWith('file:')
			) {
				// If a file icon gets used add the full path
				versionedNodeType.description.icon = `file:${path.join(
					path.dirname(filePath),
					versionedNodeType.description.icon.substr(5),
				)}`;
			}

			if (versionedNodeType.hasOwnProperty('executeSingle')) {
				this.logger.warn(
					`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`,
					{ filePath },
				);
			}
		} else {
			// Short renaming to avoid type issues
			const tmpNode = tempNode as INodeType;
			nodeVersion = Array.isArray(tmpNode.description.version)
				? tmpNode.description.version.slice(-1)[0]
				: tmpNode.description.version;
		}

		if (this.includeNodes !== undefined && !this.includeNodes.includes(fullNodeName)) {
			return;
		}

		// Check if the node should be skipped
		if (this.excludeNodes !== undefined && this.excludeNodes.includes(fullNodeName)) {
			return;
		}

		this.nodeTypes[fullNodeName] = {
			type: tempNode,
			sourcePath: filePath,
		};

		// eslint-disable-next-line consistent-return
		return {
			name: fullNodeName,
			version: nodeVersion,
		} as INodeTypeNameVersion;
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 *
	 * @param {string} filePath The file path to a `*.node.js` file
	 * @returns {CodexData}
	 */
	getCodex(filePath: string): CodexData {
		// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
		const { categories, subcategories, alias } = require(`${filePath}on`); // .js to .json
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return {
			...(categories && { categories }),
			...(subcategories && { subcategories }),
			...(alias && { alias }),
		};
	}

	/**
	 * Adds a node codex `categories` and `subcategories` (if defined)
	 * to a node description `codex` property.
	 *
	 * @param {object} obj
	 * @param obj.node Node to add categories to
	 * @param obj.filePath Path to the built node
	 * @param obj.isCustom Whether the node is custom
	 * @returns {void}
	 */
	addCodex({
		node,
		filePath,
		isCustom,
	}: {
		node: INodeType | INodeVersionedType;
		filePath: string;
		isCustom: boolean;
	}) {
		try {
			const codex = this.getCodex(filePath);

			if (isCustom) {
				codex.categories = codex.categories
					? codex.categories.concat(CUSTOM_NODES_CATEGORY)
					: [CUSTOM_NODES_CATEGORY];
			}

			node.description.codex = codex;
		} catch (_) {
			this.logger.debug(`No codex available for: ${filePath.split('/').pop() ?? ''}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}

	/**
	 * Loads nodes and credentials from the given directory
	 *
	 * @param {string} setPackageName The package name to set for the found nodes
	 * @param {string} directory The directory to look in
	 * @returns {Promise<void>}
	 */
	async loadDataFromDirectory(setPackageName: string, directory: string): Promise<void> {
		const files = await glob('**/*.@(node|credentials).js', {
			cwd: directory,
		});

		for (const filePath of files) {
			const [fileName, type] = path.parse(filePath).name.split('.');

			if (type === 'node') {
				this.loadNodeFromFile(setPackageName, fileName, filePath);
			} else if (type === 'credentials') {
				this.loadCredentialsFromFile(fileName, filePath);
			}
		}
	}

	async readPackageJson(packagePath: string): Promise<IN8nNodePackageJson> {
		// Get the absolute path of the package
		const packageFileString = await fsReadFile(path.join(packagePath, 'package.json'), 'utf8');
		return JSON.parse(packageFileString) as IN8nNodePackageJson;
	}

	/**
	 * Loads nodes and credentials from the package with the given name
	 *
	 * @param {string} packagePath The path to read data from
	 * @returns {Promise<void>}
	 */
	async loadDataFromPackage(packagePath: string): Promise<INodeTypeNameVersion[]> {
		// Get the absolute path of the package
		const packageFile = await this.readPackageJson(packagePath);
		if (!packageFile.n8n) {
			return [];
		}

		const packageName = packageFile.name;
		const { nodes, credentials } = packageFile.n8n;
		const returnData: INodeTypeNameVersion[] = [];

		// Read all node types
		if (Array.isArray(nodes)) {
			for (const filePath of nodes) {
				const tempPath = path.join(packagePath, filePath);
				const [fileName] = path.parse(filePath).name.split('.');
				const loadData = this.loadNodeFromFile(packageName, fileName, tempPath);
				if (loadData) {
					returnData.push(loadData);
				}
			}
		}

		// Read all credential types
		if (Array.isArray(credentials)) {
			for (const filePath of credentials) {
				const tempPath = path.join(packagePath, filePath);
				const [fileName] = path.parse(filePath).name.split('.');
				this.loadCredentialsFromFile(fileName, tempPath);
			}
		}

		return returnData;
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

export function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass {
	if (packagesInformationInstance === undefined) {
		packagesInformationInstance = new LoadNodesAndCredentialsClass();
	}

	return packagesInformationInstance;
}
