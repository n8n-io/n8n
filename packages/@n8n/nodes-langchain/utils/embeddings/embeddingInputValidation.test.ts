import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { validateEmbedQueryInput, validateEmbedDocumentsInput } from './embeddingInputValidation';

const createMockNode = (): INode => ({
	id: 'test-node',
	name: 'Test Embeddings Node',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

describe('embeddingInputValidation', () => {
	describe('validateEmbedQueryInput', () => {
		const mockNode = createMockNode();

		it('should throw NodeOperationError when query is undefined', () => {
			expect(() => validateEmbedQueryInput(undefined, mockNode)).toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError when query is null', () => {
			expect(() => validateEmbedQueryInput(null, mockNode)).toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError when query is empty string', () => {
			expect(() => validateEmbedQueryInput('', mockNode)).toThrow(NodeOperationError);
		});

		it('should return query when valid string', () => {
			const query = 'valid search query';
			expect(validateEmbedQueryInput(query, mockNode)).toBe(query);
		});

		it('should return query with whitespace (not trimmed)', () => {
			const query = '  query with spaces  ';
			expect(validateEmbedQueryInput(query, mockNode)).toBe(query);
		});

		it('should include helpful error message', () => {
			try {
				validateEmbedQueryInput(undefined, mockNode);
				fail('Expected error to be thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeOperationError);
				expect((e as NodeOperationError).message).toContain('empty or undefined text');
			}
		});

		it('should include description with possible causes', () => {
			try {
				validateEmbedQueryInput(undefined, mockNode);
				fail('Expected error to be thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeOperationError);
				const description = (e as NodeOperationError).description as string;
				expect(description).toContain('expression evaluates to undefined');
				expect(description).toContain('AI agent');
				expect(description).toContain('required field is missing');
			}
		});
	});

	describe('validateEmbedDocumentsInput', () => {
		const mockNode = createMockNode();

		it('should throw NodeOperationError when documents is undefined', () => {
			expect(() => validateEmbedDocumentsInput(undefined, mockNode)).toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError when documents is null', () => {
			expect(() => validateEmbedDocumentsInput(null, mockNode)).toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError when documents is not an array', () => {
			expect(() => validateEmbedDocumentsInput('not an array', mockNode)).toThrow(
				NodeOperationError,
			);
		});

		it('should throw NodeOperationError when any document is undefined', () => {
			expect(() =>
				validateEmbedDocumentsInput(['valid', undefined, 'also valid'], mockNode),
			).toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError when any document is null', () => {
			expect(() => validateEmbedDocumentsInput(['valid', null], mockNode)).toThrow(
				NodeOperationError,
			);
		});

		it('should throw NodeOperationError when any document is empty string', () => {
			expect(() => validateEmbedDocumentsInput(['valid', ''], mockNode)).toThrow(
				NodeOperationError,
			);
		});

		it('should return documents when all are valid strings', () => {
			const docs = ['document 1', 'document 2', 'document 3'];
			expect(validateEmbedDocumentsInput(docs, mockNode)).toBe(docs);
		});

		it('should return empty array when given empty array', () => {
			const docs: string[] = [];
			expect(validateEmbedDocumentsInput(docs, mockNode)).toBe(docs);
		});

		it('should include index of invalid document in error message', () => {
			try {
				validateEmbedDocumentsInput(['valid', 'also valid', undefined], mockNode);
				fail('Expected error to be thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeOperationError);
				expect((e as NodeOperationError).message).toContain('index 2');
			}
		});

		it('should include helpful description in error', () => {
			try {
				validateEmbedDocumentsInput(['valid', null], mockNode);
				fail('Expected error to be thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeOperationError);
				expect((e as NodeOperationError).description).toContain('non-empty strings');
			}
		});
	});
});
