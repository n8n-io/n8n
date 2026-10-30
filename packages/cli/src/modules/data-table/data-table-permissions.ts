import type { InstanceWriteAccessService } from '@n8n/backend-services';
import { ForbiddenError } from '@n8n/errors';

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
