import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

import { PLATFORM_PROPERTIES, POD_HOSTS } from '../nodes/Qualys/transport/hosts';

/** `pod` -> gateway host, inlined into the credential test's URL expression. */
const GATEWAY_BY_POD = JSON.stringify(
	Object.fromEntries(Object.entries(POD_HOSTS).map(([pod, hosts]) => [pod, hosts.gateway])),
);

/**
 * Which gateway to authenticate against, as an n8n expression.
 *
 * A pod selects a known host; Custom takes the URL as typed and defaults to
 * HTTPS, the same way the transport resolves it. Built from `POD_HOSTS` rather
 * than written out, so the test cannot drift from the hosts the node uses.
 */
const GATEWAY_URL =
	"={{ $credentials.pod === 'custom'" +
	" ? ($credentials.baseUrl.startsWith('http')" +
	' ? $credentials.baseUrl' +
	" : 'https://' + $credentials.baseUrl)" +
	` : 'https://' + (${GATEWAY_BY_POD})[$credentials.pod] }}`;

/**
 * A Qualys API client (Auth ID Client Management). The Qualys nodes exchange
 * the client ID and secret for a token and send it on every request.
 *
 * VMDR OT and the VMDR platform API accept the client token. CyberSecurity
 * Asset Management does not accept it yet; the `qualysApi` username and
 * password credential reaches it instead.
 */
export class QualysApiClientApi implements ICredentialType {
	name = 'qualysApiClientApi';

	displayName = 'Qualys API Client API';

	icon = 'file:icons/Qualys.svg' as const;

	documentationUrl = 'qualys';

	properties: INodeProperties[] = [
		...PLATFORM_PROPERTIES,
		{
			displayName: 'Client Type',
			name: 'clientGrant',
			type: 'options',
			default: 'oidc',
			description:
				'Which kind of client this is, which decides the token endpoint. Auth ID Client Management in the Qualys UI shows which one you created.',
			options: [{ name: 'User Level (/auth/oidc)', value: 'oidc' }],
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'Client ID from Auth ID Client Management in the Qualys UI',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Requested With',
			name: 'requestedWith',
			type: 'string',
			default: 'n8n application',
			description:
				'Sent as the X-Requested-With header on platform API requests. Qualys requires it; the value is arbitrary.',
		},
	];

	/**
	 * Requests a token the same way the node does, so a wrong client type or a
	 * bad secret fails in the credential dialog, not on the first run.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: GATEWAY_URL,
			url: "={{ '/auth/' + $credentials.clientGrant }}",
			method: 'POST',
			headers: {
				clientId: '={{ $credentials.clientId }}',
				clientSecret: '={{ $credentials.clientSecret }}',
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: '',
		},
	};
}
