import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * A lightweight test-only node that outputs static JSON data.
 * Used in test workflow JSON files as a replacement for Code nodes
 * that merely return hardcoded data. Accepts a `data` parameter
 * containing a JSON array (or single object) and emits each element
 * as a workflow item. No sandbox or code execution involved.
 */
export class TestDataNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Data',
		name: 'testData',
		group: ['input'],
		version: 1,
		description: 'Provides static test data',
		defaults: { name: 'Test Data' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '[]',
				description: 'JSON array of items to output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const raw = this.getNodeParameter('data', 0);
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const items: IDataObject[] = Array.isArray(parsed) ? parsed : [parsed];
		return [items.map((item) => ({ json: item }))];
	}
}
