import { ModuleRegistry } from '@n8n/backend-common';
import { type InstanceWriteAccessService, ProjectScopeService } from '@n8n/backend-services';
import { MISSING_SCOPE_ERROR_MESSAGE } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { User } from '@n8n/db';

import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { DataTableRepository } from './data-table.repository';

/**
 * On a protected instance, source control owns the table structure, so a pull
 * would revert or delete schema changes made here. Rows are not in source
 * control and stay writable.
 */
export function assertSchemaWriteAccess(instanceWriteAccess: InstanceWriteAccessService): void {
	if (instanceWriteAccess.isReadOnly()) {
		throw new ForbiddenError(
			'Cannot change the data table structure on a protected instance. This instance is in read-only mode. Rows can still be edited.',
		);
	}
}

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

	const projectIds = await Container.get(ProjectScopeService).getProjectIds(user, [
		'dataTable:readRow',
	]);
	if (projectIds === null) return;

	if (!Container.get(ModuleRegistry).isActive('data-table')) {
		throw new NotFoundError(`Data table with ID "${dataTableId}" not found.`);
	}

	const projectId = await Container.get(DataTableRepository).findProjectIdForScope(dataTableId);
	if (projectId === null) {
		throw new NotFoundError(`Data table with ID "${dataTableId}" not found.`);
	}

	if (!projectIds.includes(projectId)) {
		throw new ForbiddenError(MISSING_SCOPE_ERROR_MESSAGE);
	}
}
