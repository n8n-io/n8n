import { AzureEntraCognitiveServicesOAuth2Api } from '../AzureEntraCognitiveServicesOAuth2Api.credentials';

describe('AzureEntraCognitiveServicesOAuth2Api Credential', () => {
	const credential = new AzureEntraCognitiveServicesOAuth2Api();

	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('signs in as the app, so the grant is client credentials', () => {
		expect(property('grantType')).toEqual(
			expect.objectContaining({ type: 'hidden', default: 'clientCredentials' }),
		);
	});

	it('gates an optional project field behind the foundry endpoint type', () => {
		expect(property('project')).toEqual(
			expect.objectContaining({
				type: 'string',
				default: '',
				displayOptions: expect.objectContaining({ show: { endpointType: ['foundry'] } }),
			}),
		);
		expect(property('project')?.required).toBeFalsy();
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
