import type { CredentialsEntity } from '@n8n/db';
import { validate, type Schema } from 'jsonschema';
import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import type { IDependency } from '@/public-api/types';

import { buildSharedForCredential, toJsonSchema } from '../credentials.utils';

describe('credentials.utils', () => {
	describe('buildSharedForCredential', () => {
		it('returns one shared entry when credential is shared with one project', () => {
			const createdAt = new Date('2024-01-01T00:00:00.000Z');
			const updatedAt = new Date('2024-01-02T00:00:00.000Z');
			const credential = {
				shared: [
					{
						role: 'credential:owner',
						createdAt,
						updatedAt,
						project: { id: 'proj-1', name: 'My Project' },
					},
				],
			} as unknown as CredentialsEntity;
			expect(buildSharedForCredential(credential)).toEqual([
				{
					id: 'proj-1',
					name: 'My Project',
					role: 'credential:owner',
					createdAt,
					updatedAt,
				},
			]);
		});

		it('returns multiple shared entries and skips shared entries without project', () => {
			const createdAt1 = new Date('2024-01-01T00:00:00.000Z');
			const updatedAt1 = new Date('2024-01-02T00:00:00.000Z');
			const createdAt2 = new Date('2024-02-01T00:00:00.000Z');
			const updatedAt2 = new Date('2024-02-02T00:00:00.000Z');
			const credential = {
				shared: [
					{
						role: 'credential:owner',
						createdAt: createdAt1,
						updatedAt: updatedAt1,
						project: { id: 'proj-1', name: 'Project One' },
					},
					{ role: 'credential:user', createdAt: createdAt2, updatedAt: updatedAt2, project: null },
					{
						role: 'credential:user',
						createdAt: createdAt2,
						updatedAt: updatedAt2,
						project: { id: 'proj-2', name: 'Project Two' },
					},
				],
			} as unknown as CredentialsEntity;
			expect(buildSharedForCredential(credential)).toEqual([
				{
					id: 'proj-1',
					name: 'Project One',
					role: 'credential:owner',
					createdAt: createdAt1,
					updatedAt: updatedAt1,
				},
				{
					id: 'proj-2',
					name: 'Project Two',
					role: 'credential:user',
					createdAt: createdAt2,
					updatedAt: updatedAt2,
				},
			]);
		});
	});

	describe('toJsonSchema', () => {
		it('should create separate conditionals for different values of the same dependant field', () => {
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
					required: true,
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
					required: true,
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
					required: true,
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

			expect(schema.required).not.toContain('secret');
			expect(schema.required).not.toContain('privateKey');
			expect(schema.required).not.toContain('publicKey');

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBe(2);

			const passphraseCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.keyType?.enum?.[0] === 'passphrase',
			) as IDependency;
			expect(passphraseCondition).toBeDefined();
			expect(passphraseCondition.then?.allOf).toHaveLength(1);
			expect(passphraseCondition.then?.allOf[0].required).toContain('secret');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('privateKey');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('publicKey');

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
					required: true,
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
					required: true,
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
					required: true,
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

			expect(schema.required).toEqual(expect.arrayContaining(['apiKey', 'authType']));
			expect(schema.required).not.toContain('username');
			expect(schema.required).not.toContain('password');
			expect(schema.required).not.toContain('clientId');

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
					required: true,
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
					required: true,
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
					required: true,
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

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(allOf?.length).toBe(3);

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
					required: true,
					displayName: 'Field 3',
					default: '',
					displayOptions: {
						show: {
							field2: [false],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			const props = schema.properties as IDataObject;

			expect(props).toBeDefined();
			expect(props.field1).toEqual({ type: 'string' });
			expect(props.field2).toEqual({
				type: 'string',
				enum: ['opt1', 'opt2'],
			});
			expect(props.field3).toEqual({ type: 'string' });

			expect(schema.required).toEqual(expect.arrayContaining(['field1', 'field2']));
			expect(schema.required).not.toContain('field3');

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBeGreaterThan(0);

			const condition = allOf?.find((cond) => (cond as any).if?.properties?.field2) as IDependency;
			expect(condition).toBeDefined();
			expect((condition.if?.properties as any).field2).toEqual({
				enum: [false],
			});

			expect(condition.then?.allOf.some((req: any) => req.required?.includes('field3'))).toBe(true);
			expect((condition as any).else).toBeUndefined();
		});

		it('should not forbid conditional fields belonging to inactive conditions', () => {
			const properties: INodeProperties[] = [
				{
					name: 'configurationType',
					type: 'options',
					options: [
						{ value: 'connectionString', name: 'Connection String' },
						{ value: 'values', name: 'Values' },
					],
					displayName: 'Configuration Type',
					default: 'values',
				},
				{
					name: 'connectionString',
					type: 'string',
					required: true,
					displayName: 'Connection String',
					default: '',
					displayOptions: { show: { configurationType: ['connectionString'] } },
				},
				{
					name: 'host',
					type: 'string',
					required: true,
					displayName: 'Host',
					default: '',
					displayOptions: { show: { configurationType: ['values'] } },
				},
			];

			const schema = toJsonSchema(properties);

			expect(JSON.stringify(schema)).not.toContain('"not"');

			const connectionStringPayload = {
				configurationType: 'connectionString',
				connectionString: 'mongodb://localhost:27017/mydb',
				host: 'localhost',
			};
			expect(validate(connectionStringPayload, schema as unknown as Schema).valid).toBe(true);

			const valuesPayload = {
				configurationType: 'values',
				host: 'localhost',
				connectionString: 'mongodb://localhost:27017/mydb',
			};
			expect(validate(valuesPayload, schema as unknown as Schema).valid).toBe(true);

			const missingRequired = { configurationType: 'values' };
			expect(validate(missingRequired, schema as unknown as Schema).valid).toBe(false);
		});
	});
});
