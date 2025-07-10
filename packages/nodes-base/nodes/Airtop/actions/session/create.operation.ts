import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { COUNTRIES } from '../../countries';
import {
	createSession,
	validateProfileName,
	validateProxy,
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

const countryOptions = COUNTRIES.map(({ name, value }) => ({ name, value }));

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
	/**
	 * Proxy Configuration
	 */
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
				name: 'Proxy URL',
				value: 'proxyUrl',
				description: 'Use a proxy URL to configure the proxy',
			},
		],
		displayOptions,
	},
	{
		displayName: 'Proxy Configuration',
		name: 'proxyConfig',
		type: 'collection',
		default: { country: 'US', sticky: true },
		description: 'The Airtop-provided configuration to use for the proxy',
		placeholder: 'Add Attribute',
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'options',
				default: 'US',
				description:
					'The country to use for the proxy. Not all countries are guaranteed to provide a proxy. Learn more <a href="https://docs.airtop.ai/api-reference/airtop-api/sessions/create#request.body.configuration.proxy.Proxy.Airtop-Proxy-Configuration.country" target="_blank">here</a>.',
				options: countryOptions,
			},
			{
				displayName: 'Keep Same IP',
				name: 'sticky',
				type: 'boolean',
				default: true,
				description:
					'Whether to try to maintain the same IP address for the duration of the session. Airtop can guarantee that the same IP address will be available for up to a maximum of 30 minutes.',
			},
		],
		displayOptions: {
			show: {
				...displayOptions.show,
				proxy: ['integrated'],
			},
		},
	},
	{
		displayName: 'Proxy URL',
		name: 'proxyUrl',
		type: 'string',
		default: '',
		description: 'The URL of the proxy to use',
		validateType: 'string',
		displayOptions: {
			show: {
				...displayOptions.show,
				proxy: ['proxyUrl'],
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
				name: 'solveCaptcha',
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
	const { proxy } = validateProxy.call(this, index);
	const solveCaptcha = this.getNodeParameter(
		'additionalFields.solveCaptcha',
		index,
		false,
	) as boolean;

	const extensions = this.getNodeParameter('additionalFields.extensionIds', index, '') as string;
	const extensionIds = extensions ? extensions.split(',').map((id) => id.trim()) : [];

	const body: IDataObject = {
		configuration: {
			profileName,
			timeoutMinutes,
			proxy,
			solveCaptcha,
			...(extensionIds.length > 0 ? { extensionIds } : {}),
		},
	};

	const { sessionId, data } = await createSession.call(this, body);

	if (saveProfileOnTermination) {
		await apiRequest.call(
			this,
			'PUT',
			`/sessions/${sessionId}/save-profile-on-termination/${profileName}`,
		);
	}

	return this.helpers.returnJsonArray({ sessionId, ...data });
}
