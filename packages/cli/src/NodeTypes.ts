import type {
	INode,
	INodesAndCredentials,
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { loadClassInIsolation } from 'n8n-core';
import * as path from 'path';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import type { INodesTypeData } from './Interfaces';

class NodeTypesClass implements INodeTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {
		const { nodeTypes } = this.nodesAndCredentials;
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);

			if (applyParameters.length) {
				nodeType.description.properties.unshift(...applyParameters);
			}
		}
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.nodesAndCredentials.nodeTypes).map(({ type }) => type);
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

	// TODO: use the lazy-loading data to return this
	getAllNodeTypeData(): INodesTypeData {
		// Get the data of all the node types that they
		// can be loaded again in the process
		const returnData: INodesTypeData = {};
		for (const [nodeTypeName, node] of Object.entries(this.nodesAndCredentials.nodeTypes)) {
			returnData[nodeTypeName] = {
				className: node.type.constructor.name,
				sourcePath: node.sourcePath,
			};
		}
		return returnData;
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

	private getNode(nodeType: string): INodeTypeData[string] {
		return this.nodesAndCredentials.nodeTypes[nodeType] ?? this.loadNode(nodeType);
	}

	// TODO: move this to loaders
	private loadNode(type: string): INodeTypeData[string] {
		const {
			known: { nodes: knownNodes },
			nodeTypes,
		} = this.nodesAndCredentials;
		if (type in knownNodes) {
			const sourcePath = knownNodes[type];
			const [name] = path.parse(sourcePath).name.split('.');
			const loaded: INodeType = loadClassInIsolation(sourcePath, name);
			nodeTypes[type] = { sourcePath, type: loaded };
			return nodeTypes[type];
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
