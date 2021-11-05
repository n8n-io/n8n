import {
	INodeProperties,
} from 'n8n-workflow';

export const additionalData = [
{
	displayName: 'Additional Data',
	name: 'additional',
	type: 'collection' ,
	default: {},
	displayOptions: {
		show: {
			resource: [
			'create_revenue',
			'create_payment',
			],
		},
	},
	options: [
		{
			displayName: 'Description',
			name: 'description',
			type: 'string' ,
			default: '',
			description: 'Description',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
		},
		{
			displayName: 'Attachment URL',
			name: 'attachment',
			type: 'string' ,
			default: '',
			placeholder : 'https://example.com/image.png',
			description: 'Attachment',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
		},
		{
			displayName: 'Contact ID',
			name: 'contact_id',
			type: 'string' ,
			default: '',
			placeholder: "1",
			description: 'Contact ID',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
		},
		{
			displayName: 'Reference',
			name: 'reference',
			type: 'string' ,
			default: '',
			placeholder: "456tfd4",
			description: 'Reference Payment',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
		},
	],
	description: 'Additional Data',
}
] as INodeProperties[]
