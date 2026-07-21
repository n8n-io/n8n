import { MicrosoftDynamicsOAuth2Api } from '../MicrosoftDynamicsOAuth2Api.credentials';

describe('MicrosoftDynamicsOAuth2Api Credential', () => {
	const credential = new MicrosoftDynamicsOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('microsoftDynamicsOAuth2Api');
		expect(credential.extends).toEqual(['microsoftOAuth2Api']);
	});

	it('should offer custom scopes without a prefill, since the default is built from other fields', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe('');
	});

	it('should keep the scope hidden and build the standard scopes from subdomain and region when custom scopes are off', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "openid offline_access https://" + $self["subdomain"] + "." + $self["region"] + "/.default"}}',
		);
	});
});
