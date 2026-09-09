import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { createHmac } from 'node:crypto';

import {
	getCanonicalizedHeadersString,
	getCanonicalizedResourceString,
	HeaderConstants,
	XMsVersion,
} from '../nodes/Microsoft/Storage/GenericFunctions';

const AZURE_CLOUD_SUFFIXES = [
	'blob.core.windows.net',
	'blob.core.usgovcloudapi.net',
	'blob.core.chinacloudapi.cn',
];

function assertEndpointAllowed(credentials: ICredentialDataDecryptedObject): void {
	if (!/^[a-z0-9]+$/i.test(String(credentials.account ?? ''))) {
		throw new UserError('The account name can contain only letters and numbers.');
	}

	const environment = credentials.environment ?? AZURE_CLOUD_SUFFIXES[0];
	if (environment !== 'custom') {
		if (!AZURE_CLOUD_SUFFIXES.includes(String(environment))) {
			throw new UserError('Select an Azure cloud from the list.');
		}
		return;
	}

	if (!Container.get(SecurityConfig).azureStorageCustomEndpoints) {
		throw new UserError(
			'Custom Azure Storage endpoints are disabled on this instance, contact your administrator.',
		);
	}
	if (!credentials.customEndpoint) {
		throw new UserError('Endpoint is required when Azure Cloud is set to Custom.');
	}
	let endpoint: URL | undefined;
	try {
		endpoint = new URL(String(credentials.customEndpoint));
	} catch {}
	if (!endpoint || endpoint.protocol !== 'https:' || endpoint.href !== `${endpoint.origin}/`) {
		throw new UserError(
			'Endpoint must be an https:// URL with only a hostname and an optional port, for example https://myaccount.privatelink.blob.core.windows.net',
		);
	}
}

export class AzureStorageSharedKeyApi implements ICredentialType {
	name = 'azureStorageSharedKeyApi';

	displayName = 'Azure Storage Shared Key API';

	documentationUrl = 'azurestorage';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			description: 'Account name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Key',
			name: 'key',
			description: 'Account key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Azure Cloud',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Azure Public Cloud',
					value: 'blob.core.windows.net',
					description: 'Uses <code>blob.core.windows.net</code>',
				},
				{
					name: 'Azure US Government',
					value: 'blob.core.usgovcloudapi.net',
					description: 'Uses <code>blob.core.usgovcloudapi.net</code>',
				},
				{
					name: 'Azure China',
					value: 'blob.core.chinacloudapi.cn',
					description: 'Uses <code>blob.core.chinacloudapi.cn</code>',
				},
				{
					name: 'Custom',
					value: 'custom',
					description:
						'A private endpoint or a custom domain. An administrator must enable custom endpoints on this n8n instance.',
				},
			],
			default: 'blob.core.windows.net',
		},
		{
			displayName: 'Endpoint',
			name: 'customEndpoint',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://myaccount.privatelink.blob.core.windows.net',
			displayOptions: {
				show: {
					environment: ['custom'],
				},
			},
			description:
				'The https:// URL of the storage endpoint. The account name must be in the hostname. An administrator must set <code>N8N_AZURE_STORAGE_CUSTOM_ENDPOINTS_ENABLED=true</code> on this n8n instance. Endpoints with the account name in the path, such as Azurite, do not work.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default:
				'={{ $self["environment"] === "custom" ? $self["customEndpoint"] : "https://" + $self["account"] + "." + $self["environment"] }}',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		assertEndpointAllowed(credentials);

		if (requestOptions.qs) {
			for (const [key, value] of Object.entries(requestOptions.qs)) {
				if (value === undefined) {
					delete requestOptions.qs[key];
				}
			}
		}
		if (requestOptions.headers) {
			for (const [key, value] of Object.entries(requestOptions.headers)) {
				if (value === undefined) {
					delete requestOptions.headers[key];
				}
			}
		}

		requestOptions.method ??= 'GET';
		requestOptions.headers ??= {};

		requestOptions.headers[HeaderConstants.X_MS_VERSION] ??= XMsVersion;
		requestOptions.headers[HeaderConstants.X_MS_DATE] ??= new Date().toUTCString();

		const stringToSign: string = [
			requestOptions.method.toUpperCase(),
			requestOptions.headers[HeaderConstants.CONTENT_LANGUAGE] ?? '',
			requestOptions.headers[HeaderConstants.CONTENT_ENCODING] ?? '',
			requestOptions.headers[HeaderConstants.CONTENT_LENGTH] ?? '',
			requestOptions.headers[HeaderConstants.CONTENT_MD5] ?? '',
			requestOptions.headers[HeaderConstants.CONTENT_TYPE] ?? '',
			requestOptions.headers[HeaderConstants.DATE] ?? '',
			requestOptions.headers[HeaderConstants.IF_MODIFIED_SINCE] ?? '',
			requestOptions.headers[HeaderConstants.IF_MATCH] ?? '',
			requestOptions.headers[HeaderConstants.IF_NONE_MATCH] ?? '',
			requestOptions.headers[HeaderConstants.IF_UNMODIFIED_SINCE] ?? '',
			requestOptions.headers[HeaderConstants.RANGE] ?? '',
			getCanonicalizedHeadersString(requestOptions) +
				getCanonicalizedResourceString(requestOptions, credentials),
		].join('\n');

		const signature: string = createHmac('sha256', Buffer.from(credentials.key as string, 'base64'))
			.update(stringToSign, 'utf8')
			.digest('base64');

		requestOptions.headers[HeaderConstants.AUTHORIZATION] =
			`SharedKey ${credentials.account as string}:${signature}`;

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/',
			headers: {
				'x-ms-date': '={{ new Date().toUTCString() }}',
				'x-ms-version': '2021-12-02',
			},
			qs: {
				comp: 'list',
			},
		},
	};
}
