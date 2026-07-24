import { describe, it, expect } from 'vitest';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { getInactiveCredentials } from './nodeTypesUtils';
import type { INodeUi } from '@/Interface';

const nodeDefaults = {
	id: '1',
	position: [0, 0] as [number, number],
	typeVersion: 1,
};

const nodeTypeDefaults = {
	group: ['transform' as const],
	version: 1,
	description: '',
	defaults: { name: '' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

// Mirrors how the HTTP Request node declares credentials: only httpSslAuth is in the
// node type description; generic/predefined auth types come from the genericAuthType
// and nodeCredentialType parameters.
const httpRequestNodeType: INodeTypeDescription = {
	...nodeTypeDefaults,
	displayName: 'HTTP Request',
	name: 'n8n-nodes-base.httpRequest',
	credentials: [
		{
			name: 'httpSslAuth',
			required: true,
			displayOptions: { show: { provideSslCertificates: [true] } },
		},
	],
};

const declaredCredentialsNodeType: INodeTypeDescription = {
	...nodeTypeDefaults,
	displayName: 'Test Node',
	name: 'n8n-nodes-base.testNode',
	credentials: [
		{
			name: 'httpBasicAuth',
			displayOptions: { show: { authentication: ['basicAuth'] } },
		},
		{
			name: 'httpOAuth2',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			name: 'alwaysActiveApi',
		},
	],
};

function makeNode(overrides: Partial<INodeUi>): INodeUi {
	return {
		...nodeDefaults,
		name: 'Test Node',
		type: 'n8n-nodes-base.testNode',
		parameters: {},
		...overrides,
	};
}

describe('nodeTypesUtils', () => {
	describe('getInactiveCredentials', () => {
		it('should return empty array when node has no credentials', () => {
			const node = makeNode({ parameters: { authentication: 'basicAuth' } });

			expect(getInactiveCredentials(node, declaredCredentialsNodeType)).toEqual([]);
		});

		it('should return empty array when node type is unknown', () => {
			const node = makeNode({
				parameters: { authentication: 'oauth2' },
				credentials: { httpBasicAuth: { id: '123', name: 'Basic Auth' } },
			});

			expect(getInactiveCredentials(node, null)).toEqual([]);
		});

		it('should mark a credential inactive when its displayOptions no longer match', () => {
			const node = makeNode({
				parameters: { authentication: 'oauth2' },
				credentials: {
					httpBasicAuth: { id: '123', name: 'Basic Auth' },
					httpOAuth2: { id: '456', name: 'OAuth2' },
				},
			});

			expect(getInactiveCredentials(node, declaredCredentialsNodeType)).toEqual(['httpBasicAuth']);
		});

		it('should keep displayed credentials and those without displayOptions (always active)', () => {
			const node = makeNode({
				parameters: { authentication: 'basicAuth' },
				credentials: {
					httpBasicAuth: { id: '123', name: 'Basic Auth' },
					alwaysActiveApi: { id: '456', name: 'Always Active' },
				},
			});

			expect(getInactiveCredentials(node, declaredCredentialsNodeType)).toEqual([]);
		});

		it('should mark a credential inactive when it is not declared by the node type', () => {
			const node = makeNode({
				parameters: { authentication: 'oauth2' },
				credentials: {
					oldDeprecatedAuth: { id: '123', name: 'Old Auth' },
					httpOAuth2: { id: '456', name: 'OAuth2' },
				},
			});

			expect(getInactiveCredentials(node, declaredCredentialsNodeType)).toEqual([
				'oldDeprecatedAuth',
			]);
		});

		it('should mark the previous generic auth credential inactive after switching genericAuthType', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpQueryAuth: { id: '123', name: 'Query Auth' },
					httpHeaderAuth: { id: '456', name: 'Header Auth' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeType)).toEqual(['httpQueryAuth']);
		});

		it('should mark the generic auth credential inactive after switching to a predefined credential type', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
				},
				credentials: {
					httpQueryAuth: { id: '123', name: 'Query Auth' },
					slackApi: { id: '456', name: 'Slack' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeType)).toEqual(['httpQueryAuth']);
		});

		it('should keep an active declared ssl credential alongside a generic auth credential', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					provideSslCertificates: true,
				},
				credentials: {
					httpBearerAuth: { id: '123', name: 'Bearer' },
					httpSslAuth: { id: '456', name: 'SSL Cert' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeType)).toEqual([]);
		});

		it('should keep all credentials when genericAuthType is an expression', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: '={{ $json.authType }}',
				},
				credentials: {
					httpQueryAuth: { id: '123', name: 'Query Auth' },
					httpHeaderAuth: { id: '456', name: 'Header Auth' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeType)).toEqual([]);
		});

		it('should keep all credentials when nodeCredentialType is an expression', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: '={{ $json.credType }}',
				},
				credentials: {
					slackApi: { id: '123', name: 'Slack' },
					githubApi: { id: '456', name: 'GitHub' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeType)).toEqual([]);
		});
	});
});
