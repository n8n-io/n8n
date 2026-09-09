/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-documentation-url-missing */
import type { IAuthenticate, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

import { applyTemplatedAuth } from '../utils/templated-auth';

export class HttpTemplatedCustomAuth implements ICredentialType {
	name = 'httpTemplatedCustomAuth';

	// Display-only name; the internal id stays `httpTemplatedCustomAuth` (it is
	// persisted in credentials, recipes and the workflow-sdk type unions).
	displayName = 'Simplified Custom Auth';

	// No documentationUrl on purpose: the generic HTTP Request docs don't cover
	// this type, and setting one makes the credential modal render a docs
	// banner — the guided form and the AI Assistant handle setup help instead.

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
				resolveCredentialJsonLeaves: true,
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
				'Provider page where the user creates/copies the secret (e.g. the API-keys dashboard). The AI Assistant help thread points the user there.',
			default: '',
		},
		{
			// Machine-readable service identity: the credential type is shared by
			// every service, so setup surfaces need this to offer a credential only
			// to nodes calling the same service. The name field stays the human layer.
			displayName: 'Service Host',
			name: 'serviceHost',
			type: 'string',
			description:
				'Host of the API this credential authenticates against (e.g. api.pexels.com). Setup surfaces only offer this credential to nodes calling the same host (subdomains match). Set from the recipe when the credential is created; when empty, the credential is never offered automatically.',
			placeholder: 'api.pexels.com',
			default: '',
		},
		{
			displayName: 'Service Origin',
			name: 'serviceOrigin',
			type: 'string',
			description:
				'Exact API origin used for credential verification. Set from the workflow when the credential is created.',
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
		const authenticatedRequestOptions = { ...requestOptions };
		applyTemplatedAuth(credentials, authenticatedRequestOptions);
		return await Promise.resolve(authenticatedRequestOptions);
	};
}
