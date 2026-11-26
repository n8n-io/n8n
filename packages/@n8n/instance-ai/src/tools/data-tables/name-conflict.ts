import { errorChain } from '@n8n/utils/errors/error-chain';

/**
 * Check if an error (or its cause chain) is a DataTableNameConflictError.
 * The error class lives in packages/cli so we can't import it directly —
 * instead we match on the class name through the cause chain.
 */
export function isNameConflictError(error: unknown): boolean {
	return errorChain(error).some(
		(link) => link instanceof Error && link.constructor.name === 'DataTableNameConflictError',
	);
}
