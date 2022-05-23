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
import { Db } from '.';
import { InstalledPackages } from './databases/entities/InstalledPackages';
import { InstalledNodes } from './databases/entities/InstalledNodes';
import { executeCommand, parsePackageName } from './CommunityNodes/helpers';
import { RESPONSE_ERROR_MESSAGES } from './constants';

const CUSTOM_NODES_CATEGORY = 'Custom Nodes';

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
		process.env.NODE_PATH = module.paths.join(':');
		// @ts-ignore
		module.constructor._initPaths();

		// Get the path to the node-modules folder to be later able
		// to load the credentials and nodes
		const checkPaths = [
			// In case "n8n" package is in same node_modules folder.
			path.join(__dirname, '..', '..', '..', 'n8n-workflow'),
			// In case "n8n" package is the root and the packages are
			// in the "node_modules" folder underneath it.
			path.join(__dirname, '..', '..', 'node_modules', 'n8n-workflow'),
		];
		for (const checkPath of checkPaths) {
			try {
				await fsAccess(checkPath);
				// Folder exists, so use it.
				this.nodeModulesPath = path.dirname(checkPath);
				break;
			} catch (error) {
				// Folder does not exist so get next one
				// eslint-disable-next-line no-continue
				continue;
			}
		}

		if (this.nodeModulesPath === '') {
			throw new Error('Could not find "node_modules" folder!');
		}

		this.excludeNodes = config.getEnv('nodes.exclude');
		this.includeNodes = config.getEnv('nodes.include');

		// Get all the installed packages which contain n8n nodes
		const nodePackages = await this.getN8nNodePackages(this.nodeModulesPath);

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
			await this.loadDataFromPackage(packagePath);
		}

		// Read nodes and credentials from custom directories
		const customDirectories = [];

		// Add "custom" folder in user-n8n folder
		customDirectories.push(UserSettings.getUserN8nFolderCustomExtensionPath());

		// Add folders from special environment variable
		if (process.env[CUSTOM_EXTENSION_ENV] !== undefined) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV]!.split(';');
			// eslint-disable-next-line prefer-spread
			customDirectories.push.apply(customDirectories, customExtensionFolders);
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
	async loadCredentialsFromFile(credentialName: string, filePath: string): Promise<void> {
		// eslint-disable-next-line import/no-dynamic-require, global-require, @typescript-eslint/no-var-requires
		const tempModule = require(filePath);

		let tempCredential: ICredentialType;
		try {
			tempCredential = new tempModule[credentialName]() as ICredentialType;

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

	async loadNpmModule(packageName: string): Promise<INodeTypeNameVersion[]> {
		const parsedPackaeName = parsePackageName(packageName);
		const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();
		const command = `npm install ${packageName}`;

		try {
			await executeCommand(command);
		} catch (error) {
			if (error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		const finalNodeUnpackedPath = path.join(
			downloadFolder,
			'node_modules',
			parsedPackaeName.packageName,
		);

		const loadedNodes = await this.loadDataFromPackage(finalNodeUnpackedPath);

		if (loadedNodes.length > 0) {
			const packageFile = await this.readPackageJson(finalNodeUnpackedPath);

			// Save info to DB
			try {
				await Db.transaction(async (transactionManager) => {
					const promises = [];

					const installedPackage = Object.assign(new InstalledPackages(), {
						packageName: parsedPackaeName.packageName,
						installedVersion: packageFile.version,
					});
					await transactionManager.save<InstalledPackages>(installedPackage);

					promises.push(
						...loadedNodes.map(async (loadedNode) => {
							const installedNode = Object.assign(new InstalledNodes(), {
								name: loadedNode.name,
								type: loadedNode.name,
								latestVersion: loadedNode.version,
								package: parsedPackaeName.packageName,
							});
							return transactionManager.save<InstalledNodes>(installedNode);
						}),
					);

					return promises;
				});
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
		}

		return loadedNodes;
	}

	async removeNpmModule(packageName: string, installedNodes: InstalledNodes[]): Promise<void> {
		const command = `npm remove ${packageName}`;

		await executeCommand(command);

		installedNodes.forEach((installedNode) => {
			delete this.nodeTypes[installedNode.name];
		});
	}

	async updateNpmModule(
		packageName: string,
		installedNodes: InstalledNodes[],
	): Promise<INodeTypeNameVersion[]> {
		const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();

		const command = `npm update ${packageName}`;

		try {
			await executeCommand(command);
		} catch (error) {
			if (error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		installedNodes.forEach((installedNode) => {
			delete this.nodeTypes[installedNode.name];
		});

		const folderName = packageName.includes('@') ? packageName.split('@')[0] : packageName;

		const finalNodeUnpackedPath = path.join(downloadFolder, 'node_modules', folderName);

		const loadedNodes = await this.loadDataFromPackage(finalNodeUnpackedPath);

		if (loadedNodes.length > 0) {
			const packageFile = await this.readPackageJson(finalNodeUnpackedPath);

			// Save info to DB
			try {
				await Db.transaction(async (transactionManager) => {
					const promises = [];

					const previousVersionPackage = Object.assign(new InstalledPackages(), {
						packageName,
					});

					await transactionManager.remove(previousVersionPackage);

					const installedPackage = Object.assign(new InstalledPackages(), {
						packageName,
						installedVersion: packageFile.version,
					});
					await transactionManager.save<InstalledPackages>(installedPackage);

					promises.push(
						...loadedNodes.map(async (loadedNode) => {
							const installedNode = Object.assign(new InstalledNodes(), {
								name: loadedNode.name,
								type: loadedNode.name,
								latestVersion: loadedNode.version,
								package: packageName,
							});
							return transactionManager.save<InstalledNodes>(installedNode);
						}),
					);

					await Promise.all(promises);
				});
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
		}

		return loadedNodes;
	}

	/**
	 * Loads a node from a file
	 *
	 * @param {string} packageName The package name to set for the found nodes
	 * @param {string} nodeName Tha name of the node
	 * @param {string} filePath The file to read node from
	 * @returns {Promise<void>}
	 */
	async loadNodeFromFile(
		packageName: string,
		nodeName: string,
		filePath: string,
	): Promise<INodeTypeNameVersion | undefined> {
		let tempNode: INodeType | INodeVersionedType;
		let fullNodeName: string;
		let nodeVersion = 1;

		// eslint-disable-next-line import/no-dynamic-require, global-require, @typescript-eslint/no-var-requires
		const tempModule = require(filePath);

		try {
			tempNode = new tempModule[nodeName]();
			this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(`Error loading node "${nodeName}" from: "${filePath}"`);
			throw error;
		}

		// eslint-disable-next-line prefer-const
		fullNodeName = `${packageName}.${tempNode.description.name}`;
		tempNode.description.name = fullNodeName;

		if (tempNode.description.icon !== undefined && tempNode.description.icon.startsWith('file:')) {
			// If a file icon gets used add the full path
			tempNode.description.icon = `file:${path.join(
				path.dirname(filePath),
				tempNode.description.icon.substr(5),
			)}`;
		}

		if (tempNode.hasOwnProperty('executeSingle')) {
			this.logger.warn(
				`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`,
				{ filePath },
			);
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

		// Check if the node should be skiped
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
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			this.logger.debug(`No codex available for: ${filePath.split('/').pop()}`);

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
		const files = await glob(path.join(directory, '**/*.@(node|credentials).js'));

		let fileName: string;
		let type: string;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const loadPromises: any[] = [];
		for (const filePath of files) {
			[fileName, type] = path.parse(filePath).name.split('.');

			if (type === 'node') {
				loadPromises.push(this.loadNodeFromFile(setPackageName, fileName, filePath));
			} else if (type === 'credentials') {
				loadPromises.push(this.loadCredentialsFromFile(fileName, filePath));
			}
		}

		await Promise.all(loadPromises);
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
		// if (!packageFile.hasOwnProperty('n8n')) {
		if (!packageFile.n8n) {
			return [];
		}

		const packageName = packageFile.name;

		let tempPath: string;
		let filePath: string;

		const returnData: INodeTypeNameVersion[] = [];

		// Read all node types
		let fileName: string;
		let type: string;
		if (packageFile.n8n.hasOwnProperty('nodes') && Array.isArray(packageFile.n8n.nodes)) {
			for (filePath of packageFile.n8n.nodes) {
				tempPath = path.join(packagePath, filePath);
				[fileName, type] = path.parse(filePath).name.split('.');
				const loadData = await this.loadNodeFromFile(packageName, fileName, tempPath);
				if (loadData) {
					returnData.push(loadData);
				}
			}
		}

		// Read all credential types
		if (
			packageFile.n8n.hasOwnProperty('credentials') &&
			Array.isArray(packageFile.n8n.credentials)
		) {
			for (filePath of packageFile.n8n.credentials) {
				tempPath = path.join(packagePath, filePath);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				[fileName, type] = path.parse(filePath).name.split('.');
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				this.loadCredentialsFromFile(fileName, tempPath);
			}
		}

		return returnData;
	}
}

let packagesInformationInstance: LoadNodesAndCredentialsClass | undefined;

export function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass {
	if (packagesInformationInstance === undefined) {
		packagesInformationInstance = new LoadNodesAndCredentialsClass();
	}

	return packagesInformationInstance;
}
