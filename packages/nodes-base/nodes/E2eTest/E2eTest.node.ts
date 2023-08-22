import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const data = [
	{
		id: '23423532',
		name: 'Hello World',
	},
];

const options = [
	{
		name: 'Resource 1',
		value: 'resource1',
	},
	{
		name: 'Resource 2',
		value: 'resource2',
	},
	{
		name: 'Resource 3',
		value: 'resource3',
	},
];

const loadOptions = {
	async getOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return options;
	},
};

export class E2eTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test',
		name: 'e2eTest',
		icon: 'fa:play',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Dummy node used for e2e testing',
		defaults: {
			name: 'E2E Test',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Remote Options',
						value: 'remoteOptions',
					},
					{
						name: 'Resource Locator',
						value: 'resourceLocator',
					},
					{
						name: 'Resource Mapping Component',
						value: 'resourceMappingComponent',
					},
				],
				default: 'remoteOptions',
			},
			{
				displayName: 'Field ID',
				name: 'fieldID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Remote Options Name or ID',
				name: 'remoteOptions',
				description:
					'Remote options to load. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['fieldId'],
					loadOptionsMethod: 'getOptions',
				},
				required: true,
				default: [],
				displayOptions: {
					show: {
						operation: ['remoteOptions'],
					},
				},
			},
			{
				displayName: 'Other Non Important Field',
				name: 'otherField',
				type: 'string',
				default: '',
			},
		],
	};

	methods = {
		loadOptions,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const operation = this.getNodeParameter('operation', 0);
		let responseData;

		for (let i = 0; i < length; i++) {
			if (operation === 'getOnePerson') {
				responseData = data[0];
			}

			if (operation === 'getAllPeople') {
				const returnAll = this.getNodeParameter('returnAll', i);

				if (returnAll) {
					responseData = data;
				} else {
					const limit = this.getNodeParameter('limit', i);
					responseData = data.slice(0, limit);
				}
			}

			if (Array.isArray(responseData)) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, executionData);
			} else if (responseData !== undefined) {
				returnData.push({ json: responseData });
			}
		}
		return this.prepareOutputData(returnData);
	}
}
