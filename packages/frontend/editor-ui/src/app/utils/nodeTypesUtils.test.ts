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

// Mirrors the real HTTP Request node's property declarations for the auth-type
// selector parameters (see packages/nodes-base/nodes/HttpRequest/V3/Description.ts):
// nodeCredentialType and genericAuthType are only displayed for one `authentication`
// value each, but their stored value isn't cleared when they become hidden.
const httpRequestNodeTypeWithAuthProperties: INodeTypeDescription = {
	...httpRequestNodeType,
	properties: [
		{
			displayName: 'Credential Type',
			name: 'nodeCredentialType',
			type: 'credentialsSelect',
			default: '',
			credentialTypes: ['extends:oAuth2Api'],
			displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
		},
		{
			displayName: 'Generic Auth Type',
			name: 'genericAuthType',
			type: 'credentialsSelect',
			default: '',
			credentialTypes: ['has:genericAuth'],
			displayOptions: { show: { authentication: ['genericCredentialType'] } },
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

		it('should mark a stale generic auth credential inactive after switching to a predefined credential type, even though genericAuthType still holds its old value', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
					// Left over from before the user switched authentication away from
					// 'genericCredentialType'; no longer displayed, but still stored.
					genericAuthType: 'httpBasicAuth',
				},
				credentials: {
					slackApi: { id: '123', name: 'Slack' },
					httpBasicAuth: { id: '456', name: 'Stale Basic Auth' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeTypeWithAuthProperties)).toEqual([
				'httpBasicAuth',
			]);
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

		it('should clean up a stale credential despite an expression left in a hidden selector', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
					// Hidden, so its expression resolves to nothing and must not block cleanup
					genericAuthType: '={{ $json.authType }}',
				},
				credentials: {
					slackApi: { id: '123', name: 'Slack' },
					httpBasicAuth: { id: '456', name: 'Stale Basic Auth' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeTypeWithAuthProperties)).toEqual([
				'httpBasicAuth',
			]);
		});

		it('should keep a declared ssl credential whose ssl toggle is off', () => {
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
					provideSslCertificates: false,
				},
				credentials: {
					slackApi: { id: '123', name: 'Slack' },
					// Turning the SSL setting off hides this credential, but it is parallel to
					// the auth credential rather than an alternative to it, so switching auth
					// types must not throw the binding away.
					httpSslAuth: { id: '456', name: 'SSL Cert' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestNodeTypeWithAuthProperties)).toEqual([]);
		});

		it('should still remove a hidden declared credential that the auth mode governs', () => {
			// HTTP Request v2 still declares the v1-era generic types, gated on
			// `authentication` values its current options can never hold.
			const httpRequestV2NodeType: INodeTypeDescription = {
				...httpRequestNodeTypeWithAuthProperties,
				credentials: [
					{
						name: 'httpBasicAuth',
						required: true,
						displayOptions: { show: { authentication: ['httpBasicAuth'] } },
					},
					{
						name: 'httpSslAuth',
						required: true,
						displayOptions: { show: { provideSslCertificates: [true] } },
					},
				],
			};

			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: '123', name: 'Header Auth' },
					httpBasicAuth: { id: '456', name: 'Stale Basic Auth' },
				},
			});

			expect(getInactiveCredentials(node, httpRequestV2NodeType)).toEqual(['httpBasicAuth']);
		});

		it('should not exempt declared credentials for nodes that do not select types by parameter', () => {
			// The carve-out is scoped to the parameter-selected path; ordinary nodes keep
			// matching the save-time display filter, which drops hidden credentials.
			const resourceGatedNodeType: INodeTypeDescription = {
				...nodeTypeDefaults,
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				credentials: [{ name: 'legacyApi', displayOptions: { show: { resource: ['user'] } } }],
			};

			const node = makeNode({
				parameters: { resource: 'channel' },
				credentials: { legacyApi: { id: '123', name: 'Legacy' } },
			});

			expect(getInactiveCredentials(node, resourceGatedNodeType)).toEqual(['legacyApi']);
		});
	});
});
