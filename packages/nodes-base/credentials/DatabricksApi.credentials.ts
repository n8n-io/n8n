import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { databricksUserAgent } from '../nodes/Databricks/constants';

export class DatabricksApi implements ICredentialType {
	name = 'databricksApi';
	displayName = 'Databricks';
	documentationUrl = 'https://docs.databricks.com/dev-tools/api/latest/authentication.html';
	icon = 'file:icons/databricks.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://adb-xxxxx.xx.azure.databricks.com',
			required: true,
			description: 'Domain of your Databricks workspace',
		},
		{
			displayName: 'Personal Access Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'dapixxxxxxxxxxxxxxxxxxxxxx',
			required: true,
			description: 'Databricks personal access token',
		},
	];

	// The partner User-Agent is deliberately not set here: `authenticate` is bound
	// to the credential rather than to a host, so it would also apply to arbitrary
	// URLs called with the HTTP Request node. Node requests get it from
	// databricksApiRequest() instead.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '/api/2.0/preview/scim/v2/Me',
			method: 'GET',
			headers: { 'User-Agent': databricksUserAgent() },
		},
	};
}
