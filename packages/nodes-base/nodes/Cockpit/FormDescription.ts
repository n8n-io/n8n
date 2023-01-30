import type { INodeProperties } from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['form'],
			},
		},
		options: [
			{
				name: 'Submit a Form',
				value: 'submit',
				description: 'Store data from a form submission',
				action: 'Submit a form',
			},
		],
		default: 'submit',
	},
];

export const formFields: INodeProperties[] = [
	{
		displayName: 'Form',
		name: 'form',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['form'],
			},
		},
		default: '',
		required: true,
		description: 'Name of the form to operate on',
	},

	// Form:submit
	{
		displayName: 'JSON Data Fields',
		name: 'jsonDataFields',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['submit'],
			},
		},
		description: 'Whether form fields should be set via the value-key pair UI or JSON',
	},
	{
		displayName: 'Form Data',
		name: 'dataFieldsJson',
		type: 'json',
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				jsonDataFields: [true],
				resource: ['form'],
				operation: ['submit'],
			},
		},
		description: 'Form data to send as JSON',
	},
	{
		displayName: 'Form Data',
		name: 'dataFieldsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				jsonDataFields: [false],
				resource: ['form'],
				operation: ['submit'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the field',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field',
					},
				],
			},
		],
		description: 'Form data to send',
	},
];
