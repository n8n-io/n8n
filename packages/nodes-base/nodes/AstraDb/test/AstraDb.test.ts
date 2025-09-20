import { describe, it, expect } from '@jest/globals';
import { NodeOperationError } from 'n8n-workflow';
import {
	validateAstraCredentials,
	validateKeyspaceCollectionName,
	validateQuery,
	//	validateVectorDocument,
	handleAstraError,
	formatAstraResponse,
	parseAstraOptions,
} from '../GenericFunctions';
import type { IAstraDbVectorDocument } from '../astraDb.types';

// Mock node for testing
const mockNode = { name: 'Astra DB Test' } as any;

describe('Astra DB Generic Functions', () => {
	describe('validateAstraCredentials', () => {
		it('should validate correct credentials', () => {
			const credentials = {
				endpoint: 'https://test-endpoint.com',
				token: 'test-token',
			};

			const result = validateAstraCredentials(mockNode, credentials);
			expect(result).toEqual({
				endpoint: 'https://test-endpoint.com',
				token: 'test-token',
			});
		});

		it('should handle missing endpoint', () => {
			const credentials = {
				token: 'test-token',
			};

			expect(() => validateAstraCredentials(mockNode, credentials)).toThrow(NodeOperationError);
		});

		it('should handle missing token', () => {
			const credentials = {
				endpoint: 'https://test-endpoint.com',
			};

			expect(() => validateAstraCredentials(mockNode, credentials)).toThrow(NodeOperationError);
		});

		it('should trim whitespace from credentials', () => {
			const credentials = {
				endpoint: '  https://test-endpoint.com  ',
				token: '  test-token  ',
			};

			const result = validateAstraCredentials(mockNode, credentials);
			expect(result.endpoint).toBe('https://test-endpoint.com');
			expect(result.token).toBe('test-token');
		});
	});

	describe('validateKeyspaceCollectionName', () => {
		it('should validate correct collection names', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, 'users')).not.toThrow();
			expect(() => validateKeyspaceCollectionName(mockNode, 'user_profiles')).not.toThrow();
			expect(() => validateKeyspaceCollectionName(mockNode, 'test123')).not.toThrow();
		});

		it('should reject invalid collection names', () => {
			expect(() => validateKeyspaceCollectionName(mockNode, '')).toThrow(NodeOperationError);
			expect(() => validateKeyspaceCollectionName(mockNode, '123users')).toThrow(
				NodeOperationError,
			);
			expect(() => validateKeyspaceCollectionName(mockNode, 'user-profiles')).toThrow(
				NodeOperationError,
			);
			expect(() => validateKeyspaceCollectionName(mockNode, 'user.profiles')).toThrow(
				NodeOperationError,
			);
		});
	});

	describe('validateQuery', () => {
		it('should validate correct query objects', () => {
			expect(() => validateQuery(mockNode, {})).not.toThrow();
			expect(() => validateQuery(mockNode, { name: 'test' })).not.toThrow();
			expect(() => validateQuery(mockNode, { $and: [{ name: 'test' }] })).not.toThrow();
		});

		it('should reject invalid query objects', () => {
			expect(() => validateQuery(mockNode, null)).toThrow(NodeOperationError);
			expect(() => validateQuery(mockNode, 'invalid')).toThrow(NodeOperationError);
			expect(() => validateQuery(mockNode, 123)).toThrow(NodeOperationError);
		});
	});

	/*	describe('validateVectorDocument', () => {
		it('should validate vector documents', () => {
			const vectorDoc: IAstraDbVectorDocument = {
				name: 'test',
				$vector: [0.1, 0.2, 0.3],
			};

			expect(() => validateVectorDocument(mockNode, vectorDoc, 'vector')).not.toThrow();
		});

		it('should validate vectorize documents', () => {
			const vectorizeDoc: IAstraDbVectorDocument = {
				name: 'test',
				$vectorize: 'test text',
			};

			expect(() => validateVectorDocument(mockNode, vectorizeDoc, 'vectorize')).not.toThrow();
		});

		it('should reject invalid vector documents', () => {
			const invalidDoc: IAstraDbVectorDocument = {
				name: 'test',
			};

			expect(() => validateVectorDocument(mockNode, invalidDoc, 'vector')).toThrow(NodeOperationError);
		});

		it('should reject invalid vectorize documents', () => {
			const invalidDoc: IAstraDbVectorDocument = {
				name: 'test',
			};

			expect(() => validateVectorDocument(mockNode, invalidDoc, 'vectorize')).toThrow(NodeOperationError);
		});
	});
*/

	describe('handleAstraError', () => {
		it('should handle authentication errors', () => {
			const error = { code: 'UNAUTHENTICATED' };
			expect(() => handleAstraError(mockNode, error, 'test')).toThrow(NodeOperationError);
		});

		it('should handle rate limit errors', () => {
			const error = { message: 'rate limit exceeded' };
			expect(() => handleAstraError(mockNode, error, 'test')).toThrow(NodeOperationError);
		});

		it('should handle not found errors', () => {
			const error = { message: 'not found' };
			expect(() => handleAstraError(mockNode, error, 'test')).toThrow(NodeOperationError);
		});

		it('should handle generic errors', () => {
			const error = { message: 'generic error' };
			expect(() => handleAstraError(mockNode, error, 'test')).toThrow(NodeOperationError);
		});
	});

	describe('formatAstraResponse', () => {
		it('should format response with metadata', () => {
			const result = { data: 'test' };
			const formatted = formatAstraResponse(result, 'testOperation');

			expect(formatted).toEqual({
				data: 'test',
				_operation: 'testOperation',
				_timestamp: expect.any(String),
			});
		});
	});

	describe('parseAstraOptions', () => {
		it('should parse valid options', () => {
			const options = {
				limit: '10',
				skip: '5',
				upsert: 'true',
				sort: '{"name": 1}',
				projection: '{"name": 1, "_id": 0}',
				timeout: '10000',
			};

			const parsed = parseAstraOptions(mockNode, options);
			expect(parsed).toEqual({
				limit: 10,
				skip: 5,
				upsert: true,
				sort: { name: 1 },
				projection: { name: 1, _id: 0 },
				timeout: 10000,
			});
		});

		it('should handle empty options', () => {
			const parsed = parseAstraOptions(mockNode, {});
			expect(parsed).toEqual({});
		});

		it('should handle null options', () => {
			const parsed = parseAstraOptions(mockNode, null);
			expect(parsed).toEqual({});
		});

		it('should handle invalid JSON in sort', () => {
			const options = {
				sort: 'invalid json',
			};

			expect(() => parseAstraOptions(mockNode, options)).toThrow(NodeOperationError);
		});

		it('should handle invalid JSON in projection', () => {
			const options = {
				projection: 'invalid json',
			};

			expect(() => parseAstraOptions(mockNode, options)).toThrow(NodeOperationError);
		});
	});
});
