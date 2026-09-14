import { MicrosoftGraphSecurityOAuth2Api } from '../MicrosoftGraphSecurityOAuth2Api.credentials';

describe('MicrosoftGraphSecurityOAuth2Api Credential', () => {
	const credential = new MicrosoftGraphSecurityOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('microsoftGraphSecurityOAuth2Api');
		expect(credential.extends).toEqual(['microsoftOAuth2Api']);
	});

	it('should offer custom scopes prefilled with the defaults', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe('SecurityEvents.ReadWrite.All offline_access');
	});

	it('should keep the scope hidden and default to the standard scopes when custom scopes are off', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "SecurityEvents.ReadWrite.All offline_access"}}',
		);
	});
});
