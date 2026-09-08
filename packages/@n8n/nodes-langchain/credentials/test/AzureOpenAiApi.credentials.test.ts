import { AzureOpenAiApi } from '../AzureOpenAiApi.credentials';

function propertyNamedWithDisplayOptions(name: string, show: Record<string, unknown[]>) {
	return expect.objectContaining({
		name,
		displayOptions: expect.objectContaining({ show }),
	});
}

describe('AzureOpenAiApi Credential', () => {
	const azureOpenAiApi = new AzureOpenAiApi();

	it('exposes an endpointType selector defaulting to classic', () => {
		expect(azureOpenAiApi.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'endpointType',
					type: 'options',
					default: 'classic',
				}),
			]),
		);
	});

	it('gates resourceName and apiVersion behind the classic endpoint type', () => {
		expect(azureOpenAiApi.properties).toEqual(
			expect.arrayContaining([
				propertyNamedWithDisplayOptions('resourceName', { endpointType: ['classic'] }),
				propertyNamedWithDisplayOptions('apiVersion', { endpointType: ['classic'] }),
			]),
		);
	});

	it('gates the required foundry endpoint behind the foundry endpoint type', () => {
		expect(azureOpenAiApi.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'foundryEndpoint',
					required: true,
					displayOptions: expect.objectContaining({ show: { endpointType: ['foundry'] } }),
				}),
			]),
		);
	});

	it('exposes apiKey as a required field independent of endpoint type', () => {
		expect(azureOpenAiApi.properties).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'apiKey', required: true })]),
		);
	});

	it('has exactly one endpointType selector and two endpoint definitions (classic + foundry)', () => {
		const endpointTypeProps = azureOpenAiApi.properties.filter((p) => p.name === 'endpointType');
		const classicEndpointProps = azureOpenAiApi.properties.filter((p) => p.name === 'endpoint');
		const foundryEndpointProps = azureOpenAiApi.properties.filter(
			(p) => p.name === 'foundryEndpoint',
		);
		expect(endpointTypeProps).toHaveLength(1);
		expect(classicEndpointProps).toHaveLength(1);
		expect(foundryEndpointProps).toHaveLength(1);
		// Distinct field names avoid duplicate-key render glitches in the modal.
		expect(classicEndpointProps[0]).toEqual(
			expect.objectContaining({
				displayOptions: expect.objectContaining({ show: { endpointType: ['classic'] } }),
			}),
		);
		expect(foundryEndpointProps[0]).toEqual(
			expect.objectContaining({
				displayOptions: expect.objectContaining({ show: { endpointType: ['foundry'] } }),
			}),
		);
	});
});
