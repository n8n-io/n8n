import type { INodeType, SupplyData, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { convertNodeToTool } from './helpers';

export function nodeToTool<T extends new (...args: any[]) => INodeType>(nodeType: T): T {
	const myNodeType = new nodeType();
	class NewNodeType extends nodeType {
		constructor(...args: any[]) {
			console.log('constructing a new node type...');
			super(...args);
			this.description.inputs = [];
			this.description.outputs = [NodeConnectionType.AiTool];
			this.description.codex = {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
			};
		}

		async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
			return {
				// @ts-ignore
				response: convertNodeToTool(myNodeType, this, this.getNode().parameters),
			};
		}
	}

	return NewNodeType;
}
