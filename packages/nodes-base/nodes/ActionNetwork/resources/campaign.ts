import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/campaign
// Scenario: Retrieving a collection of event campaign resources (GET)
// Scenario: Retrieving an individual event campaign resource (GET)

export const fields = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'GET',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'GET',
			},
			{
				name: 'Get All',
				value: 'GET_ALL',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'campaign' ]
			},
		},
	},
	{
		displayName: 'Campaign ID',
		name: 'campaign_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'campaign' ],
				operation: [ 'GET' ]
			},
		},
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'campaign' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'campaign' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	let url = `/api/v2/campaigns`
	const campaign_id = node.getNodeParameter('campaign_id', i) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'GET_ALL';

	if (operation === 'GET' && campaign_id) {
		return actionNetworkApiRequest.call(node, 'GET', `${url}/${campaign_id}`) as Promise<IDataObject>
	}

	// Otherwise list all
	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i),
			...createFilterProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []
}
