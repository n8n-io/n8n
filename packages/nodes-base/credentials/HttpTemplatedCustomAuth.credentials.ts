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
			// Agent-authored UI metadata (input titles, help text, masking) driving
			// the guided setup form — not user-editable, so hidden in the modal.
			displayName: 'Placeholders',
			name: 'placeholderDefs',
			type: 'hidden',
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
			// Shown on AI Assistant setup surfaces; not runtime-relevant.
			displayName: 'Icon URL',
			name: 'iconUrl',
			type: 'hidden',
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
