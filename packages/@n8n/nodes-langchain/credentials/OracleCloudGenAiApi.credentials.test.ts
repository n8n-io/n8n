import { OracleCloudGenAiApi } from '../OracleCloudGenAiApi.credentials';

describe('OracleCloudGenAiApi credential', () => {
	const credential = new OracleCloudGenAiApi();

	it('defines every OCI credential parameter', () => {
		expect(credential.properties.map((property) => property.name)).toEqual([
			'authentication',
			'tenancyId',
			'userId',
			'fingerprint',
			'privateKey',
			'passphrase',
			'configFilePath',
			'configProfile',
			'regionId',
			'serviceEndpoint',
		]);
	});

	it('shows the correct fields for each authentication method', () => {
		const authentication = credential.properties.find(
			(property) => property.name === 'authentication',
		);
		const authenticationMethods = authentication?.options?.flatMap((option) =>
			'value' in option ? [option.value] : [],
		);
		expect(authenticationMethods).toEqual([
			'apiKey',
			'instancePrincipal',
			'resourcePrincipal',
			'session',
		]);
		expect(authentication?.options).toContainEqual({
			name: 'Session / Config File',
			value: 'session',
		});

		for (const name of ['tenancyId', 'userId', 'fingerprint', 'privateKey', 'passphrase']) {
			expect(
				credential.properties.find((property) => property.name === name)?.displayOptions,
			).toEqual({
				show: { authentication: ['apiKey'] },
			});
		}
		for (const name of ['configFilePath', 'configProfile']) {
			expect(
				credential.properties.find((property) => property.name === name)?.displayOptions,
			).toEqual({
				show: { authentication: ['session'] },
				showOnDeployment: 'hosted',
			});
		}
	});

	it('uses safe defaults for region-derived endpoint configuration', () => {
		expect(credential.properties.find((property) => property.name === 'regionId')).toMatchObject({
			type: 'string',
			default: 'us-chicago-1',
			required: true,
		});
		expect(
			credential.properties.find((property) => property.name === 'serviceEndpoint'),
		).toMatchObject({
			displayName: 'Inference Endpoint (Advanced)',
			default: '',
			description: 'Optional. Leave empty to use the OCI endpoint for the Region ID.',
		});
	});
});
