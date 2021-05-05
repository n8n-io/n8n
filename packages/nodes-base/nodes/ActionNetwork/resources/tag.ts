import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/tags
// - Scenario: Retrieving a collection of tag resources (GET)
// - Scenario: Retrieving an individual tag resource (GET)
// - Scenario: Creating a new tag (POST)

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
			{
				name: 'Create',
				value: 'POST',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'tag' ],
			},
		},
	},
	{
		displayName: 'Tag ID',
		name: 'tag_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'tag' ],
				operation: [ 'GET' ]
			},
		},
	},
	{
		displayName: "Name",
		default: null,
		name: "name",
		type: "string",
		description: "The tag's name.",
		required: true,
		displayOptions: {
			show: {
				resource: [ 'tag' ],
				operation: [ 'POST' ]
			}
		},
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'tag' ],
				operation: [ 'GET_ALL' ],
			}
		}
	})
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';
	let url = `/api/v2/tags`

	if (operation === 'GET') {
		const tag_id = node.getNodeParameter('tag_id', i) as string;
		return actionNetworkApiRequest.call(node, operation, `${url}/${tag_id}`) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body: any = {
			name: node.getNodeParameter('name', i),
		}
		return actionNetworkApiRequest.call(node, 'POST', url, body) as Promise<IDataObject>
	}

	// Otherwise list tags

	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []

}
