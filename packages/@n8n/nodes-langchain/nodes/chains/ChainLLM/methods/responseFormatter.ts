import type { IDataObject } from 'n8n-workflow';

/**
 * Formats the response from the LLM chain into a consistent structure
 */
export function formatResponse(response: unknown, returnUnwrappedObject: boolean): IDataObject {
	if (typeof response === 'string') {
		return {
			text: response.trim(),
		};
	}

	if (Array.isArray(response)) {
		return {
			data: response,
		};
	}

	if (response instanceof Object) {
		if (returnUnwrappedObject) {
			return response as IDataObject;
		}

		// If the response is an object and we are not unwrapping it, we need to stringify it
		// to be backwards compatible with older versions of the chain(< 1.6)
		return {
			text: JSON.stringify(response),
		};
	}

	return {
		response: {
			text: response,
		},
	};
}
