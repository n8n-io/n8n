import { Container } from '@n8n/di';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';

import { extractSharedFields } from '../shared-fields';

describe('extractSharedFields', () => {
	describe('with only static fields', () => {
		it('should return all fields when none are marked as resolvable', () => {
			const credentialType: ICredentialType = {
				name: 'testCredential',
				displayName: 'Test Credential',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
					{ name: 'domain', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['clientId', 'clientSecret', 'domain']);
		});

		it('should return all fields when resolvableField is explicitly false', () => {
			const credentialType: ICredentialType = {
				name: 'testCredential',
				displayName: 'Test Credential',
				properties: [
					{ name: 'clientId', type: 'string', default: '', resolvableField: false },
					{ name: 'clientSecret', type: 'string', default: '', resolvableField: false },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['clientId', 'clientSecret']);
		});
	});

	describe('with only resolvable fields', () => {
		it('should return empty array when all fields are marked as resolvable', () => {
			const credentialType: ICredentialType = {
				name: 'httpBasicAuth',
				displayName: 'HTTP Basic Auth',
				properties: [
					{ name: 'user', type: 'string', default: '', resolvableField: true },
					{ name: 'password', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual([]);
		});
	});

	describe('with mixed fields', () => {
		it('should return only non-resolvable fields in mixed scenario', () => {
			const credentialType: ICredentialType = {
				name: 'oauth2Credential',
				displayName: 'OAuth2 Credential',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
					{ name: 'accessToken', type: 'string', default: '', resolvableField: true },
					{ name: 'refreshToken', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['clientId', 'clientSecret']);
		});

		it('should handle multiple static fields between resolvable ones', () => {
			const credentialType: ICredentialType = {
				name: 'complexCredential',
				displayName: 'Complex Credential',
				properties: [
					{ name: 'staticField1', type: 'string', default: '' },
					{ name: 'dynamicField1', type: 'string', default: '', resolvableField: true },
					{ name: 'staticField2', type: 'string', default: '' },
					{ name: 'dynamicField2', type: 'string', default: '', resolvableField: true },
					{ name: 'staticField3', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['staticField1', 'staticField2', 'staticField3']);
		});
	});

	describe('edge cases', () => {
		it('should return empty array when credential has no properties', () => {
			const credentialType: ICredentialType = {
				name: 'emptyCredential',
				displayName: 'Empty Credential',
				properties: [],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual([]);
		});

		it('should handle credentials with single field', () => {
			const credentialType: ICredentialType = {
				name: 'singleFieldCredential',
				displayName: 'Single Field Credential',
				properties: [{ name: 'apiKey', type: 'string', default: '' }] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['apiKey']);
		});

		it('should handle credentials with single resolvable field', () => {
			const credentialType: ICredentialType = {
				name: 'singleResolvableCredential',
				displayName: 'Single Resolvable Credential',
				properties: [
					{ name: 'token', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual([]);
		});
	});

	describe('real-world credential examples', () => {
		it('should correctly handle HttpBasicAuth credentials', () => {
			const credentialType: ICredentialType = {
				name: 'httpBasicAuth',
				displayName: 'HTTP Basic Auth',
				properties: [
					{ name: 'user', type: 'string', default: '', resolvableField: true },
					{ name: 'password', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual([]);
		});

		it('should correctly handle HttpBearerAuth credentials', () => {
			const credentialType: ICredentialType = {
				name: 'httpBearerAuth',
				displayName: 'HTTP Bearer Auth',
				properties: [
					{ name: 'token', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual([]);
		});

		it('should correctly handle OAuth2 credentials with mixed fields', () => {
			const credentialType: ICredentialType = {
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
					{ name: 'authUrl', type: 'string', default: '' },
					{ name: 'accessTokenUrl', type: 'string', default: '' },
					{ name: 'scope', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			// All OAuth2 config fields should be static
			// accessToken/refreshToken would come from resolver (not in schema)
			expect(result).toEqual(['clientId', 'clientSecret', 'authUrl', 'accessTokenUrl', 'scope']);
		});

		it('should correctly handle ZulipApi credentials', () => {
			const credentialType: ICredentialType = {
				name: 'zulipApi',
				displayName: 'Zulip API',
				properties: [
					{ name: 'url', type: 'string', default: '' },
					{ name: 'email', type: 'string', default: '', resolvableField: true },
					{ name: 'apiKey', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['url']);
		});
	});

	describe('field order preservation', () => {
		it('should preserve the order of fields in the result', () => {
			const credentialType: ICredentialType = {
				name: 'orderedCredential',
				displayName: 'Ordered Credential',
				properties: [
					{ name: 'fieldA', type: 'string', default: '' },
					{ name: 'fieldB', type: 'string', default: '', resolvableField: true },
					{ name: 'fieldC', type: 'string', default: '' },
					{ name: 'fieldD', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['fieldA', 'fieldC', 'fieldD']);
		});
	});

	describe('credential hierarchy with extends', () => {
		let mockCredentialTypes: jest.Mocked<CredentialTypes>;

		beforeEach(() => {
			mockCredentialTypes = {
				getByName: jest.fn(),
			} as unknown as jest.Mocked<CredentialTypes>;

			jest.spyOn(Container, 'get').mockReturnValue(mockCredentialTypes);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should merge properties from single parent credential', () => {
			const parentCredential: ICredentialType = {
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				extends: ['oAuth2Api'],
				properties: [
					{ name: 'scope', type: 'string', default: '' },
					{ name: 'authUrl', type: 'string', default: '' },
				] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'oAuth2Api') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			expect(result).toEqual(['clientId', 'clientSecret', 'scope', 'authUrl']);
			expect(mockCredentialTypes.getByName).toHaveBeenCalledWith('oAuth2Api');
		});

		it('should merge properties from multi-level hierarchy', () => {
			const grandparentCredential: ICredentialType = {
				name: 'httpAuth',
				displayName: 'HTTP Auth',
				properties: [{ name: 'url', type: 'string', default: '' }] as INodeProperties[],
			};

			const parentCredential: ICredentialType = {
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				extends: ['httpAuth'],
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				extends: ['oAuth2Api'],
				properties: [
					{ name: 'scope', type: 'string', default: '' },
					{ name: 'authUrl', type: 'string', default: '' },
				] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'httpAuth') return grandparentCredential;
				if (name === 'oAuth2Api') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			expect(result).toEqual(['url', 'clientId', 'clientSecret', 'scope', 'authUrl']);
			expect(mockCredentialTypes.getByName).toHaveBeenCalledWith('oAuth2Api');
			expect(mockCredentialTypes.getByName).toHaveBeenCalledWith('httpAuth');
		});

		it('should handle property overriding in child credentials', () => {
			const parentCredential: ICredentialType = {
				name: 'baseApi',
				displayName: 'Base API',
				properties: [
					{ name: 'url', type: 'string', default: 'https://api.example.com' },
					{ name: 'timeout', type: 'number', default: 30 },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'customApi',
				displayName: 'Custom API',
				extends: ['baseApi'],
				properties: [
					{ name: 'url', type: 'string', default: 'https://custom.example.com' }, // Override
					{ name: 'apiKey', type: 'string', default: '' },
				] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'baseApi') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			// url should appear only once (overridden by child), at parent's original position
			expect(result).toEqual(['url', 'timeout', 'apiKey']);
			expect(result.filter((field) => field === 'url')).toHaveLength(1);
		});

		it('should handle mixed resolvable fields across hierarchy', () => {
			const parentCredential: ICredentialType = {
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
					{ name: 'accessToken', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				extends: ['oAuth2Api'],
				properties: [
					{ name: 'scope', type: 'string', default: '' },
					{ name: 'refreshToken', type: 'string', default: '', resolvableField: true },
				] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'oAuth2Api') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			// Only non-resolvable fields from both parent and child
			expect(result).toEqual(['clientId', 'clientSecret', 'scope']);
			expect(result).not.toContain('accessToken');
			expect(result).not.toContain('refreshToken');
		});

		it('should handle doNotInherit flag correctly', () => {
			const parentCredential: ICredentialType = {
				name: 'baseApi',
				displayName: 'Base API',
				properties: [
					{ name: 'url', type: 'string', default: '' },
					{ name: 'internalField', type: 'string', default: '', doNotInherit: true },
					{ name: 'timeout', type: 'number', default: 30 },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'customApi',
				displayName: 'Custom API',
				extends: ['baseApi'],
				properties: [{ name: 'apiKey', type: 'string', default: '' }] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'baseApi') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			// internalField should not be inherited
			expect(result).toEqual(['url', 'timeout', 'apiKey']);
			expect(result).not.toContain('internalField');
		});

		it('should handle multiple parent types (multiple extends)', () => {
			const authCredential: ICredentialType = {
				name: 'authBase',
				displayName: 'Auth Base',
				properties: [
					{ name: 'username', type: 'string', default: '' },
					{ name: 'password', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const httpCredential: ICredentialType = {
				name: 'httpBase',
				displayName: 'HTTP Base',
				properties: [
					{ name: 'url', type: 'string', default: '' },
					{ name: 'timeout', type: 'number', default: 30 },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'combinedApi',
				displayName: 'Combined API',
				extends: ['authBase', 'httpBase'],
				properties: [{ name: 'apiKey', type: 'string', default: '' }] as INodeProperties[],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'authBase') return authCredential;
				if (name === 'httpBase') return httpCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			// Should include fields from both parents
			expect(result).toEqual(['username', 'password', 'url', 'timeout', 'apiKey']);
		});

		it('should handle empty extends array', () => {
			const credentialType: ICredentialType = {
				name: 'simpleApi',
				displayName: 'Simple API',
				extends: [],
				properties: [{ name: 'apiKey', type: 'string', default: '' }] as INodeProperties[],
			};

			const result = extractSharedFields(credentialType);

			expect(result).toEqual(['apiKey']);
			expect(mockCredentialTypes.getByName).not.toHaveBeenCalled();
		});

		it('should handle credential with no properties but has parent', () => {
			const parentCredential: ICredentialType = {
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				properties: [
					{ name: 'clientId', type: 'string', default: '' },
					{ name: 'clientSecret', type: 'string', default: '' },
				] as INodeProperties[],
			};

			const childCredential: ICredentialType = {
				name: 'specificOAuth2',
				displayName: 'Specific OAuth2',
				extends: ['oAuth2Api'],
				properties: [],
			};

			mockCredentialTypes.getByName.mockImplementation((name: string) => {
				if (name === 'oAuth2Api') return parentCredential;
				throw new Error(`Unknown credential type: ${name}`);
			});

			const result = extractSharedFields(childCredential);

			expect(result).toEqual(['clientId', 'clientSecret']);
		});
	});
});
