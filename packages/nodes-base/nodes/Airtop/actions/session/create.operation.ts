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
	validateProxyUrl,
	validateSaveProfileOnTermination,
	validateTimeoutMinutes,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { profileNameField } from '../common/fields';

export const description: INodeProperties[] = [
	{
		...profileNameField,
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
		description:
			'Whether to automatically save the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Airtop profile</a> for this session upon termination',
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
	{
		displayName: 'Proxy',
		name: 'proxy',
		type: 'options',
		default: 'none',
		description: 'Choose how to configure the proxy for this session',
		options: [
			{
				name: 'None',
				value: 'none',
				description: 'No proxy will be used',
			},
			{
				name: 'Integrated',
				value: 'integrated',
				description: 'Use Airtop-provided proxy',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Configure a custom proxy',
			},
		],
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Proxy URL',
		name: 'proxyUrl',
		type: 'string',
		default: '',
		description: 'The URL of the proxy to use',
		displayOptions: {
			show: {
				proxy: ['custom'],
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
	const proxyParam = this.getNodeParameter('proxy', index, 'none') as string;
	const proxyUrl = validateProxyUrl.call(this, index, proxyParam);

	const body: IDataObject = {
		configuration: {
			profileName,
			timeoutMinutes,
			proxy: proxyParam === 'custom' ? proxyUrl : Boolean(proxyParam === 'integrated'),
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
