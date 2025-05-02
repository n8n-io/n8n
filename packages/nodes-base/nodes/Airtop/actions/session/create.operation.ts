import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import {
	createSession,
	validateProfileName,
	validateProxyUrl,
	validateSaveProfileOnTermination,
	validateTimeoutMinutes,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { profileNameField } from '../common/fields';

const displayOptions = {
	show: {
		resource: ['session'],
		operation: ['create'],
	},
};

export const description: INodeProperties[] = [
	{
		...profileNameField,
		displayOptions,
	},
	{
		displayName: 'Save Profile',
		name: 'saveProfileOnTermination',
		type: 'boolean',
		default: false,
		description:
			'Whether to automatically save the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Airtop profile</a> for this session upon termination',
		displayOptions,
	},
	{
		displayName: 'Idle Timeout',
		name: 'timeoutMinutes',
		type: 'number',
		default: 10,
		validateType: 'number',
		description: 'Minutes to wait before the session is terminated due to inactivity',
		displayOptions,
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
		displayOptions,
	},
	{
		displayName: 'Proxy URL',
		name: 'proxyUrl',
		type: 'string',
		default: '',
		description: 'The URL of the proxy to use',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['create'],
				proxy: ['custom'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions,
		options: [
			{
				displayName: 'Auto Solve Captchas',
				name: 'autoSolveCaptchas',
				type: 'boolean',
				default: false,
				description:
					'Whether to automatically solve <a href="https://docs.airtop.ai/guides/how-to/solving-captchas" target="_blank">captcha challenges</a>',
			},
			{
				displayName: 'Extension IDs',
				name: 'extensionIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. extId1, extId2, ...',
				description:
					'Comma-separated extension IDs from the Google Web Store to be loaded into the session. Learn more <a href="https://docs.airtop.ai/guides/how-to/using-chrome-extensions" target="_blank">here</a>.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const profileName = validateProfileName.call(this, index);
	const timeoutMinutes = validateTimeoutMinutes.call(this, index);
	const saveProfileOnTermination = validateSaveProfileOnTermination.call(this, index, profileName);
	const proxyParam = this.getNodeParameter('proxy', index, 'none') as string;
	const proxyUrl = validateProxyUrl.call(this, index, proxyParam);
	const autoSolveCaptchas = this.getNodeParameter(
		'additionalFields.autoSolveCaptchas',
		index,
		false,
	) as boolean;

	const extensions = this.getNodeParameter('additionalFields.extensionIds', index, '') as string;
	const extensionIds = extensions ? extensions.split(',').map((id) => id.trim()) : [];

	const body: IDataObject = {
		configuration: {
			profileName,
			timeoutMinutes,
			proxy: proxyParam === 'custom' ? proxyUrl : Boolean(proxyParam === 'integrated'),
			solveCaptcha: autoSolveCaptchas,
			...(extensionIds.length > 0 ? { extensionIds } : {}),
		},
	};

	const { sessionId } = await createSession.call(this, body);

	if (saveProfileOnTermination) {
		await apiRequest.call(
			this,
			'PUT',
			`/sessions/${sessionId}/save-profile-on-termination/${profileName}`,
		);
	}

	return this.helpers.returnJsonArray({ sessionId } as IDataObject);
}
