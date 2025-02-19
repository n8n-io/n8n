import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { INTEGRATION_URL } from '../../constants';
import {
	validateAirtopApiResponse,
	validateProfileName,
	validateSaveProfileOnTermination,
	validateTimeoutMinutes,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'profileName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Save Profile',
		name: 'saveProfileOnTermination',
		type: 'boolean',
		default: false,
		description: 'Whether to save changes to the browsing profile',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Idle Timeout',
		name: 'timeoutMinutes',
		type: 'number',
		default: 10,
		validateType: 'number',
		description: 'Minutes to wait before the session is terminated due to inactivity',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['create'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const url = `${INTEGRATION_URL}/create-session`;

	const profileName = validateProfileName.call(this, index);
	const timeoutMinutes = validateTimeoutMinutes.call(this, index);
	const saveProfileOnTermination = validateSaveProfileOnTermination.call(this, index, profileName);

	const body: IDataObject = {
		configuration: {
			profileName,
			timeoutMinutes,
		},
	};

	const response = await apiRequest.call(this, 'POST', url, body);
	const sessionId = response.sessionId;

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	if (saveProfileOnTermination) {
		await apiRequest.call(
			this,
			'PUT',
			`/sessions/${sessionId}/save-profile-on-termination/${profileName}`,
		);
	}

	return this.helpers.returnJsonArray({ sessionId } as IDataObject);
}
