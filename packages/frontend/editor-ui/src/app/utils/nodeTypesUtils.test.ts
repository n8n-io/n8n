import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInactiveCredentials } from './nodeTypesUtils';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';

describe('nodeTypesUtils', () => {
	describe('getInactiveCredentials', () => {
		const mockNodeHelpers = {
			displayParameter: vi.fn(),
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return empty array when node has no credentials', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'none' },
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBasicAuth',
						displayOptions: { show: { authentication: ['basicAuth'] } },
					},
				],
				properties: [],
			};

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);
			expect(result).toEqual([]);
		});

		it('should return empty array when nodeType is null', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'oauth2' },
				credentials: { httpBasicAuth: { id: '123', name: 'Basic Auth' } },
			};

			const result = getInactiveCredentials(node, null, mockNodeHelpers as any);
			expect(result).toEqual([]);
		});

		it('should identify credential as inactive when displayOptions do not match', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'oauth2' },
				credentials: { httpBasicAuth: { id: '123', name: 'Basic Auth' } },
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBasicAuth',
						displayOptions: { show: { authentication: ['basicAuth'] } },
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockReturnValue(false);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toContain('httpBasicAuth');
			expect(mockNodeHelpers.displayParameter).toHaveBeenCalledWith(
				node.parameters,
				nodeType.credentials![0],
				'',
				node,
			);
		});

		it('should not mark credential as inactive when displayOptions match', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'basicAuth' },
				credentials: { httpBasicAuth: { id: '123', name: 'Basic Auth' } },
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBasicAuth',
						displayOptions: { show: { authentication: ['basicAuth'] } },
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockReturnValue(true);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toEqual([]);
		});

		it('should preserve credentials without displayOptions (always active)', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'oauth2', provideSslCertificates: true },
				credentials: {
					httpBasicAuth: { id: '123', name: 'Basic Auth' },
					httpSslAuth: { id: '456', name: 'SSL Cert' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBasicAuth',
						displayOptions: { show: { authentication: ['basicAuth'] } },
					},
					{
						name: 'httpSslAuth',
						displayOptions: { show: { provideSslCertificates: [true] } },
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockImplementation((_params, cred) => {
				// httpBasicAuth displayOptions don't match (authentication is oauth2)
				// httpSslAuth displayOptions match (provideSslCertificates is true)
				if (cred.name === 'httpBasicAuth') {
					return false;
				}
				if (cred.name === 'httpSslAuth') {
					return true;
				}
				return false;
			});

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toContain('httpBasicAuth');
			expect(result).not.toContain('httpSslAuth'); // Should be preserved
		});

		it('should handle multiple inactive credentials', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'none' },
				credentials: {
					httpBasicAuth: { id: '123', name: 'Basic Auth' },
					httpOAuth2: { id: '456', name: 'OAuth2' },
					httpBearerAuth: { id: '789', name: 'Bearer' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
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
						name: 'httpBearerAuth',
						displayOptions: { show: { authentication: ['bearer'] } },
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockReturnValue(false);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toHaveLength(3);
			expect(result).toContain('httpBasicAuth');
			expect(result).toContain('httpOAuth2');
			expect(result).toContain('httpBearerAuth');
		});

		it('should mark credential as inactive if it no longer exists in nodeType', () => {
			const node: INodeUi = {
				id: '1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'oauth2' },
				credentials: {
					oldDeprecatedAuth: { id: '123', name: 'Old Auth' },
					httpOAuth2: { id: '456', name: 'OAuth2' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpOAuth2',
						displayOptions: { show: { authentication: ['oauth2'] } },
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockReturnValue(true);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toContain('oldDeprecatedAuth');
			expect(result).not.toContain('httpOAuth2');
		});

		it('should not mark credentials without displayOptions as inactive when displayParameter returns true', () => {
			const node: INodeUi = {
				id: '1',
				name: 'OpenAI',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					openAiApi: { id: '123', name: 'OpenAI API' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'OpenAI',
				name: 'openAi',
				group: ['transform'],
				version: 1,
				description: 'OpenAI node',
				defaults: { name: 'OpenAI' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'openAiApi',
						required: true,
						// No displayOptions - always required
					},
				],
				properties: [],
			};
			// For credentials without displayOptions, displayParameter still gets called
			// and should return true (credential is always shown)
			mockNodeHelpers.displayParameter.mockReturnValue(true);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toEqual([]);
			expect(mockNodeHelpers.displayParameter).toHaveBeenCalled();
		});

		it('should handle nodeCredentialType parameter for predefined credentials', () => {
			const node: INodeUi = {
				id: '1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 3,
				position: [0, 0],
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'openAiApi', // This explicitly activates openAiApi
				},
				credentials: {
					httpBearerAuth: { id: 'old-123', name: 'Bearer Token' },
					openAiApi: { id: 'new-456', name: 'OpenAI' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 3,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBearerAuth',
						displayOptions: {
							show: {
								authentication: ['genericCredentialType'],
							},
						},
					},
					{
						name: 'openAiApi',
						displayOptions: {
							show: {
								authentication: ['predefinedCredentialType'],
								nodeCredentialType: ['openAiApi'],
							},
						},
					},
				],
				properties: [],
			};
			// displayParameter would return false for both because displayOptions don't match
			// BUT nodeCredentialType parameter explicitly activates openAiApi
			mockNodeHelpers.displayParameter.mockReturnValue(false);

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toContain('httpBearerAuth'); // Inactive
			expect(result).not.toContain('openAiApi'); // Active due to nodeCredentialType parameter
		});

		it('should handle real-world HTTP Request scenario: switching from bearer to oauth', () => {
			const node: INodeUi = {
				id: '1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 3,
				position: [0, 0],
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					// Old credential from when it was generic auth
					httpBearerAuth: { id: 'old-123', name: 'Bearer Token' },
					// New credential after switching to predefined
					googleOAuth2Api: { id: 'new-456', name: 'Google OAuth2' },
				},
			};
			const nodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'httpRequest',
				group: ['transform'],
				version: 3,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'httpBearerAuth',
						displayOptions: {
							show: {
								authentication: ['genericCredentialType'],
								genericAuthType: ['httpBearerAuth'],
							},
						},
					},
					{
						name: 'googleOAuth2Api',
						displayOptions: {
							show: {
								authentication: ['predefinedCredentialType'],
								nodeCredentialType: ['googleOAuth2Api'],
							},
						},
					},
				],
				properties: [],
			};
			mockNodeHelpers.displayParameter.mockImplementation((_params, cred) => {
				// httpBearerAuth should not display (auth is predefinedCredentialType)
				if (cred.name === 'httpBearerAuth') {
					return false;
				}
				// googleOAuth2Api should display
				if (cred.name === 'googleOAuth2Api') {
					return true;
				}
				return false;
			});

			const result = getInactiveCredentials(node, nodeType, mockNodeHelpers as any);

			expect(result).toContain('httpBearerAuth'); // Old credential should be marked inactive
			expect(result).not.toContain('googleOAuth2Api'); // New credential should stay active
		});
	});
});
