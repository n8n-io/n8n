import { NodeOperationError, NodeApiError } from 'n8n-workflow';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import type { ExecutionError } from 'n8n-workflow';

/**
 * Classifies webhook execution errors and converts them to appropriate HTTP response errors.
 *
 * Error Classification:
 * - NodeOperationError (validation/parameter errors) → 400 Bad Request
 * - NodeApiError (API errors) → Use HTTP code from error or 500
 * - Runtime/Execution errors → 500 Internal Server Error
 * - Webhook input validation errors → 400 Bad Request
 */
export function classifyWebhookError(error: Error | ExecutionError): ResponseError {
	// Node parameter validation errors should be 400 Bad Request
	if (error instanceof NodeOperationError) {
		const errorMessage = error.message || 'Invalid node parameter';
		const errorDescription = error.description || errorMessage;
		
		// Extract node and parameter information for better error messages
		const nodeName = error.node?.name || 'Unknown node';
		const parameter = error.context?.parameter;
		
		let message = errorMessage;
		if (parameter) {
			message = `${errorMessage} (Node: ${nodeName}, Parameter: ${parameter})`;
		} else if (nodeName !== 'Unknown node') {
			message = `${errorMessage} (Node: ${nodeName})`;
		}

		return new BadRequestError(message, 400);
	}

	// Node API errors may have HTTP codes, use them if available
	if (error instanceof NodeApiError) {
		const httpCode = error.httpCode ? parseInt(error.httpCode, 10) : 500;
		
		// 4xx errors from API should remain 4xx
		if (httpCode >= 400 && httpCode < 500) {
			return new BadRequestError(error.message || 'API request failed', httpCode);
		}
		
		// 5xx errors should be 500
		return new InternalServerError(error.message || 'API request failed');
	}

	// All other errors are treated as internal server errors
	return new InternalServerError(
		error.message || 'An error occurred while processing the webhook request',
	);
}

/**
 * Extracts error metadata for execution records.
 * Includes node name, parameter name, and error details.
 */
export function extractErrorMetadata(error: Error | ExecutionError): {
	nodeName?: string;
	nodeType?: string;
	parameter?: string;
	errorType?: string;
	description?: string;
} {
	const metadata: {
		nodeName?: string;
		nodeType?: string;
		parameter?: string;
		errorType?: string;
		description?: string;
	} = {};

	if (error instanceof NodeOperationError || error instanceof NodeApiError) {
		if (error.node) {
			metadata.nodeName = error.node.name;
			metadata.nodeType = error.node.type;
		}
		
		if (error.context?.parameter) {
			metadata.parameter = error.context.parameter;
		}
		
		metadata.errorType = error.constructor.name;
		
		if (error.description) {
			metadata.description = error.description;
		}
	}

	return metadata;
}
