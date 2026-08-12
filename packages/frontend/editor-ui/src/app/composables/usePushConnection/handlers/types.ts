import type { Router } from 'vue-router';
import type { WorkflowDocumentId } from '@/app/stores/workflowDocument.store';

/**
 * Dependencies passed to push connection handlers, resolved per event in
 * `usePushConnection.processEvent`.
 *
 * - `documentId` identifies the currently-open workflow document (resolved at
 *   event time from the injected workflow document store), so handlers can
 *   reach the right per-document stores without reading any global "current
 *   workflow" state.
 * - `router` is only needed by handlers that re-run or save the workflow
 *   (`useRunWorkflow` / `useWorkflowSaving`), which cannot call `useRouter()`
 *   from an async, non-setup context.
 * - `suppressExecutionSuccessToasts` / `suppressExecutionErrorToasts` are `true`
 *   when the editor host hides that class of workflow execution result toast —
 *   resolved from the editor context at event time. Hosts like the Instance AI
 *   preview set them so results surface only in their own UI.
 */
export interface PushHandlerOptions {
	router: Router;
	documentId: WorkflowDocumentId;
	suppressExecutionSuccessToasts?: boolean;
	suppressExecutionErrorToasts?: boolean;
}
