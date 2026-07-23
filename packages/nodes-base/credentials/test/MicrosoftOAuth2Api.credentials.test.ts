import { NodeHelpers, type INodeProperties } from 'n8n-workflow';

import { MicrosoftOAuth2Api } from '../MicrosoftOAuth2Api.credentials';
import { OAuth2Api } from '../OAuth2Api.credentials';

describe('MicrosoftOAuth2Api Credential', () => {
	const microsoftOAuth2Api = new MicrosoftOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(microsoftOAuth2Api.name).toBe('microsoftOAuth2Api');
		expect(microsoftOAuth2Api.displayName).toBe('Microsoft OAuth2 API');
		expect(microsoftOAuth2Api.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = microsoftOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe(
			'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		);

		const accessTokenUrlProperty = microsoftOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toBe(
			'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		);
	});

	it('should request the Microsoft account chooser via authQueryParameters', () => {
		const authQueryParamsProperty = microsoftOAuth2Api.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.type).toBe('hidden');
		expect(authQueryParamsProperty?.default).toBe('response_mode=query&prompt=select_account');
	});

	describe('certificate authentication', () => {
		const getProperty = (name: string) =>
			microsoftOAuth2Api.properties.find((p) => p.name === name);

		it('should offer a client secret / certificate selector defaulting to client secret', () => {
			const clientCredentialType = getProperty('clientCredentialType');
			expect(clientCredentialType?.type).toBe('options');
			expect(clientCredentialType?.default).toBe('clientSecret');
			expect(clientCredentialType?.options).toEqual([
				{ name: 'Client Secret', value: 'clientSecret' },
				{ name: 'Certificate', value: 'certificate' },
			]);
		});

		it('should only show the client secret when client secret authentication is selected', () => {
			const clientSecret = getProperty('clientSecret');
			expect(clientSecret?.displayOptions?.show?.clientCredentialType).toEqual(['clientSecret']);
		});

		it('should show the private key and certificate only for certificate authentication', () => {
			for (const name of ['privateKey', 'certificate']) {
				const property = getProperty(name);
				expect(property?.required).toBe(true);
				expect(property?.displayOptions?.show?.clientCredentialType).toEqual(['certificate']);
			}
		});

		it('should render the auth block contiguously after Client ID once merged with the base', () => {
			const merged: INodeProperties[] = [];
			NodeHelpers.mergeNodeProperties(merged, new OAuth2Api().properties);
			NodeHelpers.mergeNodeProperties(merged, microsoftOAuth2Api.properties);

			const names = merged.map((p) => p.name);
			const start = names.indexOf('clientId');

			// Selector → secret → key → cert render together right after Client ID, not appended last.
			expect(names.slice(start + 1, start + 5)).toEqual([
				'clientCredentialType',
				'clientSecret',
				'privateKey',
				'certificate',
			]);
			expect(merged[start + 1].type).toBe('options');
		});
	});
});
