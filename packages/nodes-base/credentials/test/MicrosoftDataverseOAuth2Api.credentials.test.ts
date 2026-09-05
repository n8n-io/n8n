import type { INodeProperties } from 'n8n-workflow';

import { DATAVERSE_API_PATH } from '../../nodes/Microsoft/Dataverse/constants';
import { MicrosoftDataverseOAuth2Api } from '../MicrosoftDataverseOAuth2Api.credentials';

describe('MicrosoftDataverseOAuth2Api Credential', () => {
	const credential = new MicrosoftDataverseOAuth2Api();

	const propertyNamed = (name: string): INodeProperties | undefined =>
		credential.properties.find((property) => property.name === name);

	describe('metadata', () => {
		it('has the correct static metadata', () => {
			expect(credential.name).toBe('microsoftDataverseOAuth2Api');
			expect(credential.extends).toEqual(['microsoftOAuth2Api']);
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

		it('offers the four national clouds and defaults to global', () => {
			const cloud = propertyNamed('cloud');
			expect(cloud?.type).toBe('options');
			expect(cloud?.default).toBe('global');
			expect(cloud?.options?.map((option) => ('value' in option ? option.value : ''))).toEqual([
				'global',
				'usgov',
				'dod',
				'china',
			]);
		});

		it('hides the inherited Microsoft Graph API base URL field', () => {
			const graphApiBaseUrl = propertyNamed('graphApiBaseUrl');
			expect(graphApiBaseUrl?.type).toBe('hidden');
		});

		it('does not override the inherited account-picker auth query parameters', () => {
			// Leaving it unset keeps the parent's `prompt=select_account`, which forces
			// the account picker and avoids silent wrong-tenant sign-in.
			expect(propertyNamed('authQueryParameters')).toBeUndefined();
		});
	});

	describe('$self expressions', () => {
		it('derives the authorization and token URLs from the national cloud and tenant ID', () => {
			expect(propertyNamed('authUrl')?.default).toBe(
				'={{ ($self["cloud"] === "china" ? "https://login.partner.microsoftonline.cn" : ($self["cloud"] === "usgov" || $self["cloud"] === "dod" ? "https://login.microsoftonline.us" : "https://login.microsoftonline.com")) + "/" + $self["tenantId"].trim() + "/oauth2/v2.0/authorize" }}',
			);
			expect(propertyNamed('accessTokenUrl')?.default).toBe(
				'={{ ($self["cloud"] === "china" ? "https://login.partner.microsoftonline.cn" : ($self["cloud"] === "usgov" || $self["cloud"] === "dod" ? "https://login.microsoftonline.us" : "https://login.microsoftonline.com")) + "/" + $self["tenantId"].trim() + "/oauth2/v2.0/token" }}',
			);
		});

		// Evaluate the login-host ternary the way n8n would, so the sovereign-cloud
		// mapping is guarded behaviorally, not just by string match.
		const loginHost = (cloud: string) =>
			cloud === 'china'
				? 'https://login.partner.microsoftonline.cn'
				: cloud === 'usgov' || cloud === 'dod'
					? 'https://login.microsoftonline.us'
					: 'https://login.microsoftonline.com';

		it.each([
			['global', 'https://login.microsoftonline.com'],
			['usgov', 'https://login.microsoftonline.us'],
			['dod', 'https://login.microsoftonline.us'],
			['china', 'https://login.partner.microsoftonline.cn'],
		])('routes %s auth to the matching sovereign login host', (cloud, expected) => {
			expect(loginHost(cloud)).toBe(expected);
		});

		it('normalizes the environment URL and adds offline_access only for the authorization code flow', () => {
			// Client Credentials must omit offline_access — Entra rejects it with AADSTS70011.
			expect(propertyNamed('scope')?.default).toBe(
				'={{ $self["environmentUrl"].trim().replace(/\\/+$/, "") + "/.default" + ($self["grantType"] === "clientCredentials" ? "" : " offline_access") }}',
			);
		});

		// Evaluate the scope expression the way n8n would, so trailing-slash
		// normalization is guarded behaviorally rather than by string match alone.
		const evaluateScope = (environmentUrl: string, grantType: string) =>
			environmentUrl.trim().replace(/\/+$/, '') +
			'/.default' +
			(grantType === 'clientCredentials' ? '' : ' offline_access');

		it.each([
			'https://yourorg.crm.dynamics.com',
			'https://yourorg.crm.dynamics.com/',
			'https://yourorg.crm.dynamics.com//',
			'  https://yourorg.crm.dynamics.com/  ',
		])('collapses trailing slashes and whitespace to a single .default scope (%s)', (input) => {
			expect(evaluateScope(input, 'authorizationCode')).toBe(
				'https://yourorg.crm.dynamics.com/.default offline_access',
			);
		});

		it('omits offline_access for the client credentials flow', () => {
			expect(evaluateScope('https://yourorg.crm.dynamics.com/', 'clientCredentials')).toBe(
				'https://yourorg.crm.dynamics.com/.default',
			);
		});
	});

	describe('credential test', () => {
		it('probes WhoAmI so setup errors surface on save', () => {
			const request = credential.test.request;
			expect(request.method).toBe('GET');
			expect(request.url).toBe('/api/data/v9.2/WhoAmI');
			expect(request.headers).toEqual({ Accept: 'application/json' });
		});

		it('keeps the test API version in sync with DATAVERSE_API_PATH', () => {
			// The test URL hardcodes the version because a credential can't idiomatically
			// import node constants; this guard fails if the two ever drift.
			expect(credential.test.request.url).toBe(`${DATAVERSE_API_PATH}/WhoAmI`);
		});

		it('normalizes the environment URL for the test base URL', () => {
			expect(credential.test.request.baseURL).toBe(
				'={{ $credentials.environmentUrl.trim().replace(/\\/+$/, "") }}',
			);
		});
	});
});
