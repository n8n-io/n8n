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
	INodeVersionedType,
	LoggerProxy,
} from 'n8n-workflow';

import {
	access as fsAccess,
	readdir as fsReaddir,
	readFile as fsReadFile,
	stat as fsStat,
} from 'fs/promises';
import * as glob from 'fast-glob';
import * as path from 'path';
import { getLogger } from './Logger';
import * as config from '../config';

const CUSTOM_NODES_CATEGORY = 'Custom Nodes';

class LoadNodesAndCredentialsClass {
	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	excludeNodes: string[] | undefined = undefined;

	includeNodes: string[] | undefined = undefined;

	nodeModulesPath = '';

	logger: ILogger;

	async init() {
		this.logger = getLogger();
		LoggerProxy.init(this.logger);

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

		this.excludeNodes = config.get('nodes.exclude');
		this.includeNodes = config.get('nodes.include');

		// Get all the installed packages which contain n8n nodes
		const packages = await this.getN8nNodePackages();

		for (const packageName of packages) {
			await this.loadDataFromPackage(packageName);
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
	async getN8nNodePackages(): Promise<string[]> {
		const getN8nNodePackagesRecursive = async (relativePath: string): Promise<string[]> => {
			const results: string[] = [];
			const nodeModulesPath = `${this.nodeModulesPath}/${relativePath}`;
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
					results.push(`${relativePath}${file}`);
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

	/**
	 * Loads a node from a file
	 *
	 * @param {string} packageName The package name to set for the found nodes
	 * @param {string} nodeName Tha name of the node
	 * @param {string} filePath The file to read node from
	 * @returns {Promise<void>}
	 */
	async loadNodeFromFile(packageName: string, nodeName: string, filePath: string): Promise<void> {
		let tempNode: INodeType | INodeVersionedType;
		let fullNodeName: string;

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

		const loadPromises = [];
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

	/**
	 * Loads nodes and credentials from the package with the given name
	 *
	 * @param {string} packageName The name to read data from
	 * @returns {Promise<void>}
	 */
	async loadDataFromPackage(packageName: string): Promise<void> {
		// Get the absolute path of the package
		const packagePath = path.join(this.nodeModulesPath, packageName);

		// Read the data from the package.json file to see if any n8n data is defiend
		const packageFileString = await fsReadFile(path.join(packagePath, 'package.json'), 'utf8');
		const packageFile = JSON.parse(packageFileString);
		if (!packageFile.hasOwnProperty('n8n')) {
			return;
		}

		let tempPath: string;
		let filePath: string;

		// Read all node types
		let fileName: string;
		let type: string;
		if (packageFile.n8n.hasOwnProperty('nodes') && Array.isArray(packageFile.n8n.nodes)) {
			for (filePath of packageFile.n8n.nodes) {
				tempPath = path.join(packagePath, filePath);
				[fileName, type] = path.parse(filePath).name.split('.');
				await this.loadNodeFromFile(packageName, fileName, tempPath);
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
	}
}

let packagesInformationInstance: LoadNodesAndCredentialsClass | undefined;

export function LoadNodesAndCredentials(): LoadNodesAndCredentialsClass {
	if (packagesInformationInstance === undefined) {
		packagesInformationInstance = new LoadNodesAndCredentialsClass();
	}

	return packagesInformationInstance;
}
