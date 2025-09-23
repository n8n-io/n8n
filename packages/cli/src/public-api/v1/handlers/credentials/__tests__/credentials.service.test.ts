import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import type { IDependency } from '@/public-api/types';

import { toJsonSchema } from '../credentials.service';

describe('CredentialsService', () => {
	describe('toJsonSchema', () => {
		it('should add "false" displayOptions.show dependant value as allof condition', () => {
			const properties: INodeProperties[] = [
				{ name: 'field1', type: 'string', required: true, displayName: 'Field 1', default: '' },
				{
					name: 'field2',
					type: 'options',
					required: true,
					options: [
						{ value: 'opt1', name: 'opt1' },
						{ value: 'opt2', name: 'opt2' },
					],
					displayName: 'Field 2',
					default: 'opt1',
				},
				{
					name: 'field3',
					type: 'string',
					displayName: 'Field 3',
					default: '',
					displayOptions: {
						show: {
							field2: [false], // boolean false as dependant value
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Cast properties as IDataObject
			const props = schema.properties as IDataObject;

			expect(props).toBeDefined();
			expect(props.field1).toEqual({ type: 'string' });
			expect(props.field2).toEqual({
				type: 'string',
				enum: ['opt1', 'opt2'],
			});
			expect(props.field3).toEqual({ type: 'string' });

			// field1 and field2 required globally, field3 required conditionally
			expect(schema.required).toEqual(expect.arrayContaining(['field1', 'field2']));
			expect(schema.required).not.toContain('field3');

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBeGreaterThan(0);

			const condition = allOf?.find((cond) => (cond as any).if?.properties?.field2) as IDependency;
			expect(condition).toBeDefined();
			expect((condition.if?.properties as any).field2).toEqual({
				enum: [false], // boolean false as dependant value
			});

			// then block requires field3 when field2 === false
			expect(condition.then?.allOf.some((req: any) => req.required?.includes('field3'))).toBe(true);
			// else block forbids field3 when field2 !== false
			expect(
				condition.else?.allOf.some((notReq: any) => notReq.not?.required?.includes('field3')),
			).toBe(true);
		});

		it('should generate correct schema for JWT credential fields with proper required fields', () => {
			const jwtProperties: INodeProperties[] = [
				{
					displayName: 'Key Type',
					name: 'keyType',
					type: 'options',
					description: 'Choose either the secret passphrase or PEM encoded public keys',
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
					typeOptions: { password: true },
					default: '',
					displayOptions: { show: { keyType: ['passphrase'] } },
				},
				{
					displayName: 'Private Key',
					name: 'privateKey',
					type: 'string',
					typeOptions: { password: true },
					default: '',
					displayOptions: { show: { keyType: ['pemKey'] } },
				},
				{
					displayName: 'Public Key',
					name: 'publicKey',
					type: 'string',
					typeOptions: { password: true },
					default: '',
					displayOptions: { show: { keyType: ['pemKey'] } },
				},
				{
					displayName: 'Algorithm',
					name: 'algorithm',
					type: 'options',
					default: 'HS256',
					options: [
						{ name: 'HS256', value: 'HS256' },
						{ name: 'HS384', value: 'HS384' },
						{ name: 'HS512', value: 'HS512' },
						{ name: 'RS256', value: 'RS256' },
						{ name: 'RS384', value: 'RS384' },
						{ name: 'RS512', value: 'RS512' },
						{ name: 'ES256', value: 'ES256' },
						{ name: 'ES384', value: 'ES384' },
						{ name: 'ES512', value: 'ES512' },
						{ name: 'PS256', value: 'PS256' },
						{ name: 'PS384', value: 'PS384' },
						{ name: 'PS512', value: 'PS512' },
						{ name: 'none', value: 'none' },
					],
				},
			];

			const schema = toJsonSchema(jwtProperties);
			const allOf = schema.allOf as any[];

			// Check passphrase condition
			const passphraseCond = allOf.find((cond) =>
				cond.if?.properties?.keyType?.enum?.includes('passphrase'),
			);
			expect(passphraseCond).toBeDefined();
			expect(passphraseCond.then?.required).toEqual(['secret']);

			// Check PEM key condition
			const pemCond = allOf.find((cond) => cond.if?.properties?.keyType?.enum?.includes('pemKey'));
			expect(pemCond).toBeDefined();
			expect(pemCond.then?.required.sort()).toEqual(['privateKey', 'publicKey'].sort());
		});
	});
});
