import type { INodeProperties } from 'n8n-workflow';

export const signatureOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['signature'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate a unique test signature',
				routing: {
					request: {
						method: 'POST',
						url: '/signature/test',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Generate a signature',
			},
		],
		default: 'generate',
	},
];

export const signatureFields: INodeProperties[] = [
	// ----------------------------------
	//         signature:generate
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['generate'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a project...',
				typeOptions: {
					searchListMethod: 'getProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. abc123',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'projectId',
				value: '={{ $value }}',
			},
		},
		description: 'The Currents project',
	},
	{
		displayName: 'Spec File Path',
		name: 'specFilePath',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['generate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'specFilePath',
			},
		},
		placeholder: 'e.g., tests/e2e/login.spec.ts',
		description: 'The complete path to the spec file',
	},
	{
		displayName: 'Test Title',
		name: 'testTitle',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['generate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'testTitle',
			},
		},
		placeholder: 'e.g., should login with valid credentials',
		description:
			'The test title. For nested describe blocks, use " > " as separator (e.g., "Login > should login with valid credentials").',
	},
];
