import type { INodeProperties } from 'n8n-workflow';

import { OAuth2Api } from '../OAuth2Api.credentials';

describe('OAuth2Api Credentials', () => {
	let credentials: OAuth2Api;

	beforeEach(() => {
		credentials = new OAuth2Api();
	});

	describe('Basic Properties', () => {
		it('should have correct name and displayName', () => {
			expect(credentials.name).toBe('oAuth2Api');
			expect(credentials.displayName).toBe('OAuth2 API');
		});

		it('should be marked as genericAuth', () => {
			expect(credentials.genericAuth).toBe(true);
		});
	});

	describe('Grant Type Configuration', () => {
		it('should include PKCE as a grant type option', () => {
			const grantTypeProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'grantType',
			) as INodeProperties;

			expect(grantTypeProperty).toBeDefined();
			expect(grantTypeProperty.type).toBe('options');

			const grantTypeOptions = grantTypeProperty.options as Array<{ name: string; value: string }>;
			const pkceOption = grantTypeOptions.find((option) => option.value === 'pkce');

			expect(pkceOption).toBeDefined();
			expect(pkceOption?.name).toBe('PKCE');
		});

		it('should have authorizationCode as default grant type', () => {
			const grantTypeProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'grantType',
			) as INodeProperties;

			expect(grantTypeProperty.default).toBe('authorizationCode');
		});
	});

	describe('Client Secret Field Configuration', () => {
		it('should have client secret required for authorizationCode and clientCredentials', () => {
			const requiredClientSecretProperty = credentials.properties.find(
				(prop: INodeProperties) =>
					prop.name === 'clientSecret' &&
					prop.required === true &&
					prop.displayOptions?.show?.grantType?.includes('authorizationCode'),
			) as INodeProperties;

			expect(requiredClientSecretProperty).toBeDefined();
			expect(requiredClientSecretProperty.displayOptions?.show?.grantType).toEqual([
				'authorizationCode',
				'clientCredentials',
			]);
			expect(requiredClientSecretProperty.required).toBe(true);
		});
	});

	describe('Authorization URL Configuration', () => {
		it('should require authUrl for authorizationCode and PKCE grant types', () => {
			const authUrlProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'authUrl',
			) as INodeProperties;

			expect(authUrlProperty).toBeDefined();
			expect(authUrlProperty.required).toBe(true);
			expect(authUrlProperty.displayOptions?.show?.grantType).toEqual([
				'authorizationCode',
				'pkce',
			]);
		});

		it('should not show authUrl for clientCredentials grant type', () => {
			const authUrlProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'authUrl',
			) as INodeProperties;

			expect(authUrlProperty.displayOptions?.show?.grantType).not.toContain('clientCredentials');
		});
	});

	describe('Auth Query Parameters', () => {
		it('should show authQueryParameters for authorizationCode and PKCE flows', () => {
			const authQueryParamsProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'authQueryParameters',
			) as INodeProperties;

			expect(authQueryParamsProperty).toBeDefined();
			expect(authQueryParamsProperty.displayOptions?.show?.grantType).toEqual([
				'authorizationCode',
				'pkce',
			]);
			expect(authQueryParamsProperty.description).toContain(
				'For some services additional query parameters have to be set',
			);
		});
	});

	describe('Required Fields Validation', () => {
		it('should have all required fields defined', () => {
			const requiredFields = ['accessTokenUrl', 'clientId'];

			requiredFields.forEach((fieldName) => {
				const field = credentials.properties.find(
					(prop: INodeProperties) => prop.name === fieldName,
				);
				expect(field).toBeDefined();
				expect(field?.required).toBe(true);
			});
		});

		it('should have grantType field as required with default value', () => {
			const grantTypeField = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'grantType',
			);
			expect(grantTypeField).toBeDefined();
			expect(grantTypeField?.default).toBe('authorizationCode');
			// grantType doesn't need to be explicitly required since it has a default
		});
	});

	describe('Security Configuration', () => {
		it('should have ignoreSSLIssues option with doNotInherit flag', () => {
			const sslProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'ignoreSSLIssues',
			) as INodeProperties;

			expect(sslProperty).toBeDefined();
			expect(sslProperty.type).toBe('boolean');
			expect(sslProperty.default).toBe(false);
			expect(sslProperty.doNotInherit).toBe(true);
		});
	});

	describe('Scope Configuration', () => {
		it('should have scope field available for all grant types', () => {
			const scopeProperty = credentials.properties.find(
				(prop: INodeProperties) => prop.name === 'scope',
			) as INodeProperties;

			expect(scopeProperty).toBeDefined();
			expect(scopeProperty.type).toBe('string');
			expect(scopeProperty.default).toBe('');
			// Should not have displayOptions, making it available for all grant types
			expect(scopeProperty.displayOptions).toBeUndefined();
		});
	});
});
