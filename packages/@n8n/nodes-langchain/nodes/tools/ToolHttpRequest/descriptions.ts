import type { INodeProperties } from 'n8n-workflow';

export const specifyBySelector: INodeProperties = {
	displayName: 'Specify By',
	name: 'specifyBy',
	type: 'options',
	options: [
		{
			name: 'Using Fields Below',
			value: 'keypair',
		},
		{
			name: 'Using JSON Below',
			value: 'json',
		},
		{
			name: 'Let Model Specify Entire Body',
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
	placeholder: 'Add Parameter',
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
					displayName: 'Value Provided',
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
	displayName: 'Placeholder Definitions',
	name: 'placeholderDefinitions',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Definition',
	default: [],
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				{
					displayName: 'Placeholder Name',
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
							name: 'Not Specified (Default)',
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
