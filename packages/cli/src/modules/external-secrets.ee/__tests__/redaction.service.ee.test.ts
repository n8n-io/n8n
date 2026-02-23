import type { INodeProperties } from 'n8n-workflow';
import { RedactionService } from '../redaction.service.ee';
import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

function createProperty(name: string, isPassword = false): INodeProperties {
	return {
		displayName: name,
		name,
		type: 'string',
		typeOptions: isPassword ? { password: true } : undefined,
		default: '',
	};
}

describe('RedactionService', () => {
	let service: RedactionService;

	beforeEach(() => {
		service = new RedactionService();
	});

	describe('redact()', () => {
		it('should redact password fields but not regular fields', () => {
			const data = {
				apiKey: 'secret123',
				publicField: 'visible',
				password: 'mypassword',
				anotherField: 'alsoVisible',
			};

			const properties = [
				createProperty('apiKey', true),
				createProperty('publicField'),
				createProperty('password', true),
				createProperty('anotherField'),
			];

			const result = service.redact(data, properties);

			expect(result).toEqual({
				apiKey: CREDENTIAL_BLANKING_VALUE,
				publicField: 'visible',
				password: CREDENTIAL_BLANKING_VALUE,
				anotherField: 'alsoVisible',
			});
		});

		it('should NOT redact expressions starting with =', () => {
			const data = {
				apiKey: '=someExpression',
				password: 'plainValue',
			};

			const properties = [createProperty('apiKey', true), createProperty('password', true)];

			const result = service.redact(data, properties);

			expect(result).toEqual({
				apiKey: '=someExpression',
				password: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should deep copy to avoid mutations', () => {
			const data = {
				apiKey: 'secret',
				nested: { value: 'test' },
			};

			const properties = [createProperty('apiKey', true)];

			const result = service.redact(data, properties);

			expect(result).not.toBe(data);
			expect(result.nested).not.toBe(data.nested);
			expect(data.apiKey).toBe('secret');
		});

		it('should handle empty properties array', () => {
			const data = {
				apiKey: 'secret',
				password: 'mypassword',
			};

			const result = service.redact(data, []);

			expect(result).toEqual(data);
		});

		it('should handle properties that do not exist in data', () => {
			const data = {
				apiKey: 'secret',
			};

			const properties = [createProperty('apiKey', true), createProperty('nonExistentField', true)];

			const result = service.redact(data, properties);

			expect(result).toEqual({
				apiKey: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should NOT redact non-string values', () => {
			const data = {
				numericField: 12345,
				booleanField: true,
				nullField: null as any,
			};

			const properties: INodeProperties[] = [
				{
					displayName: 'Numeric',
					name: 'numericField',
					type: 'number',
					typeOptions: { password: true },
					default: 0,
				},
				{
					displayName: 'Boolean',
					name: 'booleanField',
					type: 'boolean',
					typeOptions: { password: true },
					default: false,
				},
				{
					displayName: 'Null',
					name: 'nullField',
					type: 'string',
					typeOptions: { password: true },
					default: '',
				},
			];

			const result = service.redact(data, properties);

			expect(result).toEqual({
				numericField: 12345,
				booleanField: true,
				nullField: null,
			});
		});

		it('should handle empty data object', () => {
			const properties = [createProperty('someField', true)];

			const result = service.redact({}, properties);

			expect(result).toEqual({});
		});

		it('should always redact oauthTokenData field', () => {
			const data = {
				oauthTokenData: { token: 'secret' },
				regularField: 'visible',
			};

			const properties = [createProperty('regularField')];

			const result = service.redact(data, properties);

			expect(result).toEqual({
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				regularField: 'visible',
			});
		});
	});

	describe('unredact()', () => {
		it('should replace blanking values with saved values', () => {
			const redactedData = {
				apiKey: CREDENTIAL_BLANKING_VALUE,
				publicField: 'newValue',
			};

			const savedData = {
				apiKey: 'originalSecret',
				publicField: 'oldValue',
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).toEqual({
				apiKey: 'originalSecret',
				publicField: 'newValue',
			});
		});

		it('should handle nested objects recursively', () => {
			const redactedData = {
				outer: {
					apiKey: CREDENTIAL_BLANKING_VALUE,
					publicField: 'newValue',
				},
			};

			const savedData = {
				outer: {
					apiKey: 'originalSecret',
					publicField: 'oldValue',
				},
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).toEqual({
				outer: {
					apiKey: 'originalSecret',
					publicField: 'newValue',
				},
			});
		});

		it('should preserve non-blanked values', () => {
			const redactedData = {
				apiKey: 'newSecretValue',
				password: CREDENTIAL_BLANKING_VALUE,
			};

			const savedData = {
				apiKey: 'oldSecret',
				password: 'oldPassword',
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).toEqual({
				apiKey: 'newSecretValue',
				password: 'oldPassword',
			});
		});

		it('should deep copy to avoid mutations', () => {
			const redactedData = {
				apiKey: CREDENTIAL_BLANKING_VALUE,
				nested: { value: 'test' },
			};

			const savedData = {
				apiKey: 'secret',
				nested: { value: 'original' },
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).not.toBe(redactedData);
			expect(result.nested).not.toBe(redactedData.nested);
			expect(redactedData.apiKey).toBe(CREDENTIAL_BLANKING_VALUE); // Original unchanged
		});

		it('should handle missing keys in savedData', () => {
			const redactedData = {
				apiKey: CREDENTIAL_BLANKING_VALUE,
				newField: 'value',
			};

			const savedData = {
				apiKey: 'originalSecret',
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).toEqual({
				apiKey: 'originalSecret',
				newField: 'value',
			});
		});

		it('should handle deeply nested objects', () => {
			const redactedData = {
				level1: {
					level2: {
						level3: {
							apiKey: CREDENTIAL_BLANKING_VALUE,
						},
					},
				},
			};

			const savedData = {
				level1: {
					level2: {
						level3: {
							apiKey: 'deepSecret',
						},
					},
				},
			};

			const result = service.unredact(redactedData, savedData);

			expect(result).toEqual({
				level1: {
					level2: {
						level3: {
							apiKey: 'deepSecret',
						},
					},
				},
			});
		});

		it('should handle empty redacted data', () => {
			const result = service.unredact({}, { apiKey: 'secret' });

			expect(result).toEqual({});
		});

		it('should handle null and undefined savedData gracefully', () => {
			const redactedData = {
				apiKey: CREDENTIAL_BLANKING_VALUE,
			};

			const result1 = service.unredact(redactedData, {});
			expect(result1.apiKey).toBe(undefined);

			const result2 = service.unredact({}, {});
			expect(result2).toEqual({});
		});
	});
});
