import { describe, it, expect, vi } from 'vitest';
import type { INodeTypeDescription } from 'n8n-workflow';
import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';

import { HTTP_REQUEST_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn(),
	})),
}));

import { getNodeTypeDisplayableCredentials } from './nodeTransforms';

/**
 * Minimal HTTP Request–shaped description so NodeHelpers.getNodeParameters can resolve
 * defaults and displayParameter for SSL + dynamic credential parameters.
 */
function minimalHttpRequestNodeType(): INodeTypeDescription {
	return {
		name: 'httpRequest',
		displayName: 'HTTP Request',
		version: [4.2],
		defaults: { name: 'HTTP Request' },
		inputs: ['main'],
		outputs: ['main'],
		group: ['transform'],
		description: '',
		credentials: [
			{
				name: 'httpSslAuth',
				required: true,
				displayOptions: {
					show: {
						provideSslCertificates: [true],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Provide SSL',
				name: 'provideSslCertificates',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Predefined', value: 'predefinedCredentialType' },
					{ name: 'Generic', value: 'genericCredentialType' },
				],
				default: 'none',
			},
			{
				displayName: 'Credential Type',
				name: 'nodeCredentialType',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						authentication: ['predefinedCredentialType'],
					},
				},
			},
			{
				displayName: 'Generic Auth Type',
				name: 'genericAuthType',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						authentication: ['genericCredentialType'],
					},
				},
			},
		],
	};
}

describe('getNodeTypeDisplayableCredentials (HTTP Request dynamic auth)', () => {
	const nodeType = minimalHttpRequestNodeType();
	const nodeTypeProvider = { getNodeType: () => nodeType };

	it('includes nodeCredentialType when authentication is predefinedCredentialType', () => {
		const result = getNodeTypeDisplayableCredentials(nodeTypeProvider, {
			type: HTTP_REQUEST_NODE_TYPE,
			typeVersion: 4.2,
			parameters: {
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'anthropicApi',
				provideSslCertificates: false,
			},
		});

		expect(result.map((c) => c.name)).toContain('anthropicApi');
		expect(result.map((c) => c.name)).not.toContain('httpSslAuth');
	});

	it('includes genericAuthType when authentication is genericCredentialType', () => {
		const result = getNodeTypeDisplayableCredentials(nodeTypeProvider, {
			type: HTTP_REQUEST_NODE_TYPE,
			typeVersion: 4.2,
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
				provideSslCertificates: false,
			},
		});

		expect(result.map((c) => c.name)).toEqual(['httpHeaderAuth']);
	});

	it('does not duplicate a credential type already present from static credentials', () => {
		const result = getNodeTypeDisplayableCredentials(nodeTypeProvider, {
			type: HTTP_REQUEST_NODE_TYPE,
			typeVersion: 4.2,
			parameters: {
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'httpSslAuth',
				provideSslCertificates: true,
			},
		});

		expect(result.filter((c) => c.name === 'httpSslAuth')).toHaveLength(1);
	});

	it('applies to HTTP Request Tool node types', () => {
		for (const type of [HTTP_REQUEST_TOOL_NODE_TYPE, HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE]) {
			const result = getNodeTypeDisplayableCredentials(nodeTypeProvider, {
				type,
				typeVersion: 1,
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'anthropicApi',
					provideSslCertificates: false,
				},
			});
			expect(result.map((c) => c.name)).toContain('anthropicApi');
		}
	});
});
