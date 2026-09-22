import { Service } from '@n8n/di';

/**
 * Per-thread credential visibility for evaluation runs. The eval harness
 * declares which credentials a build thread may see; the builder context's
 * credential `list()` is filtered to that set. Threads without an entry see
 * the unfiltered instance listing. An entry also marks the thread as an eval
 * thread, so the agent's own workflow runs go through the mock layer.
 */
@Service()
export class EvalThreadCredentialAllowlistService {
	private readonly byThread = new Map<string, string[]>();
	/** Credential ids whose connection test the adapter resolves as successful
	 *  without contacting the provider — see `bypassCredentialTest` on
	 *  `InstanceAiEvalCredentialAllowlistRequest`. */
	private readonly testBypassByThread = new Map<string, string[]>();
	/** Mock hints for the agent's own runs of seeded workflows, by workflow id. */
	private readonly executionMockHintsByThread = new Map<string, Map<string, string>>();

	set(threadId: string, credentialIds: string[], bypassCredentialTest?: string[]): void {
		this.byThread.set(threadId, [...credentialIds]);
		// Bypass only what the thread can already see: the allowlist narrows, and a
		// bypass must not be the thing that widens. Overwrite rather than merge —
		// the harness re-sends the whole list as it appends mid-run credentials.
		const allowed = new Set(credentialIds);
		this.testBypassByThread.set(
			threadId,
			(bypassCredentialTest ?? []).filter((id) => allowed.has(id)),
		);
	}

	get(threadId: string): string[] | undefined {
		return this.byThread.get(threadId);
	}

	isEvalThread(threadId: string): boolean {
		return this.byThread.has(threadId);
	}

	/**
	 * Whether this thread should treat `credentialId`'s connection test as passing.
	 * Queried per test rather than snapshotted into the credential adapter: the
	 * harness registers a bypass MID-RUN (when the simulated user creates a
	 * credential on a setup card), long after the run's context was built, so an
	 * adapter holding a copy of the list would never see it.
	 */
	shouldBypassTest(threadId: string, credentialId: string): boolean {
		return this.testBypassByThread.get(threadId)?.includes(credentialId) ?? false;
	}

	setExecutionMockHints(threadId: string, hintsByWorkflowId: Record<string, string>): void {
		const hints = this.executionMockHintsByThread.get(threadId) ?? new Map<string, string>();
		for (const [workflowId, hint] of Object.entries(hintsByWorkflowId)) {
			hints.set(workflowId, hint);
		}
		this.executionMockHintsByThread.set(threadId, hints);
	}

	getExecutionMockHints(threadId: string, workflowId: string): string | undefined {
		return this.executionMockHintsByThread.get(threadId)?.get(workflowId);
	}

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
		this.testBypassByThread.delete(threadId);
		this.executionMockHintsByThread.delete(threadId);
	}
}
