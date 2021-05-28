import {
	CodexSearchProperties,
	INodeType,
	INodeTypeData,
	INodeTypes,
	NodeHelpers,
} from 'n8n-workflow';


class NodeTypesClass implements INodeTypes {

	nodeTypes: INodeTypeData = {};


	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeTypeData.type);

			if (applyParameters.length) {
				nodeTypeData.type.description.properties.unshift.apply(nodeTypeData.type.description.properties, applyParameters);
			}
		}
		this.nodeTypes = nodeTypes;
	}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => {
			try {
				data.type.description.codex = this.getCodexSearchProperties(data.sourcePath);
			} catch (error) {
				console.error(`No codex available for: ${data.sourcePath.split('/').pop()}`);
			}

			return data.type;
		});
	}

	getByName(nodeType: string): INodeType | undefined {
		if (this.nodeTypes[nodeType] === undefined) {
			throw new Error(`The node-type "${nodeType}" is not known!`);
		}
		return this.nodeTypes[nodeType].type;
	}

	getCodexSearchProperties(fullNodePath: string): CodexSearchProperties {
		const codex = require(`${fullNodePath}on`); // .js to .json

		return {
			categories: codex.categories ?? [],
			alias: codex.alias ?? [],
		};
	}
}



let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
