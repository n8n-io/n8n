import glob from 'fast-glob';
import uniqBy from 'lodash/uniqBy';
import type {
	CodexData,
	DocumentationLink,
	ICredentialType,
	ICredentialTypeData,
	INodeCredentialDescription,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IVersionedNodeType,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { ApplicationError, LoggerProxy as Logger, jsonParse } from 'n8n-workflow';
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

type Codex = {
	categories: string[];
	subcategories: { [subcategory: string]: string[] };
	resources: {
		primaryDocumentation: DocumentationLink[];
		credentialDocumentation: DocumentationLink[];
	};
	alias: string[];
};

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

	readonly nodesByCredential: Record<string, string[]> = {};

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

	private loadClass<T>(sourcePath: string) {
		const filePath = this.resolvePath(sourcePath);
		const [className] = path.parse(sourcePath).name.split('.');
		try {
			return loadClassInIsolation<T>(filePath, className);
		} catch (error) {
			throw error instanceof TypeError
				? new ApplicationError(
						'Class could not be found. Please check if the class is named correctly.',
						{ extra: { className } },
					)
				: error;
		}
	}

	protected loadNodeFromFile(filePath: string) {
		const tempNode = this.loadClass<INodeType | IVersionedNodeType>(filePath);
		this.addCodex(tempNode, filePath);

		const nodeType = tempNode.description.name;
		const fullNodeType = `${this.packageName}.${nodeType}`;

		if (this.includeNodes.length && !this.includeNodes.includes(fullNodeType)) {
			return;
		}

		if (this.excludeNodes.includes(fullNodeType)) {
			return;
		}

		this.fixIconPaths(tempNode.description, filePath);

		let nodeVersion = 1;
		if ('nodeVersions' in tempNode) {
			for (const versionNode of Object.values(tempNode.nodeVersions)) {
				this.fixIconPaths(versionNode.description, filePath);
			}

			for (const version of Object.values(tempNode.nodeVersions)) {
				this.addLoadOptionsMethods(version);
			}

			const currentVersionNode = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex(currentVersionNode, filePath);
			nodeVersion = tempNode.currentVersion;

			if (currentVersionNode.hasOwnProperty('executeSingle')) {
				throw new ApplicationError(
					'"executeSingle" has been removed. Please update the code of this node to use "execute" instead.',
					{ extra: { nodeName: `${this.packageName}.${nodeType}` } },
				);
			}
		} else {
			this.addLoadOptionsMethods(tempNode);
			// Short renaming to avoid type issues

			nodeVersion = Array.isArray(tempNode.description.version)
				? tempNode.description.version.slice(-1)[0]
				: tempNode.description.version;
		}

		this.known.nodes[nodeType] = {
			className: tempNode.constructor.name,
			sourcePath: filePath,
		};

		this.nodeTypes[nodeType] = {
			type: tempNode,
			sourcePath: filePath,
		};

		this.loadedNodes.push({
			name: nodeType,
			version: nodeVersion,
		});

		this.getVersionedNodeTypeAll(tempNode).forEach(({ description }) => {
			this.types.nodes.push(description);
		});

		for (const credential of this.getCredentialsForNode(tempNode)) {
			if (!this.nodesByCredential[credential.name]) {
				this.nodesByCredential[credential.name] = [];
			}
			this.nodesByCredential[credential.name].push(nodeType);
		}
	}

	protected loadCredentialFromFile(filePath: string): void {
		const tempCredential = this.loadClass<ICredentialType>(filePath);
		// Add serializer method "toJSON" to the class so that authenticate method (if defined)
		// gets mapped to the authenticate attribute before it is sent to the client.
		// The authenticate property is used by the client to decide whether or not to
		// include the credential type in the predefined credentials (HTTP node)
		Object.assign(tempCredential, { toJSON });

		this.fixIconPaths(tempCredential, filePath);

		const credentialType = tempCredential.name;
		this.known.credentials[credentialType] = {
			className: tempCredential.constructor.name,
			sourcePath: filePath,
			extends: tempCredential.extends,
			supportedNodes: this.nodesByCredential[credentialType],
		};

		this.credentialTypes[credentialType] = {
			type: tempCredential,
			sourcePath: filePath,
		};

		this.types.credentials.push(tempCredential);
	}

	private getCredentialsForNode(
		object: IVersionedNodeType | INodeType,
	): INodeCredentialDescription[] {
		if ('nodeVersions' in object) {
			return uniqBy(
				Object.values(object.nodeVersions).flatMap(
					(version) => version.description.credentials ?? [],
				),
				'name',
			);
		}

		return object.description.credentials ?? [];
	}

	getVersionedNodeTypeAll(object: IVersionedNodeType | INodeType): INodeType[] {
		if ('nodeVersions' in object) {
			return uniqBy(
				Object.values(object.nodeVersions)
					.map((element) => {
						element.description.name = object.description.name;
						element.description.codex = object.description.codex;
						return element;
					})
					.reverse(),
				(node) => {
					const { version } = node.description;
					return Array.isArray(version) ? version.join(',') : version.toString();
				},
			);
		}
		return [object];
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 */
	private getCodex(filePath: string): CodexData {
		const codexFilePath = this.resolvePath(`${filePath}on`); // .js to .json

		const {
			categories,
			subcategories,
			resources: { primaryDocumentation, credentialDocumentation },
			alias,
		} = module.require(codexFilePath) as Codex;

		return {
			...(categories && { categories }),
			...(subcategories && { subcategories }),
			...(alias && { alias }),
			resources: {
				primaryDocumentation,
				credentialDocumentation,
			},
		};
	}

	/**
	 * Adds a node codex `categories` and `subcategories` (if defined)
	 * to a node description `codex` property.
	 */
	private addCodex(node: INodeType | IVersionedNodeType, filePath: string) {
		const isCustom = this.packageName === 'CUSTOM';
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
			Logger.debug(`No codex available for: ${node.description.name}`);

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
		return `icons/${this.packageName}/${iconPath}`;
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
			this.loadNodeFromFile(nodePath);
		}

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const credentialPath of credentials) {
			this.loadCredentialFromFile(credentialPath);
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
			for (const nodePath of nodes) {
				this.loadNodeFromFile(nodePath);
			}
		}

		if (Array.isArray(credentials)) {
			for (const credentialPath of credentials) {
				this.loadCredentialFromFile(credentialPath);
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
			this.known.nodes = await this.readJSON('dist/known/nodes.json');
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

			Logger.debug(`Lazy-loading nodes and credentials from ${this.packageJson.name}`, {
				nodes: this.types.nodes?.length ?? 0,
				credentials: this.types.credentials?.length ?? 0,
			});

			this.isLazyLoaded = true;

			return; // We can load nodes and credentials lazily now
		} catch {
			Logger.debug("Can't enable lazy-loading");
			await super.loadAll();
		}
	}
}
