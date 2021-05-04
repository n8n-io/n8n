import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/embed
// Scenario: Retrieving an embed resource for an individual action (GET)

export const fields: INodeProperties[] = [
	{
		displayName: "Action type",
		name: "action_type",
		type: 'options',
		default: 'event',
		required: true,
		options: [
			{ name: 'Fundraising Page', value: 'fundraising_pages' },
			{ name: 'Form', value: 'forms' },
			{ name: 'Form', value: 'events' },
			{ name: 'Petitions', value: 'petitions' },
			{ name: 'Form', value: 'form' }
		],
		displayOptions: {
			show: {
				resource: [ 'embed' ]
			},
		},
	},
	{
		displayName: 'Action ID',
		name: 'action_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'embed' ]
			},
		},
	}
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const action_type = node.getNodeParameter('action_type', i) as string
	const action_id = node.getNodeParameter('action_id', i) as string
	let url = `/api/v2/${action_type}/${action_id}/embed`
	return actionNetworkApiRequest.call(node, 'GET', url) as Promise<IDataObject[]>
}
