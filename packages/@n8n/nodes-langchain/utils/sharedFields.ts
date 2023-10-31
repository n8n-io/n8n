import type { INodeProperties } from 'n8n-workflow';

export const metadataFilterField: INodeProperties = {
	displayName: 'Metadata Filter',
	name: 'metadata',
	type: 'fixedCollection',
	description: 'Metadata to filter the document by',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add filter field',
	options: [
		{
			name: 'metadataValues',
			displayName: 'Fields to Set',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
};
