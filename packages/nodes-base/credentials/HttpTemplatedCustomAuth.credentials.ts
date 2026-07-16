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
				'The authentication parts (headers, body, qs) added to every request this credential signs. {{placeholder}} markers are replaced with the matching entry from Placeholder Values. Must not contain secrets — those belong in the placeholder values.',
			placeholder: '{ "headers": { "Authorization": "Bearer {{api_key}}" } }',
			default: '',
		},
		{
			displayName: 'Placeholders',
			name: 'placeholderDefs',
			type: 'json',
			description:
				'Describes the input shown for each {{placeholder}}: name, user-facing title, help text, and type ("password" masks the input, "plain" does not)',
			placeholder:
				'[ { "name": "api_key", "title": "API key", "info": "Found on the API keys page", "type": "password" } ]',
			default: '',
		},
		{
			displayName: 'Placeholder Values',
			name: 'placeholderValues',
			type: 'json',
			description:
				'The secret value that replaces each {{placeholder}} of the template when a request is sent, by placeholder name. Values are redacted after saving.',
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
			description:
				'Side-effect-free GET endpoint the credential is verified against (e.g. an account or profile endpoint). Must never trigger billable work.',
			default: '',
		},
		{
			displayName: 'Documentation URL',
			name: 'docsUrl',
			type: 'string',
			description:
				'Page where the user obtains the secret (e.g. the provider\'s API-keys dashboard) — shown as the "Get it from" link on setup surfaces',
			default: '',
		},
		{
			displayName: 'Icon URL',
			name: 'iconUrl',
			type: 'string',
			description:
				"The service's logo or favicon (https), shown on setup surfaces. Falls back to the documentation URL's favicon when empty.",
			default: '',
		},
		{
			displayName: 'Accepted Status Codes',
			name: 'acceptedStatusCodes',
			type: 'string',
			description:
				'Status codes the credential test must not treat as an auth rejection, as a JSON array — e.g. [401] for services that answer 401 to a valid GET. Only 401 and 403 can ever count as rejection, so other codes are ignored.',
			placeholder: '[401]',
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
