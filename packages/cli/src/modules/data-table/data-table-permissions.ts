import type { User } from '@n8n/db';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

/**
 * The flag pair mirrors `shouldReturnData` in `DataTableRowsRepository`: a dry run
 * returns rows whether or not `returnData` was asked for. Keyed on the data table
 * so the check resolves the same project the `dataTable:writeRow` guard resolved.
 */
export async function assertRowReadAccessIfReturningRows(
	user: User,
	dataTableId: string,
	{ dryRun, returnData }: { dryRun?: boolean; returnData?: boolean },
): Promise<void> {
	if (!dryRun && !returnData) return;

	if (!(await userHasScopes(user, ['dataTable:readRow'], false, { dataTableId }))) {
		throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	}
}
