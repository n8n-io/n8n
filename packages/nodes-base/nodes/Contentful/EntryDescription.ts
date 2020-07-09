import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource = {
	name: 'Entry',
	value: 'entry'
} as INodePropertyOptions;

export const operations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [resource.value]
			}
		},
		options: [
			{
				name: 'Get Entries',
				value: 'get_entries'
			},
			{
				name: 'Get Single Entry',
				value: 'get_entry'
			}
		],
		default: 'get_entries',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const fields = [
	{
		displayName: 'Resolve',
		name: 'resolve',
		type: 'boolean',
		default: false,
		description: 'Linked entries can be automatically resolved in the results if you click activate this feature.',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: ['get_entries']
			}
		}
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'number',
		default: 1,
		placeholder: '',
		description:
			"When you have related content (e.g. entries with links to image assets) it's possible to include them in the results. Using the include parameter, you can specify the number of levels of entries to include in the results. A lower number might improve performance.",
		typeOptions: {
			minValue: 0,
			maxValue: 10
		},
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: ['get_entries'],
				resolve: [true]
			}
		}
	},

	{
		displayName: 'Entry Id',
		name: 'entry_id',
		type: 'string',
		default: '',
		placeholder: '',
		description: '',
		required: true,
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: ['get_entry']
			}
		}
	}
] as INodeProperties[];
