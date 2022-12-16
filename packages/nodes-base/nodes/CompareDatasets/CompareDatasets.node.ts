import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { checkInput, checkMatchFieldsInput, findMatches } from './GenericFunctions';

export class CompareDatasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compare Datasets',
		name: 'compareDatasets',
		icon: 'file:compare.svg',
		group: ['transform'],
		version: 1,
		description: 'Compare two inputs for changes',
		defaults: { name: 'Compare Datasets' },
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'main'],
		inputNames: ['Input A', 'Input B'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main', 'main', 'main'],
		outputNames: ['In A only', 'Same', 'Different', 'In B only'],
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
								displayName: 'Input A Field',
								name: 'field1',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: 'e.g. id',
								hint: ' Enter the field name as text',
							},
							{
								displayName: 'Input B Field',
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
				displayName: 'When There Are Differences',
				name: 'resolve',
				type: 'options',
				default: 'preferInput2',
				options: [
					{
						name: 'Use Input A Version',
						value: 'preferInput1',
					},
					{
						name: 'Use Input B Version',
						value: 'preferInput2',
					},
					{
						name: 'Use a Mix of Versions',
						value: 'mix',
						description: 'Output uses different inputs for different fields',
					},
					{
						name: 'Include Both Versions',
						value: 'includeBoth',
						description: 'Output contains all data (but structure more complex)',
					},
				],
			},
			{
				displayName: 'Prefer',
				name: 'preferWhenMix',
				type: 'options',
				default: 'input1',
				options: [
					{
						name: 'Input A Version',
						value: 'input1',
					},
					{
						name: 'Input B Version',
						value: 'input2',
					},
				],
				displayOptions: {
					show: {
						resolve: ['mix'],
					},
				},
			},
			{
				displayName: 'For Everything Except',
				name: 'exceptWhenMix',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: 'e.g. id, country',
				hint: 'Enter the names of the input fields as text, separated by commas',
				displayOptions: {
					show: {
						resolve: ['mix'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Fields to Skip Comparing',
						name: 'skipFields',
						type: 'string',
						default: '',
						placeholder: 'e.g. updated_at, updated_by',
						hint: 'Enter the field names as text, separated by commas',
						description:
							"Fields that shouldn't be included when checking whether two items are the same",
					},
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
								name: 'Include First Match Only',
								value: 'first',
								description: 'Only ever output a single item per match',
							},
							{
								name: 'Include All Matches',
								value: 'all',
								description: 'Output multiple items if there are multiple matches',
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

		const options = this.getNodeParameter('options', 0, {});

		const input1 = checkInput(
			this.getInputData(0),
			matchFields.map((pair) => pair.field1),
			(options.disableDotNotation as boolean) || false,
			'Input A',
		);

		const input2 = checkInput(
			this.getInputData(1),
			matchFields.map((pair) => pair.field2),
			(options.disableDotNotation as boolean) || false,
			'Input B',
		);

		const resolve = this.getNodeParameter('resolve', 0, '') as string;
		options.resolve = resolve;

		if (resolve === 'mix') {
			options.preferWhenMix = this.getNodeParameter('preferWhenMix', 0, '') as string;
			options.exceptWhenMix = this.getNodeParameter('exceptWhenMix', 0, '') as string;
		}

		const matches = findMatches(input1, input2, matchFields, options);

		return matches;
	}
}
