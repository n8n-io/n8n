import { isObjectLiteral } from '@n8n/backend-common';
import { NodeOperationError, NodeApiError, ApplicationError } from 'n8n-workflow';
import type { Workflow } from 'n8n-workflow';

/**
 * Optional properties that should be propagated from an error object to the new Error instance.
 */
const errorProperties = ['description', 'stack', 'executionId', 'workflowId'];

export function objectToError(errorObject: unknown, workflow: Workflow): Error {
	// Handle different error types
	if (errorObject instanceof Error) {
		// If it's already an Error instance, return it as is.
		return errorObject;
	} else if (
		isObjectLiteral(errorObject) &&
		'message' in errorObject &&
		typeof errorObject.message === 'string'
	) {
		// If it's an object with a 'message' property, create a new Error instance.
		let error: Error | undefined;

		// Check if it's a NodeOperationError with node information
		if (
			'node' in errorObject &&
			isObjectLiteral(errorObject.node) &&
			typeof errorObject.node.name === 'string'
		) {
			const node = workflow.getNode(errorObject.node.name);

			if (node) {
				error = new NodeOperationError(
					node,
					errorObject as unknown as Error,
					errorObject as object,
				);
			}
		}

		// Check if it's a NodeApiError with API error details
		if (
			!error &&
			'httpStatusCode' in errorObject &&
			typeof errorObject.httpStatusCode === 'number'
		) {
			error = new NodeApiError(
				{ name: 'Unknown Node' },
				errorObject as unknown as Error,
				errorObject as object,
			);
		}

		// Check if it's an ApplicationError
		if (!error && 'errorCode' in errorObject && typeof errorObject.errorCode === 'string') {
			error = new ApplicationError(errorObject.message, { cause: errorObject as unknown as Error });
		}

		if (error === undefined) {
			error = new Error(errorObject.message);
		}

		// Propagate additional error properties
		for (const field of errorProperties) {
			if (field in errorObject && errorObject[field]) {
				// Not all errors contain these properties
				(error as unknown as Record<string, unknown>)[field] = errorObject[field];
			}
		}

		return error;
	} else if (typeof errorObject === 'string') {
		// Handle string errors
		return new Error(errorObject);
	} else if (errorObject !== null && typeof errorObject === 'object') {
		// Handle other object types by converting to string
		return new Error(`Error: ${JSON.stringify(errorObject)}`);
	} else {
		// If it's neither an Error nor an object with a 'message' property, create a generic Error.
		return new Error(`An error occurred: ${String(errorObject)}`);
	}
}
