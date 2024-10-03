import glob from 'fast-glob';
import type {
	CodexData,
	DocumentationLink,
	ICredentialType,
	ICredentialTypeData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IVersionedNodeType,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import {
	ApplicationError,
	LoggerProxy as Logger,
	getCredentialsForNode,
	getVersionedNodeTypeAll,
	jsonParse,
} from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'path';

import { loadClassInIsolation } from './ClassLoader';
import { CUSTOM_NODES_CATEGORY } from './Constants';
import type { n8n } from './Interfaces';

function toJSON(this: ICredentialType) {
	return {
		...this,
		authenticate: typeof this.authenticate === 'function' ? {} : this.authenticate,
	};
}

export type Types = {
	nodes: INodeTypeBaseDescription[];
	credentials: ICredentialType[];
};

export abstract class DirectoryLoader {
	isLazyLoaded = false;

	// Another way of keeping track of the names and versions of a node. This
	// seems to only be used by the installedPackages repository
	loadedNodes: INodeTypeNameVersion[] = [];

	// Stores the loaded descriptions and sourcepaths
	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	// Stores the location and classnames of the nodes and credentials that are
	// loaded; used to actually load the files in lazy-loading scenario.
	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	// Stores the different versions with their individual descriptions
	types: Types = { nodes: [], credentials: [] };

	protected nodesByCredential: Record<string, string[]> = {};

	constructor(
		readonly directory: string,
		protected readonly excludeNodes: string[] = [],
		protected readonly includeNodes: string[] = [],
	) {}

	abstract packageName: string;

	abstract loadAll(): Promise<void>;

	reset() {
		this.loadedNodes = [];
		this.nodeTypes = {};
		this.credentialTypes = {};
		this.known = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };
	}

	protected resolvePath(file: string) {
		return path.resolve(this.directory, file);
	}

	protected loadNodeFromFile(nodeName: string, filePath: string) {
		let tempNode: INodeType | IVersionedNodeType;
		let nodeVersion = 1;
		const isCustom = this.packageName === 'CUSTOM';

		try {
			tempNode = loadClassInIsolation(filePath, nodeName);
			this.addCodex({ node: tempNode, filePath, isCustom });
		} catch (error) {
			Logger.error(
				`Error loading node "${nodeName}" from: "${filePath}" - ${(error as Error).message}`,
			);
			throw error;
		}

		const fullNodeName = `${this.packageName}.${tempNode.description.name}`;

		if (this.includeNodes.length && !this.includeNodes.includes(fullNodeName)) {
			return;
		}

		if (this.excludeNodes.includes(fullNodeName)) {
			return;
		}

		tempNode.description.name = fullNodeName;

		this.fixIconPaths(tempNode.description, filePath);

		if ('nodeVersions' in tempNode) {
			for (const versionNode of Object.values(tempNode.nodeVersions)) {
				this.fixIconPaths(versionNode.description, filePath);
			}

			for (const version of Object.values(tempNode.nodeVersions)) {
				this.addLoadOptionsMethods(version);
			}

			const currentVersionNode = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex({ node: currentVersionNode, filePath, isCustom });
			nodeVersion = tempNode.currentVersion;

			if (currentVersionNode.hasOwnProperty('executeSingle')) {
				throw new ApplicationError(
					'"executeSingle" has been removed. Please update the code of this node to use "execute" instead.',
					{ extra: { nodeName: `${this.packageName}.${nodeName}` } },
				);
			}
		} else {
			this.addLoadOptionsMethods(tempNode);
			// Short renaming to avoid type issues

			nodeVersion = Array.isArray(tempNode.description.version)
				? tempNode.description.version.slice(-1)[0]
				: tempNode.description.version;
		}

		this.known.nodes[fullNodeName] = {
			className: nodeName,
			sourcePath: filePath,
		};

		this.nodeTypes[fullNodeName] = {
			type: tempNode,
			sourcePath: filePath,
		};

		this.loadedNodes.push({
			name: fullNodeName,
			version: nodeVersion,
		});

		getVersionedNodeTypeAll(tempNode).forEach(({ description }) => {
			this.types.nodes.push(description);
		});

		for (const credential of getCredentialsForNode(tempNode)) {
			if (!this.nodesByCredential[credential.name]) {
				this.nodesByCredential[credential.name] = [];
			}
			this.nodesByCredential[credential.name].push(fullNodeName);
		}
	}

	protected loadCredentialFromFile(credentialClassName: string, filePath: string): void {
		let tempCredential: ICredentialType;
		try {
			tempCredential = loadClassInIsolation(filePath, credentialClassName);

			// Add serializer method "toJSON" to the class so that authenticate method (if defined)
			// gets mapped to the authenticate attribute before it is sent to the client.
			// The authenticate property is used by the client to decide whether or not to
			// include the credential type in the predefined credentials (HTTP node)
			Object.assign(tempCredential, { toJSON });

			this.fixIconPaths(tempCredential, filePath);
		} catch (e) {
			if (e instanceof TypeError) {
				throw new ApplicationError(
					'Class could not be found. Please check if the class is named correctly.',
					{ extra: { credentialClassName } },
				);
			} else {
				throw e;
			}
		}

		this.known.credentials[tempCredential.name] = {
			className: credentialClassName,
			sourcePath: filePath,
			extends: tempCredential.extends,
			supportedNodes: this.nodesByCredential[tempCredential.name],
		};

		this.credentialTypes[tempCredential.name] = {
			type: tempCredential,
			sourcePath: filePath,
		};

		this.types.credentials.push(tempCredential);
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 */
	private getCodex(filePath: string): CodexData {
		type Codex = {
			categories: string[];
			subcategories: { [subcategory: string]: string[] };
			resources: {
				primaryDocumentation: DocumentationLink[];
				credentialDocumentation: DocumentationLink[];
			};
			alias: string[];
		};

		const codexFilePath = `${filePath}on`; // .js to .json

		const {
			categories,
			subcategories,
			resources: allResources,
			alias,
		} = module.require(codexFilePath) as Codex;

		const resources = {
			primaryDocumentation: allResources.primaryDocumentation,
			credentialDocumentation: allResources.credentialDocumentation,
		};

		return {
			...(categories && { categories }),
			...(subcategories && { subcategories }),
			...(resources && { resources }),
			...(alias && { alias }),
		};
	}

	/**
	 * Adds a node codex `categories` and `subcategories` (if defined)
	 * to a node description `codex` property.
	 */
	private addCodex({
		node,
		filePath,
		isCustom,
	}: {
		node: INodeType | IVersionedNodeType;
		filePath: string;
		isCustom: boolean;
	}) {
		try {
			let codex;

			if (!isCustom) {
				codex = node.description.codex;
			}

			if (codex === undefined) {
				codex = this.getCodex(filePath);
			}

			if (isCustom) {
				codex.categories = codex.categories
					? codex.categories.concat(CUSTOM_NODES_CATEGORY)
					: [CUSTOM_NODES_CATEGORY];
			}

			node.description.codex = codex;
		} catch {
			Logger.debug(`No codex available for: ${filePath.split('/').pop() ?? ''}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}

	private addLoadOptionsMethods(node: INodeType) {
		if (node?.methods?.loadOptions) {
			node.description.__loadOptionsMethods = Object.keys(node.methods.loadOptions);
		}
	}

	private getIconPath(icon: string, filePath: string) {
		const iconPath = path.join(path.dirname(filePath), icon.replace('file:', ''));
		const relativePath = path.relative(this.directory, iconPath);
		return `icons/${this.packageName}/${relativePath}`;
	}

	private fixIconPaths(
		obj: INodeTypeDescription | INodeTypeBaseDescription | ICredentialType,
		filePath: string,
	) {
		const { icon } = obj;
		if (!icon) return;

		if (typeof icon === 'string') {
			if (icon.startsWith('file:')) {
				obj.iconUrl = this.getIconPath(icon, filePath);
				delete obj.icon;
			}
		} else if (icon.light.startsWith('file:') && icon.dark.startsWith('file:')) {
			obj.iconUrl = {
				light: this.getIconPath(icon.light, filePath),
				dark: this.getIconPath(icon.dark, filePath),
			};
			delete obj.icon;
		}
	}
}

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = 'CUSTOM';

	override async loadAll() {
		const nodes = await glob('**/*.node.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const nodePath of nodes) {
			const [fileName] = path.parse(nodePath).name.split('.');
			this.loadNodeFromFile(fileName, nodePath);
		}

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const credentialPath of credentials) {
			const [fileName] = path.parse(credentialPath).name.split('.');
			this.loadCredentialFromFile(fileName, credentialPath);
		}
	}
}

/**
 * Loader for source files of nodes and credentials located in a package dir,
 * e.g. /nodes-base or community packages.
 */
export class PackageDirectoryLoader extends DirectoryLoader {
	packageJson: n8n.PackageJson = this.readJSONSync('package.json');

	packageName = this.packageJson.name;

	override async loadAll() {
		const { n8n } = this.packageJson;
		if (!n8n) return;

		const { nodes, credentials } = n8n;

		if (Array.isArray(nodes)) {
			for (const node of nodes) {
				const filePath = this.resolvePath(node);
				const [nodeName] = path.parse(node).name.split('.');

				this.loadNodeFromFile(nodeName, filePath);
			}
		}

		if (Array.isArray(credentials)) {
			for (const credential of credentials) {
				const filePath = this.resolvePath(credential);
				const [credentialName] = path.parse(credential).name.split('.');

				this.loadCredentialFromFile(credentialName, filePath);
			}
		}

		Logger.debug(`Loaded all credentials and nodes from ${this.packageName}`, {
			credentials: credentials?.length ?? 0,
			nodes: nodes?.length ?? 0,
		});
	}

	protected readJSONSync<T>(file: string): T {
		const filePath = this.resolvePath(file);
		const fileString = readFileSync(filePath, 'utf8');

		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new ApplicationError('Failed to parse JSON', { extra: { filePath } });
		}
	}

	protected async readJSON<T>(file: string): Promise<T> {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');

		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new ApplicationError('Failed to parse JSON', { extra: { filePath } });
		}
	}
}

/**
 * This loader extends PackageDirectoryLoader to load node and credentials lazily, if possible
 */
export class LazyPackageDirectoryLoader extends PackageDirectoryLoader {
	override async loadAll() {
		try {
			const knownNodes: typeof this.known.nodes = await this.readJSON('dist/known/nodes.json');
			for (const nodeName in knownNodes) {
				this.known.nodes[`${this.packageName}.${nodeName}`] = knownNodes[nodeName];
			}
			this.known.credentials = await this.readJSON('dist/known/credentials.json');

			this.types.nodes = await this.readJSON('dist/types/nodes.json');
			this.types.credentials = await this.readJSON('dist/types/credentials.json');

			if (this.includeNodes.length) {
				const allowedNodes: typeof this.known.nodes = {};
				for (const nodeName of this.includeNodes) {
					if (nodeName in this.known.nodes) {
						allowedNodes[nodeName] = this.known.nodes[nodeName];
					}
				}
				this.known.nodes = allowedNodes;

				this.types.nodes = this.types.nodes.filter((nodeType) =>
					this.includeNodes.includes(nodeType.name),
				);
			}

			if (this.excludeNodes.length) {
				for (const nodeName of this.excludeNodes) {
					delete this.known.nodes[nodeName];
				}

				this.types.nodes = this.types.nodes.filter(
					(nodeType) => !this.excludeNodes.includes(nodeType.name),
				);
			}

			Logger.debug(`Lazy Loading credentials and nodes from ${this.packageJson.name}`, {
				credentials: this.types.credentials?.length ?? 0,
				nodes: this.types.nodes?.length ?? 0,
			});

			this.isLazyLoaded = true;

			return; // We can load nodes and credentials lazily now
		} catch {
			Logger.debug("Can't enable lazy-loading");
			await super.loadAll();
		}
	}
}
