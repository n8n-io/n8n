import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, setSafeObjectProperty } from 'n8n-workflow';

interface EntryValue {
	name: string;
	value: unknown;
}

/**
 * The first inner step of an expanded composite node. It resolves the
 * composite's input-context parameters against each item that entered the
 * composite. The inner nodes read the results from its output items.
 */
export class CompositeEntry implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Composite Entry',
		name: 'compositeEntry',
		icon: 'fa:sign-in-alt',
		group: ['transform'],
		version: 1,
		hidden: true,
		engines: ['v2'],
		description: 'Resolves the parameters of a composite node for each item',
		defaults: {
			name: 'Composite Entry',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Values',
				name: 'values',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						displayName: 'Value',
						name: 'value',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const output = items.map((_item, itemIndex): INodeExecutionData => {
			const values = this.getNodeParameter('values.value', itemIndex, []) as EntryValue[];
			const json: IDataObject = {};
			for (const { name, value } of values) {
				setSafeObjectProperty(json, name, value);
			}
			return { json, pairedItem: { item: itemIndex } };
		});

		return [output];
	}
}
