import type { INodeProperties } from 'n8n-workflow';

export const parametersCollection: INodeProperties = {
	displayName: 'Parameters',
	name: 'parameters',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Parameter',
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					placeholder: 'e.g. location',
					default: '',
					validateType: 'string-alphanumeric',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
					description: 'Describe to llm what the parameter is for',
				},
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					default: 'string',
					options: [
						{
							name: 'Boolean',
							value: 'boolean',
						},
						{
							name: 'Number',
							value: 'number',
						},
						{
							name: 'String',
							value: 'string',
						},
						{
							name: 'Infer From Description',
							value: 'infer from description',
						},
					],
				},
			],
		},
	],
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
				name: 'Predefined Credential Type',
				value: 'predefinedCredentialType',
				description:
					"We've already implemented auth for many services so that you don't have to set it up manually",
			},
			{
				name: 'Generic Credential Type',
				value: 'genericCredentialType',
				description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
			},
		],
		default: 'none',
	},
	{
		displayName: 'Credential Type',
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
		displayName: 'Generic Auth Type',
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
		displayName: 'Optimize Response',
		name: 'optimizeResponse',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description:
			'Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost',
	},
	{
		displayName: 'Expected Response Type',
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
		displayName: 'Field Containing Data',
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
		displayName: 'Include Fields',
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
		displayName: 'Return Only Content',
		name: 'onlyContent',
		type: 'boolean',
		default: false,
		description:
			'Whether to return only content of html elements, stripping html tags and attributes',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Elements To Omit',
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
		displayName: 'Max Text Length',
		name: 'maxLength',
		type: 'number',
		default: 0,
		hint: 'If set to 0, no limit will be applied',
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text'],
			},
		},
	},
];
