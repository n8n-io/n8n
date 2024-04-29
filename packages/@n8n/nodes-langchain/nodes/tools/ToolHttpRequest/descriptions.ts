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
							name: 'Any',
							value: 'any',
						},
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
