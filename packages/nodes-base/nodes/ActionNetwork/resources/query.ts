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
		displayName: 'Query ID',
		name: 'query_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'query' ]
			},
		},
	},
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'query' ]
			}
		}
	}),
];

export const logic = async (node: IExecuteFunctions) => {
	let url = `/api/v2/queries`

	const query_id = node.getNodeParameter('query_id', 0) as string
	if (query_id) {
		url += `/${query_id}`
	}

	const qs = createPaginationProperties(node)
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
