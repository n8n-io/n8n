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
 */
export interface PushHandlerOptions {
	router: Router;
	documentId: WorkflowDocumentId;
}
