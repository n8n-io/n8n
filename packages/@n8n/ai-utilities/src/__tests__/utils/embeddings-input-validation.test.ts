import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	validateEmbedQueryInput,
	validateEmbedDocumentsInput,
} from 'src/utils/embeddings-input-validation';

describe('validateEmbedQueryInput', () => {
	const mockNode: INode = {
		id: 'test-node',
		name: 'Test Node',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	it('should return valid non-empty string', () => {
		const result = validateEmbedQueryInput('valid query', mockNode);
		expect(result).toBe('valid query');
	});

	it('should throw NodeOperationError for invalid input with proper description', () => {
		expect(() => validateEmbedQueryInput('', mockNode)).toThrow(NodeOperationError);
		expect(() => validateEmbedQueryInput(undefined, mockNode)).toThrow(NodeOperationError);

		try {
			validateEmbedQueryInput('', mockNode);
			fail('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(NodeOperationError);
			const nodeError = error as NodeOperationError;
			expect(nodeError.description).toContain('text provided for embedding is empty or undefined');
		}
	});
});

describe('validateEmbedDocumentsInput', () => {
	const mockNode: INode = {
		id: 'test-node',
		name: 'Test Node',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	it('should return valid array of strings', () => {
		const docs = ['doc1', 'doc2', 'doc3'];
		const result = validateEmbedDocumentsInput(docs, mockNode);
		expect(result).toEqual(docs);
	});

	it('should throw NodeOperationError for non-array input with proper description', () => {
		expect(() => validateEmbedDocumentsInput('not an array', mockNode)).toThrow(NodeOperationError);
		expect(() => validateEmbedDocumentsInput(undefined, mockNode)).toThrow(NodeOperationError);
		expect(() => validateEmbedDocumentsInput({}, mockNode)).toThrow(NodeOperationError);

		try {
			validateEmbedDocumentsInput('not array', mockNode);
			fail('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(NodeOperationError);
			const nodeError = error as NodeOperationError;
			expect(nodeError.description).toContain('Expected an array of strings');
		}
	});

	it('should throw NodeOperationError for invalid document at correct index', () => {
		const docs = ['valid', undefined, 'valid2'];
		expect(() => validateEmbedDocumentsInput(docs, mockNode)).toThrow(
			'Invalid document at index 1',
		);

		const docs2 = ['valid1', 'valid2', null, 'valid3'];
		expect(() => validateEmbedDocumentsInput(docs2, mockNode)).toThrow(
			'Invalid document at index 2',
		);
	});
});
