import * as path from 'path';
import { readFile } from 'fs/promises';
import glob from 'fast-glob';
import { jsonParse, LoggerProxy as Logger } from 'n8n-workflow';
import type {
	CodexData,
	DocumentationLink,
	ICredentialType,
	ICredentialTypeData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	INodeTypeData,
	INodeTypeNameVersion,
	IVersionedNodeType,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { CUSTOM_NODES_CATEGORY } from './Constants';
import type { n8n } from './Interfaces';
import { loadClassInIsolation } from './ClassLoader';

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
	readonly loadedNodes: INodeTypeNameVersion[] = [];

	readonly nodeTypes: INodeTypeData = {};

	readonly credentialTypes: ICredentialTypeData = {};

	readonly known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	readonly types: Types = { nodes: [], credentials: [] };

	constructor(
		protected readonly directory: string,
		protected readonly excludeNodes: string[] = [],
		protected readonly includeNodes: string[] = [],
	) {}

	abstract loadAll(): Promise<void>;

	protected resolvePath(file: string) {
		return path.resolve(this.directory, file);
	}

	protected loadNodeFromFile(packageName: string, nodeName: string, filePath: string) {
		let tempNode: INodeType | IVersionedNodeType;
		let nodeVersion = 1;

		try {
			tempNode = loadClassInIsolation(filePath, nodeName);
			this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
		} catch (error) {
			Logger.error(
				`Error loading node "${nodeName}" from: "${filePath}" - ${(error as Error).message}`,
			);
			throw error;
		}

		const fullNodeName = `${packageName}.${tempNode.description.name}`;

		if (this.includeNodes.length && !this.includeNodes.includes(fullNodeName)) {
			return;
		}

		if (this.excludeNodes.includes(fullNodeName)) {
			return;
		}

		tempNode.description.name = fullNodeName;

		this.fixIconPath(tempNode.description, filePath);

		if ('nodeVersions' in tempNode) {
			for (const versionNode of Object.values(tempNode.nodeVersions)) {
				this.fixIconPath(versionNode.description, filePath);
			}

			const currentVersionNode = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex({ node: currentVersionNode, filePath, isCustom: packageName === 'CUSTOM' });
			nodeVersion = tempNode.currentVersion;

			if (currentVersionNode.hasOwnProperty('executeSingle')) {
				Logger.warn(
					`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`,
					{ filePath },
				);
			}
		} else {
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

		this.types.nodes.push(tempNode.description);
	}

	protected loadCredentialFromFile(credentialName: string, filePath: string): void {
		let tempCredential: ICredentialType;
		try {
			tempCredential = loadClassInIsolation(filePath, credentialName);

			// Add serializer method "toJSON" to the class so that authenticate method (if defined)
			// gets mapped to the authenticate attribute before it is sent to the client.
			// The authenticate property is used by the client to decide whether or not to
			// include the credential type in the predefined credentials (HTTP node)
			Object.assign(tempCredential, { toJSON });

			this.fixIconPath(tempCredential, filePath);
		} catch (e) {
			if (e instanceof TypeError) {
				throw new Error(
					`Class with name "${credentialName}" could not be found. Please check if the class is named correctly!`,
				);
			} else {
				throw e;
			}
		}

		this.known.credentials[tempCredential.name] = {
			className: credentialName,
			sourcePath: filePath,
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
			const codex = this.getCodex(filePath);

			if (isCustom) {
				codex.categories = codex.categories
					? codex.categories.concat(CUSTOM_NODES_CATEGORY)
					: [CUSTOM_NODES_CATEGORY];
			}

			node.description.codex = codex;
		} catch (_) {
			Logger.debug(`No codex available for: ${filePath.split('/').pop() ?? ''}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}

	private fixIconPath(
		obj: INodeTypeDescription | INodeTypeBaseDescription | ICredentialType,
		filePath: string,
	) {
		if (obj.icon?.startsWith('file:')) {
			const iconPath = path.join(path.dirname(filePath), obj.icon.substring(5));
			const relativePath = path.relative(this.directory, iconPath);
			obj.icon = `file:${relativePath}`;
		}
	}
}

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	override async loadAll() {
		const filePaths = await glob('**/*.@(node|credentials).js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const filePath of filePaths) {
			const [fileName, type] = path.parse(filePath).name.split('.');

			if (type === 'node') {
				this.loadNodeFromFile('CUSTOM', fileName, filePath);
			} else if (type === 'credentials') {
				this.loadCredentialFromFile(fileName, filePath);
			}
		}
	}
}

/**
 * Loader for source files of nodes and credentials located in a package dir,
 * e.g. /nodes-base or community packages.
 */
export class PackageDirectoryLoader extends DirectoryLoader {
	packageName = '';

	packageJson!: n8n.PackageJson;

	async readPackageJson() {
		this.packageJson = await this.readJSON('package.json');
		this.packageName = this.packageJson.name;
	}

	override async loadAll() {
		await this.readPackageJson();

		const { n8n } = this.packageJson;
		if (!n8n) return;

		const { nodes, credentials } = n8n;

		if (Array.isArray(credentials)) {
			for (const credential of credentials) {
				const filePath = this.resolvePath(credential);
				const [credentialName] = path.parse(credential).name.split('.');

				this.loadCredentialFromFile(credentialName, filePath);
			}
		}

		if (Array.isArray(nodes)) {
			for (const node of nodes) {
				const filePath = this.resolvePath(node);
				const [nodeName] = path.parse(node).name.split('.');

				this.loadNodeFromFile(this.packageName, nodeName, filePath);
			}
		}

		Logger.debug(`Loaded all credentials and nodes from ${this.packageName}`, {
			credentials: credentials?.length ?? 0,
			nodes: nodes?.length ?? 0,
		});
	}

	protected async readJSON<T>(file: string): Promise<T> {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');

		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new Error(`Failed to parse JSON from ${filePath}`);
		}
	}
}

/**
 * This loader extends PackageDirectoryLoader to load node and credentials lazily, if possible
 */
export class LazyPackageDirectoryLoader extends PackageDirectoryLoader {
	override async loadAll() {
		await this.readPackageJson();

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
					allowedNodes[nodeName] = this.known.nodes[nodeName];
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

			return; // We can load nodes and credentials lazily now
		} catch {
			Logger.debug("Can't enable lazy-loading");
			await super.loadAll();
		}
	}
}
