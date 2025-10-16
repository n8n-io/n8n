import { toJsonSchema } from '@/public-api/v1/handlers/credentials/credentials.service';
import type { INodeProperties } from 'n8n-workflow';

describe('toJsonSchema', () => {
	it('should generate correct JSON Schema for JWT Auth with conditional properties', () => {
		const jwtAuthProperties: INodeProperties[] = [
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				options: [
					{ name: 'Passphrase', value: 'passphrase' },
					{ name: 'PEM Key', value: 'pemKey' },
				],
				default: 'passphrase',
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				displayOptions: {
					show: {
						keyType: ['passphrase'],
					},
				},
				required: true,
			},
			{
				displayName: 'Private Key',
				name: 'privateKey',
				type: 'string',
				displayOptions: {
					show: {
						keyType: ['pemKey'],
					},
				},
			},
			{
				displayName: 'Public Key',
				name: 'publicKey',
				type: 'string',
				displayOptions: {
					show: {
						keyType: ['pemKey'],
					},
				},
			},
			{
				displayName: 'Algorithm',
				name: 'algorithm',
				type: 'options',
				default: 'HS256',
				options: [
					{ name: 'HS256', value: 'HS256' },
					{ name: 'RS256', value: 'RS256' },
				],
			},
		];

		const schema = toJsonSchema(jwtAuthProperties);

		// Verify basic structure
		expect(schema.type).toBe('object');
		expect(schema.additionalProperties).toBe(false);
		expect(schema.properties).toBeDefined();
		expect(schema.allOf).toBeDefined();

		// Verify unconditional properties
		expect(schema.properties.keyType).toEqual({
			type: 'string',
			enum: ['passphrase', 'pemKey'],
		});
		expect(schema.properties.algorithm).toEqual({
			type: 'string',
			enum: ['HS256', 'RS256'],
		});

		// Verify conditional properties structure
		expect(schema.allOf).toHaveLength(2);

		// Check passphrase condition
		const passphraseCondition = schema.allOf.find(
			(condition: any) => condition.if.properties.keyType.const === 'passphrase',
		);
		expect(passphraseCondition).toBeDefined();
		expect(passphraseCondition.if.required).toEqual(['keyType']);
		expect(passphraseCondition.then.properties.secret).toEqual({ type: 'string' });
		expect(passphraseCondition.then.required).toEqual(['secret']);
		expect(passphraseCondition.then.additionalProperties).toBeUndefined();

		// Check pemKey condition
		const pemKeyCondition = schema.allOf.find(
			(condition: any) => condition.if.properties.keyType.const === 'pemKey',
		);
		expect(pemKeyCondition).toBeDefined();
		expect(pemKeyCondition.if.required).toEqual(['keyType']);
		expect(pemKeyCondition.then.properties.privateKey).toEqual({ type: 'string' });
		expect(pemKeyCondition.then.properties.publicKey).toEqual({ type: 'string' });
		expect(pemKeyCondition.then.required).toEqual([]);
		expect(pemKeyCondition.then.additionalProperties).toBeUndefined();
	});

	it('should handle properties without display conditions', () => {
		const simpleProperties: INodeProperties[] = [
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				required: true,
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
			},
		];

		const schema = toJsonSchema(simpleProperties);

		expect(schema.properties.username).toEqual({ type: 'string' });
		expect(schema.properties.password).toEqual({ type: 'string' });
		expect(schema.required).toEqual(['username']);
		expect(schema.allOf).toBeUndefined();
	});

	it('should handle advanced DisplayCondition objects with operators', () => {
		const advancedProperties: INodeProperties[] = [
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: 80,
			},
			{
				displayName: 'SSL Config',
				name: 'sslConfig',
				type: 'string',
				displayOptions: {
					show: {
						port: [{ _cnd: { gt: 443 } }],
					},
				},
			},
			{
				displayName: 'Basic Auth',
				name: 'basicAuth',
				type: 'string',
				displayOptions: {
					show: {
						port: [{ _cnd: { not: 80 } }],
					},
				},
			},
		];

		const schema = toJsonSchema(advancedProperties);

		// Verify basic structure
		expect(schema.properties.port).toEqual({ type: 'number' });
		expect(schema.allOf).toHaveLength(2);

		// Check gt condition
		const gtCondition = schema.allOf.find(
			(condition: any) => condition.if.properties.port.minimum === 443,
		);
		expect(gtCondition).toBeDefined();
		expect(gtCondition.if.properties.port).toEqual({
			type: 'number',
			minimum: 443,
			exclusiveMinimum: true,
		});
		expect(gtCondition.then.properties.sslConfig).toEqual({ type: 'string' });

		// Check not condition
		const notCondition = schema.allOf.find((condition: any) => condition.if.properties.port.not);
		expect(notCondition).toBeDefined();
		expect(notCondition.if.properties.port).toEqual({
			not: { const: 80 },
		});
		expect(notCondition.then.properties.basicAuth).toEqual({ type: 'string' });
	});
});
