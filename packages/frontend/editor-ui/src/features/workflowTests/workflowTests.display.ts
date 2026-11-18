import type { WorkflowTestResult } from '@n8n/api-types';
import type { BadgeVariant } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { BaseTextKey } from '@n8n/i18n';

export type WorkflowTestRowStatus = WorkflowTestResult['status'] | 'running' | 'notRun';

/** One test as the Tests tab shows it: from the file, with its result if it ran. */
export type WorkflowTestRow = {
	name: string;
	status: WorkflowTestRowStatus;
	durationMs?: number;
	error?: WorkflowTestResult['error'];
};

export const TEST_STATUS_DISPLAY: Record<
	WorkflowTestRowStatus,
	{ icon: IconName; badge: BadgeVariant; label: BaseTextKey }
> = {
	passed: { icon: 'circle-check', badge: 'success', label: 'workflowTests.status.passed' },
	failed: { icon: 'circle-x', badge: 'danger', label: 'workflowTests.status.failed' },
	skipped: { icon: 'circle-minus', badge: 'filled', label: 'workflowTests.status.skipped' },
	running: { icon: 'loader-circle', badge: 'info', label: 'workflowTests.status.running' },
	notRun: { icon: 'circle-dashed-filled', badge: 'outline', label: 'workflowTests.status.notRun' },
};

export function formatTestDuration(durationMs: number): string {
	return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}
