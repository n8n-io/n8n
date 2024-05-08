import { loadClassInIsolation } from 'n8n-core';
import type {
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from 'n8n-workflow';
import { ApplicationError, NodeHelpers } from 'n8n-workflow';
import { Service } from 'typedi';
import { LoadNodesAndCredentials } from './LoadNodesAndCredentials';
import { join, dirname } from 'path';
import { readdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { UnrecognizedNodeTypeError } from './errors/unrecognized-node-type.error';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(private loadNodesAndCredentials: LoadNodesAndCredentials) {
		loadNodesAndCredentials.addPostProcessor(async () => this.applySpecialNodeParameters());
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.getNode(nodeTypeName);

		if (!nodeType) {
			throw new ApplicationError('Unknown node type', { tags: { nodeTypeName } });
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.getNode(nodeType).type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.getNode(nodeType).type, version);
	}

	/* Some nodeTypes need to get special parameters applied like the polling nodes the polling times */
	applySpecialNodeParameters() {
		for (const nodeTypeData of Object.values(this.loadNodesAndCredentials.loadedNodes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			NodeHelpers.applySpecialNodeParameters(nodeType);
		}
	}

	getKnownTypes() {
		return this.loadNodesAndCredentials.knownNodes;
	}

	private getNode(type: string): LoadedClass<INodeType | IVersionedNodeType> {
		const { loadedNodes, knownNodes } = this.loadNodesAndCredentials;
		if (type in loadedNodes) {
			return loadedNodes[type];
		}

		if (type in knownNodes) {
			const { className, sourcePath } = knownNodes[type];
			const loaded: INodeType = loadClassInIsolation(sourcePath, className);
			NodeHelpers.applySpecialNodeParameters(loaded);
			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}

		throw new UnrecognizedNodeTypeError(type);
	}

	async getNodeTranslationPath({
		nodeSourcePath,
		longNodeType,
		locale,
	}: {
		nodeSourcePath: string;
		longNodeType: string;
		locale: string;
	}) {
		const nodeDir = dirname(nodeSourcePath);
		const maxVersion = await this.getMaxVersion(nodeDir);
		const nodeType = longNodeType.replace('n8n-nodes-base.', '');

		return maxVersion
			? join(nodeDir, `v${maxVersion}`, 'translations', locale, `${nodeType}.json`)
			: join(nodeDir, 'translations', locale, `${nodeType}.json`);
	}

	private async getMaxVersion(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true });

		const dirnames = entries.reduce<string[]>((acc, cur) => {
			if (this.isVersionedDirname(cur)) acc.push(cur.name);
			return acc;
		}, []);

		if (!dirnames.length) return null;

		return Math.max(...dirnames.map((d) => parseInt(d.charAt(1), 10)));
	}

	private isVersionedDirname(dirent: Dirent) {
		if (!dirent.isDirectory()) return false;

		const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3]; // e.g. v1, v10

		return (
			ALLOWED_VERSIONED_DIRNAME_LENGTH.includes(dirent.name.length) &&
			dirent.name.toLowerCase().startsWith('v')
		);
	}
}
