import type { AuthProviderSyncHistory } from '@n8n/db';

export function toLdapSyncHistoryResponse(row: AuthProviderSyncHistory) {
	return {
		id: row.id,
		runMode: row.runMode,
		status: row.status,
		startedAt: row.startedAt,
		endedAt: row.endedAt,
		scanned: row.scanned,
		created: row.created,
		updated: row.updated,
		disabled: row.disabled,
		error: row.error,
	};
}
