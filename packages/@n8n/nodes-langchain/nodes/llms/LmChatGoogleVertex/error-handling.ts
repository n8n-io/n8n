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
