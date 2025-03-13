import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { createHmac } from 'node:crypto';

import {
	getCanonicalizedHeadersString,
	getCanonicalizedResourceString,
	HeaderConstants,
} from '../nodes/Microsoft/Storage/GenericFunctions';

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
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: '=https://{{ $self["account"] }}.blob.core.windows.net',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
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
}
