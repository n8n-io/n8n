import { isObjectLiteral } from 'n8n-core';
import { NodeOperationError } from 'n8n-workflow';
import type { Workflow } from 'n8n-workflow';

export function objectToError(errorObject: unknown, workflow: Workflow): Error {
	// TODO: Expand with other error types
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

		if (error === undefined) {
			error = new Error(errorObject.message);
		}

		if ('description' in errorObject) {
			// @ts-expect-error Error descriptions are surfaced by the UI but
			// not all backend errors account for this property yet.
			error.description = errorObject.description as string;
		}

		if ('stack' in errorObject) {
			// If there's a 'stack' property, set it on the new Error instance.
			error.stack = errorObject.stack as string;
		}

		return error;
	} else {
		// If it's neither an Error nor an object with a 'message' property, create a generic Error.
		return new Error('An error occurred');
	}
}
