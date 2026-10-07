/** True for a `ResponseError`-shaped 404, as the agent REST endpoints throw it. */
export function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'httpStatusCode' in error &&
		error.httpStatusCode === 404
	);
}
