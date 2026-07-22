import { MicrosoftDynamicsOAuth2Api } from '../MicrosoftDynamicsOAuth2Api.credentials';

describe('MicrosoftDynamicsOAuth2Api Credential', () => {
	const credential = new MicrosoftDynamicsOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('microsoftDynamicsOAuth2Api');
		expect(credential.extends).toEqual(['microsoftOAuth2Api']);
	});

	it('should offer custom scopes prefilled with the defaults as placeholder tokens', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe(
			'openid offline_access https://{subdomain}.{region}/.default',
		);
	});

	it('should keep the scope hidden, substituting the tokens and falling back to the defaults when custom scopes are off or cleared', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{(($self["customScopes"] && $self["enabledScopes"]) ? $self["enabledScopes"] : "openid offline_access https://{subdomain}.{region}/.default").replace(/\\{subdomain\\}/g, $self["subdomain"]).replace(/\\{region\\}/g, $self["region"])}}',
		);
	});
});
