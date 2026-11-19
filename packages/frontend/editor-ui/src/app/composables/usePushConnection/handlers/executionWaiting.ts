import type { ExecutionWaiting } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import type { PushHandlerOptions } from './types';

export function executionWaiting({ data }: ExecutionWaiting, { documentId }: PushHandlerOptions) {
	const executionState = useWorkflowExecutionStateStore(documentId);
	if (executionState.activeExecutionId !== data.executionId) return;

	const formUrl = executionState.pendingFormPopupUrl;
	executionState.setPendingFormPopupUrl(undefined);
	if (formUrl) openFormPopupWindow(formUrl);
}
