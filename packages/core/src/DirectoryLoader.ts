import * as path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createContext, Context, Script } from 'node:vm';
import glob from 'fast-glob';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type {
	CodexData,
	ICredentialType,
	ICredentialTypeData,
	INodeType,
	INodeTypeData,
	INodeTypeNameVersion,
	INodeVersionedType,
} from 'n8n-workflow';

export interface IN8nNodePackageJson {
	name: string;
	version: string;
	n8n?: {
		credentials?: string[];
		nodes?: string[];
	};
	author?: {
		name?: string;
		email?: string;
	};
}

const CUSTOM_NODES_CATEGORY = 'Custom Nodes';

function toJSON(this: ICredentialType) {
	return {
		...this,
		authenticate: typeof this.authenticate === 'function' ? {} : this.authenticate,
	};
}

export abstract class DirectoryLoader {
	private context: Context;

	loadedNodes: INodeTypeNameVersion[] = [];

	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	constructor(
		protected readonly directory: string,
		private readonly excludeNodes?: string,
		private readonly includeNodes?: string,
	) {
		this.context = createContext({ require });
	}

	abstract init(): Promise<void>;

	protected resolvePath(file: string) {
		return path.resolve(this.directory, file);
	}

	/**
	 * Loads a node from a file
	 */
	protected loadNodeFromFile(packageName: string, nodeName: string, filePath: string) {
		let tempNode: INodeType | INodeVersionedType;
		let nodeVersion = 1;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			tempNode = this.loadClassInIsolation(filePath, nodeName);
			this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
		} catch (error) {
			Logger.error(
				`Error loading node "${nodeName}" from: "${filePath}" - ${(error as Error).message}`,
			);
			throw error;
		}

		const fullNodeName = `${packageName}.${tempNode.description.name}`;
		tempNode.description.name = fullNodeName;

		if (tempNode.description.icon?.startsWith('file:')) {
			// If a file icon gets used add the full path
			tempNode.description.icon = `file:${path.join(
				path.dirname(filePath),
				tempNode.description.icon.substr(5),
			)}`;
		}

		function isVersioned(nodeType: INodeType | INodeVersionedType): nodeType is INodeVersionedType {
			return 'nodeVersions' in nodeType;
		}

		if (isVersioned(tempNode)) {
			const versionedNodeType = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex({ node: versionedNodeType, filePath, isCustom: packageName === 'CUSTOM' });
			nodeVersion = tempNode.currentVersion;

			if (versionedNodeType.description.icon?.startsWith('file:')) {
				// If a file icon gets used add the full path
				versionedNodeType.description.icon = `file:${path.join(
					path.dirname(filePath),
					versionedNodeType.description.icon.substring(5),
				)}`;
			}

			if (versionedNodeType.hasOwnProperty('executeSingle')) {
				Logger.warn(
					`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`,
					{ filePath },
				);
			}
		} else {
			// Short renaming to avoid type issues
			const tmpNode = tempNode;
			nodeVersion = Array.isArray(tmpNode.description.version)
				? tmpNode.description.version.slice(-1)[0]
				: tmpNode.description.version;
		}

		if (this.includeNodes !== undefined && !this.includeNodes.includes(fullNodeName)) {
			return;
		}

		if (this.excludeNodes?.includes(fullNodeName)) {
			return;
		}

		this.nodeTypes[fullNodeName] = {
			type: tempNode,
			sourcePath: filePath,
		};

		this.loadedNodes.push({
			name: fullNodeName,
			version: nodeVersion,
		});
	}

	/**
	 * Loads credentials from a file
	 */
	protected loadCredentialsFromFile(credentialName: string, filePath: string): void {
		let tempCredential: ICredentialType;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			tempCredential = this.loadClassInIsolation(filePath, credentialName);

			// Add serializer method "toJSON" to the class so that authenticate method (if defined)
			// gets mapped to the authenticate attribute before it is sent to the client.
			// The authenticate property is used by the client to decide whether or not to
			// include the credential type in the predefined credentials (HTTP node)
			Object.assign(tempCredential, { toJSON });

			if (tempCredential.icon?.startsWith('file:')) {
				// If a file icon gets used add the full path
				tempCredential.icon = `file:${path.join(
					path.dirname(filePath),
					tempCredential.icon.substring(5),
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

	private loadClassInIsolation(filePath: string, className: string) {
		if (process.platform === 'win32') {
			filePath = filePath.replace(/\\/g, '/');
		}
		const script = new Script(`new (require('${filePath}').${className})()`);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return script.runInContext(this.context);
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 */
	private getCodex(filePath: string): CodexData {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { categories, subcategories, alias } = module.require(`${filePath}on`); // .js to .json
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			...(categories && { categories }),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			...(subcategories && { subcategories }),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
			Logger.debug(`No codex available for: ${filePath.split('/').pop() ?? ''}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}
}

export class CustomDirectoryLoader extends DirectoryLoader {
	override async init() {
		const files = await glob('**/*.@(node|credentials).js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const filePath of files) {
			const [fileName, type] = path.parse(filePath).name.split('.');
			if (type === 'node') {
				this.loadNodeFromFile('CUSTOM', fileName, filePath);
			} else if (type === 'credentials') {
				this.loadCredentialsFromFile(fileName, filePath);
			}
		}
	}
}

interface PackageCache {
	readonly loadedNodes: INodeTypeNameVersion[];
	readonly nodeTypes: INodeTypeData;
	readonly credentialTypes: ICredentialTypeData;
}

export class PackageDirectoryLoader extends DirectoryLoader {
	packageJson!: IN8nNodePackageJson;

	override async init() {
		this.packageJson = await this.readJSON<IN8nNodePackageJson>('package.json');

		try {
			const cache = await this.readJSON<PackageCache>('.n8n.cache');
			this.loadedNodes = cache.loadedNodes;
			this.nodeTypes = cache.nodeTypes;
			this.credentialTypes = cache.credentialTypes;
			Logger.info('Loaded node and credentials from cache');
			return;
		} catch {
			Logger.info('cache not found');
		}

		const { n8n, name: packageName } = this.packageJson;
		if (!n8n) {
			return;
		}

		const { nodes, credentials } = n8n;

		// Read all credential types
		if (Array.isArray(credentials)) {
			for (const credential of credentials) {
				const filePath = this.resolvePath(credential);
				const [credentialName] = path.parse(credential).name.split('.');
				this.loadCredentialsFromFile(credentialName, filePath);
			}
		}

		// Read all node types
		if (Array.isArray(nodes)) {
			const f = (n: string) => /(Start|Gmail)/i.test(n);
			for (const node of nodes.filter(f)) {
				console.log(node);
				const filePath = this.resolvePath(node);
				const [nodeName] = path.parse(node).name.split('.');
				this.loadNodeFromFile(packageName, nodeName, filePath);
			}
		}

		await this.writeJSON<PackageCache>('.n8n.cache', {
			loadedNodes: this.loadedNodes,
			nodeTypes: this.nodeTypes,
			credentialTypes: this.credentialTypes,
		});
		Logger.info('cache built');
	}

	private async readJSON<T>(file: string) {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');
		return JSON.parse(fileString) as T;
	}

	private async writeJSON<T>(file: string, data: T) {
		const filePath = this.resolvePath(file);
		await writeFile(filePath, JSON.stringify(data), 'utf8');
	}
}
