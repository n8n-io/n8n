import { INodeProperties } from 'n8n-workflow';

export const formOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		options: [
			{
				name: 'Submit a form',
				value: 'submit',
				description: 'Store submission of a form',
			},

		],
		default: 'submit',
		description: 'The operation to perform.',
	}
] as INodeProperties[];

export const formFields = [
	{
		displayName: 'Form',
		name: 'form',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		default: '',
		required: true,
		description: 'Name of the form to operate on.'
	},

	// Form:submit
	{
		displayName: 'Form data',
		name: 'form',
		type: 'json',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		description: 'The data to save.',
	},
] as INodeProperties[];
