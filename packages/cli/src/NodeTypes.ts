/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Known } from 'n8n-core';
import {
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
} from 'n8n-workflow';
import * as path from 'path';
import { loadClassInIsolation } from './CommunityNodes/helpers';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};

	private known: Known['nodes'];

	register(known: Known) {
		this.known = known.nodes;
	}

	async init(nodeTypes: INodeTypeData): Promise<void> {
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
		this.nodeTypes = nodeTypes;
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	getNode(nodeType: string): INodeTypeData[string] {
		return this.nodeTypes[nodeType] ?? this.loadNode(nodeType);
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.nodeTypes[nodeTypeName];

		if (!nodeType) {
			throw new Error(`Unknown node type: ${nodeTypeName}`);
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.getNode(nodeType).type, version);
	}

	attachNodeType(
		nodeTypeName: string,
		nodeType: INodeType | IVersionedNodeType,
		sourcePath: string,
	): void {
		this.nodeTypes[nodeTypeName] = {
			type: nodeType,
			sourcePath,
		};
	}

	removeNodeType(nodeType: string): void {
		delete this.nodeTypes[nodeType];
	}

	private loadNode(type: string): INodeTypeData[string] {
		if (type in this.known) {
			const sourcePath = this.known[type];
			const [name] = path.parse(sourcePath).name.split('.');
			const loaded: INodeType = loadClassInIsolation(sourcePath, name);
			this.nodeTypes[type] = {
				sourcePath,
				type: loaded,
			};
			return this.nodeTypes[type];
		}
		throw new Error(`The node-type "${type}" is not known!`);
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
