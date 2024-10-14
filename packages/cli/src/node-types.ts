import type { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { loadClassInIsolation } from 'n8n-core';
import type {
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from 'n8n-workflow';
import { ApplicationError, NodeHelpers } from 'n8n-workflow';
import { join, dirname } from 'path';
import { Service } from 'typedi';

import { UnrecognizedNodeTypeError } from './errors/unrecognized-node-type.error';
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';

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
		const origType = nodeType;
		const toolRequested = nodeType.match(/n8n-nodes-base\..*Tool$/);
		// Make sure the nodeType to actually get from disk is the un-wrapped type
		if (toolRequested) {
			nodeType = nodeType.replace(/Tool$/, '');
		}

		const node = this.getNode(nodeType);
		const versionedNode = NodeHelpers.getVersionedNodeType(node.type, version);
		if (versionedNode.description.usableAsTool) {
			const { loadedNodes, knownNodes } = this.loadNodesAndCredentials;
			if (toolRequested && origType in loadedNodes) {
				return loadedNodes[origType].type as INodeType;
			}
			const { className, sourcePath } = knownNodes[nodeType];
			// Need to load the class from disk again, because we can't clone an existing type,
			// and we don't want to change the "normal" version of the node.
			const clone = this.loadOriginalClass(sourcePath, className);
			const clonedNode = NodeHelpers.getVersionedNodeType(clone, version);
			const tool = NodeHelpers.convertNodeToAiTool(clonedNode);
			loadedNodes[nodeType + 'Tool'] = { sourcePath, type: tool };
			if (toolRequested) {
				return tool as INodeType;
			}
		}

		return versionedNode;
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
			const loaded = this.loadOriginalClass(sourcePath, className);
			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}

		throw new UnrecognizedNodeTypeError(type);
	}

	private loadOriginalClass(sourcePath: string, className: string): INodeType {
		const loaded: INodeType = loadClassInIsolation(sourcePath, className);
		NodeHelpers.applySpecialNodeParameters(loaded);
		return loaded;
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
