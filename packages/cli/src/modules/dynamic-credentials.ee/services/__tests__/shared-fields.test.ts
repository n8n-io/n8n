import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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
});
