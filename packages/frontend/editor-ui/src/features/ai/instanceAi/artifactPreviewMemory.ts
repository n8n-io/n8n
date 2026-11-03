import type { RememberedManualExecution } from './canvasPreview.utils';

/**
 * Workflow preview state that must survive the preview unmounting on a tab
 * switch. A thread keeps one, so a new thread starts fresh (INS-611, INS-1192).
 */
export function createArtifactPreviewMemory() {
	// Latest user-triggered (non-agent) preview run per workflow, re-seeded on remount.
	// Plain Map: only read imperatively (on push events / remount), never rendered.
	const rememberedManualExecutions = new Map<string, RememberedManualExecution>();
	function rememberManualExecution(
		workflowId: string,
		executionId: string,
		agentExecutionId: string | undefined,
	): void {
		rememberedManualExecutions.set(workflowId, { executionId, agentExecutionId });
	}
	function getRememberedManualExecution(workflowId: string): RememberedManualExecution | undefined {
		return rememberedManualExecutions.get(workflowId);
	}
	function forgetManualExecution(workflowId: string): void {
		rememberedManualExecutions.delete(workflowId);
	}

	// Artifact logs panel auto-open bookkeeping.
	const logsPanelMemory = {
		// The user collapsed the panel in this thread, so later runs do not open it again.
		collapsedByUser: false,
		// Only a panel that opened automatically collapses after a successful run.
		autoOpened: false,
		// Latest started run per workflow id. Only the success of that run collapses the panel.
		latestStartedExecutionIds: new Map<string, string>(),
	};

	return {
		rememberManualExecution,
		getRememberedManualExecution,
		forgetManualExecution,
		logsPanelMemory,
	};
}
