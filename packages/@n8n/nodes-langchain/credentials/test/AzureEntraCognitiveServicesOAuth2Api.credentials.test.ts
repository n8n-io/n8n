import { AzureEntraCognitiveServicesOAuth2Api } from '../AzureEntraCognitiveServicesOAuth2Api.credentials';

describe('AzureEntraCognitiveServicesOAuth2Api Credential', () => {
	const credential = new AzureEntraCognitiveServicesOAuth2Api();

	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('signs in as the app, so the grant is client credentials', () => {
		expect(property('grantType')).toEqual(
			expect.objectContaining({ type: 'hidden', default: 'clientCredentials' }),
		);
	});

	it('hides the body-properties fields the node builds for itself', () => {
		expect(property('sendAdditionalBodyProperties')).toEqual(
			expect.objectContaining({ type: 'hidden' }),
		);
		expect(property('additionalBodyProperties')).toEqual(
			expect.objectContaining({ type: 'hidden' }),
		);
	});
});
