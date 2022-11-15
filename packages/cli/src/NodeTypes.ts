import { loadClassInIsolation } from 'n8n-core';
import type {
	INode,
	INodesAndCredentials,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import type { INodesTypeData } from './Interfaces';

class NodeTypesClass implements INodeTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(this.loadedNodes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);

			if (applyParameters.length) {
				nodeType.description.properties.unshift(...applyParameters);
			}
		}
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.loadedNodes).map(({ type }) => type);
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

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.getNode(nodeType).type, version);
	}

	getAllNodeTypeData(): INodesTypeData {
		return this.knowNodes;
	}

	/**
	 * Returns the data of the node types that are needed
	 * to execute the given nodes
	 */
	getNodeTypeData(nodes: INode[]): INodesTypeData {
		// Check which node-types have to be loaded
		const neededNodeTypes = this.getNeededNodeTypes(nodes);

		// Get all the data of the needed node types that they
		// can be loaded again in the process
		const returnData: INodesTypeData = {};
		for (const { type } of neededNodeTypes) {
			const nodeType = this.getNode(type);
			returnData[type] = {
				className: nodeType.type.constructor.name,
				sourcePath: nodeType.sourcePath,
			};
		}

		return returnData;
	}

	private getNode(type: string): LoadedClass<INodeType | IVersionedNodeType> {
		const loadedNodes = this.loadedNodes;
		if (type in loadedNodes) {
			return loadedNodes[type];
		}

		const knownNodes = this.knowNodes;
		if (type in knownNodes) {
			const { className, sourcePath } = knownNodes[type];
			const loaded: INodeType = loadClassInIsolation(sourcePath, className);
			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_NODE}: ${type}`);
	}

	/**
	 * Returns the names of the NodeTypes which are are needed
	 * to execute the gives nodes
	 *
	 */
	private getNeededNodeTypes(nodes: INode[]): Array<{ type: string; version: number }> {
		// Check which node-types have to be loaded
		const neededNodeTypes: Array<{ type: string; version: number }> = [];
		for (const node of nodes) {
			if (neededNodeTypes.find((neededNodes) => node.type === neededNodes.type) === undefined) {
				neededNodeTypes.push({ type: node.type, version: node.typeVersion });
			}
		}
		return neededNodeTypes;
	}

	private get loadedNodes() {
		return this.nodesAndCredentials.loaded.nodes;
	}

	private get knowNodes() {
		return this.nodesAndCredentials.known.nodes;
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeTypes(nodesAndCredentials?: INodesAndCredentials): NodeTypesClass {
	if (!nodeTypesInstance) {
		if (nodesAndCredentials) {
			nodeTypesInstance = new NodeTypesClass(nodesAndCredentials);
		} else {
			throw new Error('NodeTypes not initialized yet');
		}
	}

	return nodeTypesInstance;
}
