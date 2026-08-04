import { AzureStorageOAuth2Api } from '../AzureStorageOAuth2Api.credentials';

describe('AzureStorageOAuth2Api Credential', () => {
	const credential = new AzureStorageOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should keep its metadata', () => {
		expect(credential.name).toBe('azureStorageOAuth2Api');
		expect(credential.extends).toEqual(['microsoftOAuth2Api']);
	});

	it('should offer custom scopes prefilled with the defaults', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe('https://storage.azure.com/.default');
	});

	it('should keep the scope hidden and default to the standard scopes when custom scopes are off', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "https://storage.azure.com/.default"}}',
		);
	});
});
