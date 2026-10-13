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
			'The ID to save this session\'s <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Browser Profile</a> under. A profile with this ID is created if it does not exist yet.',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['save'],
			},
		},
		hint: 'Must consist only of alphanumeric characters and hyphens "-"',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = validateSessionId.call(this, index);
	let profileName = validateRequiredStringField.call(
		this,
		index,
		'profileName',
		'Browser Profile ID',
	);
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
