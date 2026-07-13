/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */
import type {
	IAuthenticate,
	ICredentialType,
	IDataObject,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

import { resolveTemplatedAuth } from '../utils/templated-auth';

export class HttpTemplatedCustomAuth implements ICredentialType {
	name = 'httpTemplatedCustomAuth';

	displayName = 'Templated Custom Auth';

	documentationUrl = 'httprequest';

	genericAuth = true;

	icon: Icon = 'node:n8n-nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'Template',
			name: 'template',
			type: 'json',
			required: true,
			description:
				'The authentication parts of the request (headers, body, qs) with {{placeholder}} markers where user-provided values are inserted. Must not contain secrets — those belong in the placeholder values.',
			placeholder: '{ "headers": { "Authorization": "Bearer {{api_key}}" } }',
			default: '',
		},
		{
			displayName: 'Placeholders',
			name: 'placeholderDefs',
			type: 'json',
			description:
				'Describes each placeholder shown to the user: name, title, help text and whether it is a secret',
			placeholder:
				'[ { "name": "api_key", "title": "API key", "info": "Found on the API keys page", "type": "password" } ]',
			default: '',
		},
		{
			displayName: 'Placeholder Values',
			name: 'placeholderValues',
			type: 'json',
			description: 'The value provided for each placeholder, by placeholder name',
			placeholder: '{ "api_key": "..." }',
			default: '',
			typeOptions: {
				redactJsonLeaves: true,
			},
		},
		{
			displayName: 'Test URL',
			name: 'testUrl',
			type: 'string',
			description: 'GET endpoint the credential can be verified against',
			default: '',
		},
		{
			// Status codes an auth probe of the test URL must not treat as a
			// rejection (e.g. services returning 401 on GET even for valid
			// credentials). Set from the AI Assistant's setup hint.
			displayName: 'Accepted Status Codes',
			name: 'acceptedStatusCodes',
			type: 'hidden',
			default: '',
		},
	];

	// Lets requestWithAuthentication consumers (auth probe, paginated requests)
	// apply the credential without the HTTP node's generic-auth branch.
	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const { headers, body, qs } = resolveTemplatedAuth(credentials);
		return await Promise.resolve({
			...requestOptions,
			...(headers && { headers: { ...requestOptions.headers, ...headers } }),
			...(body && { body: { ...(requestOptions.body as IDataObject), ...body } }),
			...(qs && { qs: { ...requestOptions.qs, ...qs } }),
		});
	};
}
