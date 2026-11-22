import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import type {
	ICredentialTestFunction,
	ICredentialType,
	INode,
	INodeProperties,
} from 'n8n-workflow';

// Shared with the node's request helper so the credential test and the node
// request path cannot drift. Credential → node-directory import precedent:
// AzureStorageSharedKeyApi.credentials.ts (see PR description).
import { getJotFormBaseUrl } from '../nodes/JotForm/GenericFunctions';

// `getJotFormBaseUrl` reports errors via `NodeOperationError`, which requires an
// `INode` for its error context. The credential test runs outside any node, so
// pass a synthetic one. Safe because `NodeError` only stores the node and never
// reads its fields (verified: packages/workflow/src/errors/abstract/node.error.ts).
const testNode = {
	id: 'jotform-test-node',
	name: 'JotForm',
	type: 'n8n-nodes-base.jotFormTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} satisfies INode;

export class JotFormApi implements ICredentialType {
	name = 'jotFormApi';

	displayName = 'JotForm API';

	documentationUrl = 'jotform';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Domain',
			name: 'apiDomain',
			type: 'options',
			options: [
				{
					name: 'api.jotform.com',
					value: 'api.jotform.com',
				},
				{
					name: 'eu-api.jotform.com',
					value: 'eu-api.jotform.com',
				},
				{
					name: 'hipaa-api.jotform.com',
					value: 'hipaa-api.jotform.com',
				},
				{
					name: 'Custom (Enterprise)',
					value: 'custom',
				},
			],
			default: 'api.jotform.com',
			description:
				'The API domain to use. Use "eu-api.jotform.com" if your account is based in Europe. Choose "Custom" for JotForm Enterprise.',
		},
		{
			displayName: 'Custom API Domain',
			name: 'customApiDomain',
			type: 'string',
			default: '',
			placeholder: 'your-subdomain.jotform.com/API',
			displayOptions: {
				show: {
					apiDomain: ['custom'],
				},
			},
			description:
				'Your JotForm Enterprise API base URL, for example "your-subdomain.jotform.com/API". Do not include the protocol.',
		},
	];

	// The domain selection, normalization and validation live in the node's
	// `getJotFormBaseUrl`, so the node and the credential test cannot drift. This
	// mirrors the ServiceNow Basic Auth credential's function-based test.
	test: ICredentialTestFunction = async function (credential) {
		let baseUrl: string;
		try {
			baseUrl = getJotFormBaseUrl(credential.data ?? {}, testNode);
		} catch (error) {
			return { status: 'Error', message: ensureError(error).message };
		}

		try {
			const response: unknown = await this.helpers.request({
				method: 'GET',
				uri: `${baseUrl}/user`,
				headers: {
					APIKEY: String(credential.data?.apiKey ?? ''),
				},
				json: true,
				simple: false,
				resolveWithFullResponse: true,
			});

			if (isRecord(response) && typeof response.statusCode === 'number') {
				const { statusCode } = response;
				if (statusCode >= 200 && statusCode < 300) {
					return { status: 'OK', message: 'Connection successful!' };
				}

				return {
					status: 'Error',
					message:
						statusCode === 401 || statusCode === 403
							? 'Authentication failed. Check your API key.'
							: `Connection failed. JotForm returned HTTP ${statusCode}. Check your API domain and try again.`,
				};
			}
		} catch (error) {
			return {
				status: 'Error',
				message: `Connection failed: ${ensureError(error).message}. Check your JotForm API domain and API key.`,
			};
		}

		return {
			status: 'Error',
			message: 'Connection failed. Check your JotForm API domain and API key.',
		};
	};
}
