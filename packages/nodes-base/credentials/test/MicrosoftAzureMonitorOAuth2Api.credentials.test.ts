import { MicrosoftAzureMonitorOAuth2Api } from '../MicrosoftAzureMonitorOAuth2Api.credentials';

describe('MicrosoftAzureMonitorOAuth2Api Credential', () => {
	const credential = new MicrosoftAzureMonitorOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('microsoftAzureMonitorOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
	});

	it('should offer custom scopes without a prefill, since the default is built from other fields', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe('');
	});

	it('should keep the scope hidden and build the standard scopes when custom scopes are off or left blank', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{$self["customScopes"] && $self["enabledScopes"] ? $self["enabledScopes"] : ($self["grantType"] === "clientCredentials" ? $self["resource"] + "/.default" : "")}}',
		);
	});
});
