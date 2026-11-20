/**
 * The error type and status code only: messages, stacks and command output can carry repository or token data.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function errorSummary(error) {
	const name = error instanceof Error ? error.name : 'Error';
	const status = /** @type {{ status?: unknown }} */ (error)?.status;
	return typeof status === 'number' ? `${name} with status ${status}` : name;
}
