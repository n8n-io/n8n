import type { IExecuteFunctions, ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Derives a user-scoped slot name from the credential prefix and the current user ID.
 * The entire resulting name (prefix + underscore + user ID) is sanitised by replacing
 * all non-alphanumeric, non-underscore characters with underscores to produce identifiers
 * that are safe to use in collection names, table names, namespace names, etc.
 *
 * @returns `{sanitisedPrefix}_{sanitisedUserId}`
 * @throws NodeOperationError when no authenticated user is available
 */
export async function getUserScopedSlot(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	prefix: string,
	_itemIndex?: number,
): Promise<string> {
	const userId = await ensureUserId(context);
	return `${prefix}_${userId}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

export async function ensureUserId(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
): Promise<string> {
	return await context.getUserId();
}
