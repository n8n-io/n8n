import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import {
	validateAirtopApiResponse,
	validateProfileName,
	validateRequiredStringField,
	validateSessionId,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { sessionIdField, profileNameField } from '../common/fields';

export const description: INodeProperties[] = [
	{
		displayName:
			"Note: This operation is not needed if you enabled 'Save Profile' in the 'Create Session' operation",
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['save'],
			},
		},
		default: 'This operation will save the profile on session termination',
	},
	{
		...sessionIdField,
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['save'],
			},
		},
	},
	{
		...profileNameField,
		required: true,
		description:
			'The name of the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Profile</a> to save',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['save'],
			},
		},
		hint: 'Name of the profile you want to save. Must consist only of alphanumeric characters and hyphens "-"',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = validateSessionId.call(this, index);
	let profileName = validateRequiredStringField.call(this, index, 'profileName', 'Profile Name');
	profileName = validateProfileName.call(this, index);

	const response = await apiRequest.call(
		this,
		'PUT',
		`/sessions/${sessionId}/save-profile-on-termination/${profileName}`,
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, profileName, ...response } as IDataObject);
}
