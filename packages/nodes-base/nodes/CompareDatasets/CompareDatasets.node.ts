import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	checkInput,
	checkInputAndThrowError,
	checkMatchFieldsInput,
	findMatches,
} from './GenericFunctions';

export class CompareDatasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compare Datasets',
		name: 'compareDatasets',
		icon: 'file:compare.svg',
		group: ['transform'],
		version: [1, 2, 2.1, 2.2, 2.3],
		description: 'Compare two inputs for changes',
		defaults: { name: 'Compare Datasets' },

		inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		inputNames: ['Input A', 'Input B'],
		requiredInputs: 1,

		outputs: [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
		],
		outputNames: ['In A only', 'Same', 'Different', 'In B only'],
		properties: [
			{
				displayName:
					'Items from different branches are paired together when the fields below match. If paired, the rest of the fields are compared to determine whether the items are the same or different',
				name: 'infoBox',
				type: 'notice',
				default: '',
			},
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
								requiresDataPath: 'single',
							},
							{
								displayName: 'Input B Field',
								name: 'field2',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: 'e.g. id',
								hint: ' Enter the field name as text',
								requiresDataPath: 'single',
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
				displayOptions: {
					show: {
						'@version': [1, 2],
					},
				},
			},
			{
				displayName: 'When There Are Differences',
				name: 'resolve',
				type: 'options',
				default: 'includeBoth',
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
				displayOptions: {
					hide: {
						'@version': [1, 2],
					},
				},
			},
			{
				displayName: 'Fuzzy Compare',
				name: 'fuzzyCompare',
				type: 'boolean',
				default: false,
				description:
					"Whether to tolerate small type differences when comparing fields. E.g. the number 3 and the string '3' are treated as the same.",
				displayOptions: {
					hide: {
						'@version': [1],
					},
				},
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
				requiresDataPath: 'multiple',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
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
						requiresDataPath: 'multiple',
					},
					{
						displayName: 'Fuzzy Compare',
						name: 'fuzzyCompare',
						type: 'boolean',
						default: false,
						description:
							"Whether to tolerate small type differences when comparing fields. E.g. the number 3 and the string '3' are treated as the same.",
						displayOptions: {
							show: {
								'@version': [1],
							},
						},
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

		options.nodeVersion = this.getNode().typeVersion;

		if (options.nodeVersion >= 2) {
			options.fuzzyCompare = this.getNodeParameter('fuzzyCompare', 0, false) as boolean;
		}

		let input1 = this.getInputData(0);
		let input2 = this.getInputData(1);
		if (options.nodeVersion < 2.2) {
			input1 = checkInputAndThrowError(
				input1,
				matchFields.map((pair) => pair.field1),
				(options.disableDotNotation as boolean) || false,
				'Input A',
			);

			input2 = checkInputAndThrowError(
				input2,
				matchFields.map((pair) => pair.field2),
				(options.disableDotNotation as boolean) || false,
				'Input B',
			);
		} else {
			input1 = checkInput(input1);
			input2 = checkInput(input2);
		}

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
