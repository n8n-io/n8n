export function getErrorMessageByStatusCode(statusCode: number): string | undefined {
	const errorMessages: Record<number, string> = {
		404: 'The resource was not found. Please check the model name',
	};

	return errorMessages[statusCode];
}
