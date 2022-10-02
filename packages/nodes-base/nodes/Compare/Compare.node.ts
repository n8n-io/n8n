import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { checkInput, checkMatchFieldsInput, findMatches } from './GenericFunctions';

export class Compare implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compare',
		name: 'compare',
		icon: 'file:compare.svg',
		group: ['transform'],
		version: 1,
		description: 'Compare two inputs for changes',
		defaults: { name: 'Compare' },
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'main'],
		inputNames: ['Input 1', 'Input 2'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main', 'main', 'main'],
		outputNames: ['In 1st', 'Same', 'Different', 'In 2nd'],
		// outputNames: ['1st', 'same', 'diff', '2nd'],
		properties: [
			{
				displayName: 'Fields to Match',
				name: 'mergeByFields',
				type: 'fixedCollection',
				placeholder: 'Add Fields to Match',
				default: { values: [{ field1: '', field2: '' }] },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Input 1 Field',
								name: 'field1',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: 'e.g. id',
								hint: ' Enter the field name as text',
							},
							{
								displayName: 'Input 2 Field',
								name: 'field2',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: 'e.g. id',
								hint: ' Enter the field name as text',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Disable Dot Notation',
						name: 'disableDotNotation',
						type: 'boolean',
						default: false,
						description:
							'Whether to disallow referencing child fields using `parent.child` in the field name',
					},
					{
						displayName: 'Multiple Matches',
						name: 'multipleMatches',
						type: 'options',
						default: 'first',
						options: [
							{
								name: 'Include All Matches',
								value: 'all',
								description: 'Output multiple items if there are multiple matches',
							},
							{
								name: 'Include First Match Only',
								value: 'first',
								description: 'Only ever output a single item per match',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const matchFields = checkMatchFieldsInput(
			this.getNodeParameter('mergeByFields.values', 0, []) as IDataObject[],
		);

		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		const input1 = checkInput(
			this.getInputData(0),
			matchFields.map((pair) => pair.field1 as string),
			(options.disableDotNotation as boolean) || false,
			'Input 1',
		);

		const input2 = checkInput(
			this.getInputData(1),
			matchFields.map((pair) => pair.field2 as string),
			(options.disableDotNotation as boolean) || false,
			'Input 2',
		);

		const matches = findMatches(input1, input2, matchFields, options);

		return matches;
	}
}
