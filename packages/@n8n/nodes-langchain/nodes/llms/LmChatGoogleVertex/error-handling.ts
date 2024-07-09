export function getErrorMessageByStatusCode(statusCode: number): string | undefined {
	const errorMessages: Record<number, string> = {
		403: 'Error 403: Unauthorized. Please check your credentials and Project ID',
		404: 'Error 404: The resource was not found. Please check the model name',
	};

	return errorMessages[statusCode];
}
