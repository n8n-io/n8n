import type { IExecuteFunctions, ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Derives a user-scoped slot name from the credential prefix and the current user ID.
 * The entire resulting name (prefix + underscore + user ID) is sanitised by replacing
 * all non-alphanumeric, non-underscore characters with underscores to produce identifiers
 * that are safe to use in collection names, table names, namespace names, etc.
 *
 * @returns `{sanitizedPrefix}_{sanitizedUserId}`
 * @throws NodeOperationError when no authenticated user is available
 */
export function getUserScopedSlot(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	prefix: string,
	itemIndex?: number,
): string {
	const userId = ensureUserId(context, itemIndex);
	return `${prefix}_${userId}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function ensureUserId(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	itemIndex?: number,
): string {
	const userId =
		'additionalData' in context &&
		typeof context.additionalData === 'object' &&
		context.additionalData !== null &&
		'userId' in context.additionalData
			? context.additionalData.userId
			: undefined;

	if (typeof userId !== 'string' || !userId) {
		throw new NodeOperationError(
			context.getNode(),
			'User ID is not available. This node requires an authenticated user session.',
			{ itemIndex },
		);
	}

	return userId;
}
