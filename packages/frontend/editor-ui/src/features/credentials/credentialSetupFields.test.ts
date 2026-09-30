import { DOMAIN_RESTRICTION_FIELDS, type INodeProperties } from 'n8n-workflow';

import { groupCredentialSetupFields } from './credentialSetupFields';

const field = (name: string, options: Partial<INodeProperties> = {}): INodeProperties => ({
	name,
	displayName: name,
	type: 'string',
	default: '',
	...options,
});

describe('groupCredentialSetupFields', () => {
	it('groups provider overrides with their enabled fields and preserves the definitions', () => {
		const fields = Object.freeze(
			[
				field('apiKey', { required: true }),
				field('url', { required: true, default: 'https://api.openai.com/v1' }),
				field('header', { type: 'boolean', default: false }),
				field('headerName', { displayOptions: { show: { header: [true] } } }),
				field('headerValue', { displayOptions: { show: { header: [true] } } }),
				...DOMAIN_RESTRICTION_FIELDS,
			].map((property) => Object.freeze(property)),
		);

		const { inline, advanced } = groupCredentialSetupFields('openAiApi', [], fields);

		expect(inline).toEqual([fields[0]]);
		expect(advanced).toEqual(fields.slice(1));
		expect(advanced[0]).toBe(fields[1]);
		expect(advanced[0].default).toBe('https://api.openai.com/v1');
	});

	it.each(['ollamaApi', 'nvidiaApi', 'unknownApi'])(
		'keeps endpoint and unknown fields inline for %s regardless of defaults or required flags',
		(credentialType) => {
			const fields = [
				field('baseUrl', { required: true, default: 'http://localhost:11434' }),
				field('url', { default: 'https://example.com' }),
				field('optionalSetting', { required: false, default: 'preset' }),
				field('header'),
			];
			expect(groupCredentialSetupFields(credentialType, [], fields)).toEqual({
				inline: fields,
				advanced: [],
			});
		},
	);

	it.each(['googleSheetsOAuth2Api', 'snowflakeOAuth2Api'])(
		'keeps OAuth modes and their setup inline and groups scope notices for %s',
		(credentialType) => {
			const core = [
				field('grantType'),
				field('serverUrl', { displayOptions: { show: { useDynamicClientRegistration: [true] } } }),
				field('clientId', { displayOptions: { show: { useDynamicClientRegistration: [false] } } }),
				field('scope'),
				field('authentication'),
			];
			const scopes = [
				field('customScopes', { type: 'boolean', default: false }),
				field('customScopesNotice', {
					type: 'notice',
					displayOptions: { show: { customScopes: [true] } },
				}),
				field('enabledScopes', { displayOptions: { show: { customScopes: [true] } } }),
			];
			const extras = [
				field('sendAdditionalBodyProperties', { type: 'boolean', default: false }),
				field('additionalBodyProperties', {
					displayOptions: { show: { sendAdditionalBodyProperties: [true] } },
				}),
				field('jweEnabled', { type: 'boolean', default: false }),
				field('jwksUri', {
					typeOptions: { copyButton: true },
					displayOptions: { show: { jweEnabled: [true] } },
				}),
			];
			const result = groupCredentialSetupFields(
				credentialType,
				['oAuth2Api'],
				[...core, ...scopes, ...extras],
			);
			const snowflake = credentialType === 'snowflakeOAuth2Api';
			expect(result.inline).toEqual(snowflake ? [...core, ...scopes] : core);
			expect(result.advanced).toEqual(snowflake ? extras : [...scopes, ...extras]);
		},
	);

	it('keeps dependent overrides together even when the controller is not visible', () => {
		const endpoint = field('s3Endpoint', { displayOptions: { show: { customEndpoints: [true] } } });
		const region = field('region', { default: 'us-east-1' });
		expect(groupCredentialSetupFields('aws', [], [region, endpoint])).toEqual({
			inline: [region],
			advanced: [endpoint],
		});
	});

	it('inherits tuning rules while leaving SSL and tunnel setup inline', () => {
		const fields = [
			field('host', { default: 'localhost' }),
			field('maxConnections', { type: 'number', default: 100 }),
			field('allowUnauthorizedCerts', { type: 'boolean', default: false }),
			field('ssl', { displayOptions: { show: { allowUnauthorizedCerts: [false] } } }),
			field('sshTunnel', { type: 'boolean', default: false }),
			field('sshHost', { displayOptions: { show: { sshTunnel: [true] } } }),
		];
		expect(
			groupCredentialSetupFields('chatHubVectorStorePGVectorApi', ['postgres'], fields),
		).toEqual({
			inline: [fields[0], ...fields.slice(3)],
			advanced: fields.slice(1, 3),
		});
	});

	it.each(['venafiTlsProtectDatacenterApi', 'postgres', 'unknownApi'])(
		'keeps enabled certificate exceptions discoverable for %s',
		(credentialType) => {
			const fields = [field('allowUnauthorizedCerts', { type: 'boolean', default: true })];
			expect(groupCredentialSetupFields(credentialType, [], fields)).toEqual({
				inline: fields,
				advanced: [],
			});
		},
	);
});
