export interface ErrorLike {
	message?: string;
	description?: string;
}

export interface ErrorContext {
	modelName?: string;
}

export function makeErrorFromStatus(statusCode: number, context?: ErrorContext): ErrorLike {
	const errorMessages: Record<number, ErrorLike> = {
		403: {
			message: 'Unauthorized for this project',
			description:
				'Check your Google Cloud project ID, that your credential has access to that project and that billing is enabled',
		},
		404: {
			message: context?.modelName
				? `No model found called '${context.modelName}'`
				: 'No model found',
		},
	};

	return errorMessages[statusCode];
}

interface GoogleErrorLike {
	message?: string;
	response?: { status?: number; data?: unknown };
}

function readGoogleErrorMessage(data: unknown): string | undefined {
	// Google error bodies look like `{ "error": { "message": "..." } }`, sometimes array-wrapped
	const entry: unknown = Array.isArray(data) ? data[0] : data;
	if (entry && typeof entry === 'object' && 'error' in entry) {
		const innerError = (entry as { error?: { message?: unknown } }).error;
		if (innerError && typeof innerError.message === 'string') return innerError.message;
	}
	return undefined;
}

/**
 * Extracts the human-readable Google API error message from a failed request, so it can be
 * surfaced to the user instead of a generic status-code wrapper.
 */
export function extractGoogleErrorMessage(error: GoogleErrorLike): string | undefined {
	const fromData = readGoogleErrorMessage(error.response?.data);
	if (fromData) return fromData;

	// @langchain/google-common embeds the raw body in the error message:
	// "Google request failed with status code <n>: <body>"
	const match = error.message?.match(/status code \d+: ([\s\S]+)/);
	if (match) {
		try {
			return readGoogleErrorMessage(JSON.parse(match[1])) ?? match[1];
		} catch {
			return match[1];
		}
	}

	return undefined;
}
