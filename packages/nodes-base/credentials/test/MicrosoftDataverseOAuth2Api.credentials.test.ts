// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { INodeProperties } from 'n8n-workflow';

import { MicrosoftDataverseOAuth2Api } from '../MicrosoftDataverseOAuth2Api.credentials';

describe('MicrosoftDataverseOAuth2Api Credential', () => {
	const credential = new MicrosoftDataverseOAuth2Api();

	const propertyNamed = (name: string): INodeProperties | undefined =>
		credential.properties.find((property) => property.name === name);

	describe('metadata', () => {
		it('has the correct static metadata', () => {
			expect(credential.name).toBe('microsoftDataverseOAuth2Api');
			expect(credential.extends).toEqual(['oAuth2Api']);
			expect(credential.displayName).toBe('Microsoft Dataverse OAuth2 API');
			expect(credential.documentationUrl).toBe(
				'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/authenticate-oauth',
			);
		});
	});

	describe('static property defaults', () => {
		it('offers exactly the two supported grant types and defaults to authorization code', () => {
			const grantType = propertyNamed('grantType');
			expect(grantType?.type).toBe('options');
			expect(grantType?.default).toBe('authorizationCode');
			expect(grantType?.options?.map((o) => ('value' in o ? o.value : ''))).toEqual([
				'authorizationCode',
				'clientCredentials',
			]);
		});

		it('requires the tenant ID and defaults it to "common"', () => {
			const tenantId = propertyNamed('tenantId');
			expect(tenantId?.type).toBe('string');
			expect(tenantId?.default).toBe('common');
			expect(tenantId?.required).toBe(true);
		});

		it('requires a URL-validated environment URL with no default', () => {
			const environmentUrl = propertyNamed('environmentUrl');
			expect(environmentUrl?.type).toBe('string');
			expect(environmentUrl?.default).toBe('');
			expect(environmentUrl?.required).toBe(true);
			expect(environmentUrl?.validateType).toBe('url');
		});

		it('sends authentication via the header', () => {
			const authentication = propertyNamed('authentication');
			expect(authentication?.type).toBe('hidden');
			expect(authentication?.default).toBe('header');
		});

		it('has empty auth URI query parameters', () => {
			const authQueryParameters = propertyNamed('authQueryParameters');
			expect(authQueryParameters?.type).toBe('hidden');
			expect(authQueryParameters?.default).toBe('');
		});
	});

	describe('$self expressions', () => {
		it('derives the authorization URL from the tenant ID', () => {
			expect(propertyNamed('authUrl')?.default).toBe(
				'={{ "https://login.microsoftonline.com/" + $self["tenantId"] + "/oauth2/v2.0/authorize" }}',
			);
		});

		it('derives the access token URL from the tenant ID', () => {
			expect(propertyNamed('accessTokenUrl')?.default).toBe(
				'={{ "https://login.microsoftonline.com/" + $self["tenantId"] + "/oauth2/v2.0/token" }}',
			);
		});

		it('adds offline_access only for the authorization code flow', () => {
			// Client Credentials must omit offline_access — Entra rejects it with AADSTS70011.
			expect(propertyNamed('scope')?.default).toBe(
				'={{ $self["environmentUrl"] + "/.default" + ($self["grantType"] === "clientCredentials" ? "" : " offline_access") }}',
			);
		});
	});
});
