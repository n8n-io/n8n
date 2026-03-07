import { NodeOperationError, NodeApiError } from 'n8n-workflow';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { classifyWebhookError, extractErrorMetadata } from '../webhook-error-classifier';
import type { INode } from 'n8n-workflow';

describe('webhook-error-classifier', () => {
	describe('classifyWebhookError', () => {
		it('should classify NodeOperationError as BadRequestError (400)', () => {
			const node = { name: 'Http Request', type: 'n8n-nodes-base.httpRequest' } as INode;
			const error = new NodeOperationError(node, 'JSON parameter needs to be valid JSON', {
				description: 'The JSON parameter is invalid',
			});

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(BadRequestError);
			expect(result.httpStatusCode).toBe(400);
			expect(result.message).toContain('JSON parameter needs to be valid JSON');
		});

		it('should include node name and parameter in error message when available', () => {
			const node = { name: 'Http Request', type: 'n8n-nodes-base.httpRequest' } as INode;
			const error = new NodeOperationError(node, 'JSON parameter needs to be valid JSON', {
				description: 'The JSON parameter is invalid',
			});
			error.context = { parameter: 'jsonBody' };

			const result = classifyWebhookError(error);

			expect(result.message).toContain('Node: Http Request');
			expect(result.message).toContain('Parameter: jsonBody');
		});

		it('should classify NodeApiError with 4xx code as BadRequestError (400)', () => {
			const node = { name: 'API Node', type: 'n8n-nodes-base.api' } as INode;
			const error = new NodeApiError(node, { message: 'Bad Request', statusCode: 400 }, {
				httpCode: '400',
			});

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(BadRequestError);
			expect(result.httpStatusCode).toBe(400);
		});

		it('should classify NodeApiError with 5xx code as InternalServerError (500)', () => {
			const node = { name: 'API Node', type: 'n8n-nodes-base.api' } as INode;
			const error = new NodeApiError(node, { message: 'Internal Server Error', statusCode: 500 }, {
				httpCode: '500',
			});

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(InternalServerError);
			expect(result.httpStatusCode).toBe(500);
		});

		it('should classify NodeApiError without httpCode as InternalServerError (500)', () => {
			const node = { name: 'API Node', type: 'n8n-nodes-base.api' } as INode;
			const error = new NodeApiError(node, { message: 'Unknown error' });

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(InternalServerError);
			expect(result.httpStatusCode).toBe(500);
		});

		it('should classify generic Error as InternalServerError (500)', () => {
			const error = new Error('Generic runtime error');

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(InternalServerError);
			expect(result.httpStatusCode).toBe(500);
			expect(result.message).toBe('Generic runtime error');
		});

		it('should handle errors without message', () => {
			const error = new Error();

			const result = classifyWebhookError(error);

			expect(result).toBeInstanceOf(InternalServerError);
			expect(result.httpStatusCode).toBe(500);
			expect(result.message).toContain('An error occurred while processing the webhook request');
		});
	});

	describe('extractErrorMetadata', () => {
		it('should extract metadata from NodeOperationError', () => {
			const node = {
				name: 'Http Request',
				type: 'n8n-nodes-base.httpRequest',
			} as INode;
			const error = new NodeOperationError(node, 'JSON parameter needs to be valid JSON', {
				description: 'The JSON parameter is invalid',
			});
			error.context = { parameter: 'jsonBody' };

			const metadata = extractErrorMetadata(error);

			expect(metadata.nodeName).toBe('Http Request');
			expect(metadata.nodeType).toBe('n8n-nodes-base.httpRequest');
			expect(metadata.parameter).toBe('jsonBody');
			expect(metadata.errorType).toBe('NodeOperationError');
			expect(metadata.description).toBe('The JSON parameter is invalid');
		});

		it('should extract metadata from NodeApiError', () => {
			const node = {
				name: 'API Node',
				type: 'n8n-nodes-base.api',
			} as INode;
			const error = new NodeApiError(node, { message: 'API error' });
			error.context = { parameter: 'url' };

			const metadata = extractErrorMetadata(error);

			expect(metadata.nodeName).toBe('API Node');
			expect(metadata.nodeType).toBe('n8n-nodes-base.api');
			expect(metadata.parameter).toBe('url');
			expect(metadata.errorType).toBe('NodeApiError');
		});

		it('should return empty metadata for generic errors', () => {
			const error = new Error('Generic error');

			const metadata = extractErrorMetadata(error);

			expect(metadata.nodeName).toBeUndefined();
			expect(metadata.nodeType).toBeUndefined();
			expect(metadata.parameter).toBeUndefined();
		});

		it('should handle errors without node information', () => {
			const node = {} as INode;
			const error = new NodeOperationError(node, 'Error message');

			const metadata = extractErrorMetadata(error);

			expect(metadata.nodeName).toBeUndefined();
			expect(metadata.errorType).toBe('NodeOperationError');
		});

		it('should handle errors without context parameter', () => {
			const node = {
				name: 'Test Node',
				type: 'n8n-nodes-base.test',
			} as INode;
			const error = new NodeOperationError(node, 'Error message');

			const metadata = extractErrorMetadata(error);

			expect(metadata.nodeName).toBe('Test Node');
			expect(metadata.parameter).toBeUndefined();
		});
	});
});
