import { loadClassInIsolation } from 'n8n-core';
import type {
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { Service } from 'typedi';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import { LoadNodesAndCredentials } from './LoadNodesAndCredentials';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(private nodesAndCredentials: LoadNodesAndCredentials) {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		this.applySpecialNodeParameters();
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
			throw new Error(`Unknown node type: ${nodeTypeName}`);
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

	applySpecialNodeParameters() {
		for (const nodeTypeData of Object.values(this.loadedNodes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			NodeHelpers.applySpecialNodeParameters(nodeType);
		}
	}

	private getNode(type: string): LoadedClass<INodeType | IVersionedNodeType> {
		const loadedNodes = this.loadedNodes;
		if (type in loadedNodes) {
			return loadedNodes[type];
		}

		const knownNodes = this.knownNodes;
		if (type in knownNodes) {
			const { className, sourcePath } = knownNodes[type];
			const loaded: INodeType = loadClassInIsolation(sourcePath, className);
			NodeHelpers.applySpecialNodeParameters(loaded);
			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_NODE}: ${type}`);
	}

	private get loadedNodes() {
		return this.nodesAndCredentials.loaded.nodes;
	}

	private get knownNodes() {
		return this.nodesAndCredentials.known.nodes;
	}
}
