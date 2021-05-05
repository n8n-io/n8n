import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createPaginationProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/queries
// Scenario: Retrieving a collection of query resources (GET)
// Scenario: Retrieving an individual query resource (GET)

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
			},
		],
		displayOptions: {
			show: {
				resource: [ 'query' ],
			},
		},
	},
	{
		displayName: 'Query ID',
		name: 'query_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'query' ],
				operation: [ 'GET' ]
			},
		},
	},
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'query' ],
				operation: [ 'GET_ALL' ]
			}
		}
	}),
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	let url = `/api/v2/queries`
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'GET_ALL';

	const query_id = node.getNodeParameter('query_id', i, null) as string
	if (operation === 'GET' && query_id) {
		url += `/${query_id}`
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined) as Promise<IDataObject[]>
	}

	if (operation === 'GET_ALL') {
		const qs = createPaginationProperties(node, i)
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []
}
