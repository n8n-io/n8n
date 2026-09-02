import type { ProjectExecutionQuotaPeriodUnit } from '@/features/collaboration/projects/projects.types';

export const EXECUTION_QUOTA_EDIT_MODAL_KEY = 'executionQuotaEdit';

/** Payload `ExecutionQuotaTable.vue` hands the edit modal via `openModalWithData`. */
export type ExecutionQuotaEditModalData = {
	projectId: string;
	projectName: string;
	limit: number;
	periodUnit: ProjectExecutionQuotaPeriodUnit;
};
