import type { INodeProperties } from 'n8n-workflow';

export const specifyBySelector: INodeProperties = {
	displayName: 'Specify by',
	name: 'specifyBy',
	type: 'options',
	options: [
		{
			name: 'Using fields below',
			value: 'keypair',
		},
		{
			name: 'Using JSON below',
			value: 'json',
		},
		{
			name: 'Let model specify entire body',
			value: 'model',
		},
	],
	default: 'keypair',
};

export const parametersCollection: INodeProperties = {
	displayName: 'Parameters',
	name: 'parameters',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add parameter',
	default: {
		values: [
			{
				name: '',
			},
		],
	},
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Value provided',
					name: 'valueProvider',
					type: 'options',
					options: [
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							name: 'By Model (and is required)',
							value: 'modelRequired',
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							name: 'By Model (but is optional)',
							value: 'modelOptional',
						},
						{
							name: 'Using Field Below',
							value: 'fieldValue',
						},
					],
					default: 'modelRequired',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					hint: 'Use a {placeholder} for any data to be filled in by the model',
					displayOptions: {
						show: {
							valueProvider: ['fieldValue'],
						},
					},
				},
			],
		},
	],
};
export const placeholderDefinitionsCollection: INodeProperties = {
	displayName: 'Placeholder definitions',
	name: 'placeholderDefinitions',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add definition',
	default: [],
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				{
					displayName: 'Placeholder name',
					name: 'name',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
					options: [
						{
							name: 'Not specified (default)',
							value: 'not specified',
						},
						{
							name: 'String',
							value: 'string',
						},
						{
							name: 'Number',
							value: 'number',
						},
						{
							name: 'Boolean',
							value: 'boolean',
						},
						{
							name: 'JSON',
							value: 'json',
						},
					],
					default: 'not specified',
				},
			],
		},
	],
};

export const jsonInput: INodeProperties = {
	displayName: 'JSON',
	name: 'json',
	type: 'string',
	typeOptions: {
		rows: 5,
	},
	hint: 'Use a {placeholder} for any data to be filled in by the model',
	default: '',
};

export const authenticationProperties: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'authentication',
		description:
			'Select the type of authentication to use if needed, authentication would be done by n8n and your credentials will not be shared with the LLM',
		noDataExpression: true,
		type: 'options',
		options: [
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'Predefined credential type',
				value: 'predefinedCredentialType',
				description:
					"We've already implemented auth for many services so that you don't have to set it up manually",
			},
			{
				name: 'Generic credential type',
				value: 'genericCredentialType',
				description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
			},
		],
		default: 'none',
	},
	{
		displayName: 'Credential type',
		name: 'nodeCredentialType',
		type: 'credentialsSelect',
		noDataExpression: true,
		required: true,
		default: '',
		credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
		displayOptions: {
			show: {
				authentication: ['predefinedCredentialType'],
			},
		},
	},
	{
		displayName:
			'Make sure you have specified the scope(s) for the Service Account in the credential',
		name: 'googleApiWarning',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				nodeCredentialType: ['googleApi'],
			},
		},
	},
	{
		displayName: 'Generic auth type',
		name: 'genericAuthType',
		type: 'credentialsSelect',
		required: true,
		default: '',
		credentialTypes: ['has:genericAuth'],
		displayOptions: {
			show: {
				authentication: ['genericCredentialType'],
			},
		},
	},
];

export const optimizeResponseProperties: INodeProperties[] = [
	{
		displayName: 'Optimize response',
		name: 'optimizeResponse',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description:
			'Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost',
	},
	{
		displayName: 'Expected response type',
		name: 'responseType',
		type: 'options',
		displayOptions: {
			show: {
				optimizeResponse: [true],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		default: 'json',
	},
	{
		displayName: 'Field containing data',
		name: 'dataField',
		type: 'string',
		default: '',
		placeholder: 'e.g. records',
		description: 'Specify the name of the field in the response containing the data',
		hint: 'leave blank to use whole response',
		requiresDataPath: 'single',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
	},
	{
		displayName: 'Include fields',
		name: 'fieldsToInclude',
		type: 'options',
		description: 'What fields response object should include',
		default: 'all',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
		options: [
			{
				name: 'All',
				value: 'all',
				description: 'Include all fields',
			},
			{
				name: 'Selected',
				value: 'selected',
				description: 'Include only fields specified below',
			},
			{
				name: 'Except',
				value: 'except',
				description: 'Exclude fields specified below',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		default: '',
		placeholder: 'e.g. field1,field2',
		description:
			'Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.',
		requiresDataPath: 'multiple',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
			hide: {
				fieldsToInclude: ['all'],
			},
		},
	},
	{
		displayName: 'Selector (CSS)',
		name: 'cssSelector',
		type: 'string',
		description:
			'Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.',
		placeholder: 'e.g. body',
		default: 'body',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Return only content',
		name: 'onlyContent',
		type: 'boolean',
		default: false,
		description:
			'Whether to return only content of html elements, stripping html tags and attributes',
		hint: 'Uses less tokens and may be easier for model to understand',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Elements to omit',
		name: 'elementsToOmit',
		type: 'string',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
				onlyContent: [true],
			},
		},
		default: '',
		placeholder: 'e.g. img, .className, #ItemId',
		description: 'Comma-separated list of selectors that would be excluded when extracting content',
	},
	{
		displayName: 'Truncate response',
		name: 'truncateResponse',
		type: 'boolean',
		default: false,
		hint: 'Helps save tokens',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
			},
		},
	},
	{
		displayName: 'Max response characters',
		name: 'maxLength',
		type: 'number',
		default: 1000,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
				truncateResponse: [true],
			},
		},
	},
];
