import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/wrappers
// Scenario: Retrieving a collection of wrapper resources (GET)
// Scenario: Retrieving an individual wrapper resource (GET)

export const fields: INodeProperties[] = [
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
			}
		],
		displayOptions: {
			show: {
				resource: [ 'wrapper' ],
			},
		},
	},
	{
		displayName: 'Wrapper ID',
		name: 'wrapper_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'wrapper' ],
				operation: [ 'GET' ],
			},
		},
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'wrapper' ],
				operation: [ 'GET_ALL' ],
			}
		}
	})
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'GET_ALL';
	const wrapper_id = node.getNodeParameter('wrapper_id', i, undefined) as string
	let url = `/api/v2/wrappers`
	if (operation === 'GET' && wrapper_id) {
		url += `/${wrapper_id}`
		return actionNetworkApiRequest.call(node, 'GET', url) as Promise<IDataObject[]>
	}

	if (operation === 'GET_ALL') {
		// Otherwise list all
		const qs = createPaginationProperties(node, i)
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []
}
