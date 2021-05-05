import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties, createResourceLink } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/tag
// - Scenario: Retrieving a collection of item resources (GET)
// - Scenario: Retrieving an individual tag resource (GET)
// - Scenario: Creating a new tag (POST)
// - Scenario: Deleting a tag (DELETE)

export const fields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'GET',
		description: 'Operation to pertagging',
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
			{
				name: 'Delete',
				value: 'DELETE',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'tagging' ],
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
				resource: [ 'tagging' ]
			},
		},
	},
	{
		displayName: 'Tagging ID',
		name: 'tagging_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'tagging' ],
				operation: [ 'GET', 'DELETE' ]
			},
		},
	},
	{
		name: "osdi:person",
		displayName: "Person ID/URL",
		description: "Link to a person by their ID/URL",
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'tagging' ],
				operation: [ 'POST' ]
			}
		}
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'tagging' ],
				operation: [ 'GET_ALL' ],
			}
		}
	})
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'DELETE' | 'POST' | 'GET_ALL';
	const tag_id = node.getNodeParameter('tag_id', i) as string;
	let url = `/api/v2/taggings/${tag_id}`

	if (operation === 'GET') {
		const tagging_id = node.getNodeParameter('tagging_id', i) as string;
		return actionNetworkApiRequest.call(node, 'GET', `${url}/${tagging_id}`) as Promise<IDataObject>
	}

	if (operation === 'DELETE') {
		const tagging_id = node.getNodeParameter('tagging_id', i) as string;
		return actionNetworkApiRequest.call(node, 'DELETE', `${url}/${tagging_id}`) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		const personRefURL = node.getNodeParameter('osdi:person', i, null) as string;
		const body = createResourceLink('osdi:person', personRefURL, 'https://actionnetwork.org/api/v2/people/')
		return actionNetworkApiRequest.call(node, 'POST', url, body) as Promise<IDataObject>
	}

	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []

}
