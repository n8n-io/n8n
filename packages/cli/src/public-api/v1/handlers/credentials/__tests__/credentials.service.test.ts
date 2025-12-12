import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import type { IDependency } from '@/public-api/types';

import { toJsonSchema } from '../credentials.service';

describe('CredentialsService', () => {
	describe('toJsonSchema', () => {
		it('should create separate conditionals for different values of the same dependant field', () => {
			// This test simulates the JWT auth credential scenario where
			// multiple properties depend on the same field (keyType) but with different values
			const properties: INodeProperties[] = [
				{
					name: 'keyType',
					type: 'options',
					options: [
						{ value: 'passphrase', name: 'Passphrase' },
						{ value: 'pemKey', name: 'PEM Key' },
					],
					displayName: 'Key Type',
					default: 'passphrase',
				},
				{
					name: 'secret',
					type: 'string',
					displayName: 'Secret',
					default: '',
					displayOptions: {
						show: {
							keyType: ['passphrase'],
						},
					},
				},
				{
					name: 'privateKey',
					type: 'string',
					displayName: 'Private Key',
					default: '',
					displayOptions: {
						show: {
							keyType: ['pemKey'],
						},
					},
				},
				{
					name: 'publicKey',
					type: 'string',
					displayName: 'Public Key',
					default: '',
					displayOptions: {
						show: {
							keyType: ['pemKey'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			const props = schema.properties as IDataObject;
			expect(props).toBeDefined();
			expect(props.keyType).toEqual({
				type: 'string',
				enum: ['passphrase', 'pemKey'],
			});

			// All conditional fields should not be globally required
			expect(schema.required).not.toContain('secret');
			expect(schema.required).not.toContain('privateKey');
			expect(schema.required).not.toContain('publicKey');

			// Should have 2 separate conditionals (one for each keyType value)
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBe(2);

			// Find conditional for passphrase
			const passphraseCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.keyType?.enum?.[0] === 'passphrase',
			) as IDependency;
			expect(passphraseCondition).toBeDefined();
			expect(passphraseCondition.then?.allOf).toHaveLength(1);
			expect(passphraseCondition.then?.allOf[0].required).toContain('secret');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('privateKey');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('publicKey');

			// Find conditional for pemKey
			const pemKeyCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.keyType?.enum?.[0] === 'pemKey',
			) as IDependency;
			expect(pemKeyCondition).toBeDefined();
			expect(pemKeyCondition.then?.allOf).toHaveLength(2);
			expect(
				pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('privateKey')),
			).toBe(true);
			expect(
				pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('publicKey')),
			).toBe(true);
			expect(pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('secret'))).toBe(
				false,
			);
		});

		it('should handle properties with no displayOptions as globally required', () => {
			const properties: INodeProperties[] = [
				{ name: 'apiKey', type: 'string', required: true, displayName: 'API Key', default: '' },
				{ name: 'domain', type: 'string', required: true, displayName: 'Domain', default: '' },
				{
					name: 'optionalField',
					type: 'string',
					required: false,
					displayName: 'Optional',
					default: '',
				},
			];

			const schema = toJsonSchema(properties);

			expect(schema.required).toEqual(expect.arrayContaining(['apiKey', 'domain']));
			expect(schema.required).not.toContain('optionalField');
			expect(schema.allOf).toBeUndefined();
		});

		it('should handle mix of required and conditional properties', () => {
			const properties: INodeProperties[] = [
				{ name: 'apiKey', type: 'string', required: true, displayName: 'API Key', default: '' },
				{
					name: 'authType',
					type: 'options',
					required: true,
					options: [
						{ value: 'basic', name: 'Basic' },
						{ value: 'oauth2', name: 'OAuth2' },
					],
					displayName: 'Auth Type',
					default: 'basic',
				},
				{
					name: 'username',
					type: 'string',
					displayName: 'Username',
					default: '',
					displayOptions: {
						show: {
							authType: ['basic'],
						},
					},
				},
				{
					name: 'password',
					type: 'string',
					displayName: 'Password',
					default: '',
					displayOptions: {
						show: {
							authType: ['basic'],
						},
					},
				},
				{
					name: 'clientId',
					type: 'string',
					displayName: 'Client ID',
					default: '',
					displayOptions: {
						show: {
							authType: ['oauth2'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// apiKey and authType should be globally required
			expect(schema.required).toEqual(expect.arrayContaining(['apiKey', 'authType']));
			// Conditional fields should not be globally required
			expect(schema.required).not.toContain('username');
			expect(schema.required).not.toContain('password');
			expect(schema.required).not.toContain('clientId');

			// Should have 2 conditionals
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(allOf?.length).toBe(2);
		});

		it('should handle properties with multiple options depending on same field', () => {
			const properties: INodeProperties[] = [
				{
					name: 'operation',
					type: 'options',
					options: [
						{ value: 'create', name: 'Create' },
						{ value: 'update', name: 'Update' },
						{ value: 'delete', name: 'Delete' },
					],
					displayName: 'Operation',
					default: 'create',
				},
				{
					name: 'createField',
					type: 'string',
					displayName: 'Create Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['create'],
						},
					},
				},
				{
					name: 'updateField',
					type: 'string',
					displayName: 'Update Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['update'],
						},
					},
				},
				{
					name: 'deleteField',
					type: 'string',
					displayName: 'Delete Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['delete'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Should have 3 separate conditionals (one for each operation)
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(allOf?.length).toBe(3);

			// Verify each conditional is correct
			const createCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'create',
			) as IDependency;
			expect(createCondition?.then?.allOf[0].required).toContain('createField');

			const updateCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'update',
			) as IDependency;
			expect(updateCondition?.then?.allOf[0].required).toContain('updateField');

			const deleteCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'delete',
			) as IDependency;
			expect(deleteCondition?.then?.allOf[0].required).toContain('deleteField');
		});

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
	});
});
