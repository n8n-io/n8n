import type { IDataObject } from 'n8n-workflow';

/**
 * Formats the response from the LLM chain into a consistent structure
 */
export function formatResponse(response: unknown): IDataObject {
	if (typeof response === 'string') {
		return {
			response: {
				text: response.trim(),
			},
		};
	}

	if (Array.isArray(response)) {
		return {
			data: response,
		};
	}

	if (response instanceof Object) {
		return response as IDataObject;
	}

	return {
		response: {
			text: response,
		},
	};
}
