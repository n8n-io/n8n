import { MicrosoftAzureMonitorOAuth2Api } from '../MicrosoftAzureMonitorOAuth2Api.credentials';

describe('MicrosoftAzureMonitorOAuth2Api Credential', () => {
	const credential = new MicrosoftAzureMonitorOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('microsoftAzureMonitorOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
	});

	it('should offer custom scopes prefilled with the default as a placeholder token', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe('{resource}/.default');
	});

	it('should keep the scope hidden, substituting the token and falling back to the defaults when custom scopes are off, cleared, or untouched', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{(($self["customScopes"] && $self["enabledScopes"] && $self["enabledScopes"] !== "{resource}/.default") ? $self["enabledScopes"] : ($self["grantType"] === "clientCredentials" ? "{resource}/.default" : "")).replace(/\\{resource\\}/g, $self["resource"])}}',
		);
	});
});
