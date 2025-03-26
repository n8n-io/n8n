import type { IDataObject } from 'n8n-workflow';

/**
 * Formats the response from the LLM chain into a consistent structure
 */
export function formatResponse(response: unknown, version: number): IDataObject {
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
		if (version >= 1.6) {
			return response as IDataObject;
		}

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
