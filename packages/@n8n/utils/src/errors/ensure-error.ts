/** Ensures `error` is an `Error */
export function ensureError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error('Error that was not an instance of Error was thrown', {
				// We should never throw anything except something that derives from Error
				cause: error,
			});
}
