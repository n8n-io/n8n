/* eslint-disable @typescript-eslint/naming-convention */
import {
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
} from 'n8n-workflow';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};

	cache: {
		allNodeTypes: INodeTypeDescription[];
		latestNodeTypes: INodeTypeDescription[];
	} = {
		allNodeTypes: [],
		latestNodeTypes: [],
	};

	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);

			if (applyParameters.length) {
				nodeType.description.properties.unshift(...applyParameters);
			}
		}

		this.nodeTypes = nodeTypes;

		const getNodeDescription = (nodeType: INodeType): INodeTypeDescription => {
			const nodeInfo: INodeTypeDescription = { ...nodeType.description };
			// @ts-ignore
			delete nodeInfo.properties;
			return nodeInfo;
		};

		Object.values(nodeTypes).forEach((data) => {
			const nodeType = NodeHelpers.getVersionedNodeType(data.type);
			this.cache.latestNodeTypes.push(getNodeDescription(nodeType));

			NodeHelpers.getVersionedNodeTypeAll(data.type).forEach((element) => {
				this.cache.allNodeTypes.push(getNodeDescription(element));
			});
		});
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	getSourcePath(nodeTypeName: string) {
		const nodeType = this.nodeTypes[nodeTypeName];

		if (!nodeType) throw new Error(`Unknown node type: ${nodeTypeName}`);

		return nodeType.sourcePath;
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path,
	 * used to locate a node's translations.
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

	getByNameAndVersion(nodeTypeName: string, version?: number): INodeType {
		const nodeType = this.nodeTypes[nodeTypeName];

		if (!nodeType) throw new Error(`Unknown node type: ${nodeTypeName}`);

		return NodeHelpers.getVersionedNodeType(nodeType.type, version);
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
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
