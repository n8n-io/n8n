import type { User } from '@n8n/db';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

export async function assertRowReadAccess(
	user: User,
	params: { projectId?: string; dataTableId?: string },
): Promise<void> {
	if (!(await userHasScopes(user, ['dataTable:readRow'], false, params))) {
		throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	}
}
