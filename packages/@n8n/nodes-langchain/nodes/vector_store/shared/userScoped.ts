import type { IExecuteFunctions, ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Derives a user-scoped slot name from the credential prefix and the current user ID.
 * The user ID is sanitised by replacing all hyphens with underscores to produce
 * identifiers that are safe to use in collection names, table names, namespace names, etc.
 *
 * @returns `{prefix}_{sanitisedUserId}`
 * @throws NodeOperationError when no authenticated user is available
 */
export function getUserScopedSlot(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	prefix: string,
	itemIndex?: number,
): string {
	const userId = context.getUserId();
	if (!userId) {
		throw new NodeOperationError(
			context.getNode(),
			'User ID is not available. This node requires an authenticated user session.',
			{ itemIndex },
		);
	}
	const sanitizedUserId = userId.replace(/-/g, '_');
	return `${prefix}_${sanitizedUserId}`;
}
