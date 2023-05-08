import type { INodeProperties } from 'n8n-workflow';

export const baseRLC: INodeProperties = {
	displayName: 'Base',
	name: 'base',
	type: 'resourceLocator',
	default: { mode: 'url', value: '' },
	required: true,
	description: 'The Airtable Base in which to operate on',
	modes: [
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'https://airtable.com/app12DiScdfes/tblAAAAAAAAAAAAA/viwHdfasdfeieg5p',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://airtable.com/([a-zA-Z0-9]{2,})/.*',
						errorMessage: 'Not a valid Airtable Base URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: 'https://airtable.com/([a-zA-Z0-9]{2,})',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9]{2,}',
						errorMessage: 'Not a valid Airtable Base ID',
					},
				},
			],
			placeholder: 'appD3dfaeidke',
			url: '=https://airtable.com/{{$value}}',
		},
	],
};

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'table',
	type: 'resourceLocator',
	default: { mode: 'url', value: '' },
	required: true,
	modes: [
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'https://airtable.com/app12DiScdfes/tblAAAAAAAAAAAAA/viwHdfasdfeieg5p',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://airtable.com/[a-zA-Z0-9]{2,}/([a-zA-Z0-9]{2,})/.*',
						errorMessage: 'Not a valid Airtable Table URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: 'https://airtable.com/[a-zA-Z0-9]{2,}/([a-zA-Z0-9]{2,})',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9]{2,}',
						errorMessage: 'Not a valid Airtable Table ID',
					},
				},
			],
			placeholder: 'tbl3dirwqeidke',
		},
	],
};
