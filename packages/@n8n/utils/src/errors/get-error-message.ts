/** Returns the message of `error`, or its string form if it is not an `Error`. */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
