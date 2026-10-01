import type { INodeProperties } from 'n8n-workflow';

export const openAiProperties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'The model which will generate the completion. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '={{ $parameter.options?.baseURL?.split("/").slice(-1).pop() || $credentials?.url?.split("/").slice(-1).pop() || "v1" }}/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'gpt-5-mini',
	},
	{
		displayName: 'Built-in Tools',
		name: 'builtInTools',
		placeholder: 'Add Built-in Tool',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'collection',
				default: { searchContextSize: 'medium' },
				options: [
					{
						displayName: 'Search Context Size',
						name: 'searchContextSize',
						type: 'options',
						default: 'medium',
						description:
							'High level guidance for the amount of context window space to use for the search',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
					},
					{
						displayName: 'Web Search Allowed Domains',
						name: 'allowedDomains',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of domains to search. Only domains in this list will be searched.',
						placeholder: 'e.g. google.com, wikipedia.org',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						placeholder: 'e.g. US, GB',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						placeholder: 'e.g. New York, London',
					},
					{
						displayName: 'Region',
						name: 'region',
						type: 'string',
						default: '',
						placeholder: 'e.g. New York, London',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 0.7,
				typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
			},
		],
	},
];
