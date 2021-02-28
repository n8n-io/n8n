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
		displayName: 'Wrapper ID',
		name: 'wrapper_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'wrapper' ]
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
				wrapper_id: [null, '', undefined]
			}
		}
	})
];

export const logic = async (node: IExecuteFunctions) => {
	const wrapper_id = node.getNodeParameter('wrapper_id', 0) as string
	let url = `/api/v2/wrappers`
	if (wrapper_id) {
		url += `/${wrapper_id}`
		return actionNetworkApiRequest.call(node, 'GET', url) as Promise<IDataObject[]>
	}

	// Otherwise list all
	const qs = createPaginationProperties(node)
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
