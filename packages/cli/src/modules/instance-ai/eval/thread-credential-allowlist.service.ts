import { Service } from '@n8n/di';

/** Where the thread's connection tests for one credential type go instead of
 *  the provider. See `InstanceAiEvalCredentialTestTargetRequest`. */
export interface EvalCredentialTestTarget {
	credentialType: string;
	baseUrl: string;
	urlField: string;
}

/**
 * Per-thread credential settings for evaluation runs. The eval harness
 * declares which credentials a build thread may see; the builder context's
 * credential `list()` is filtered to that set. Threads without an entry see
 * the unfiltered instance listing. The harness can also bypass a credential's
 * connection test, or aim it at a provider stand-in.
 */
@Service()
export class EvalThreadCredentialAllowlistService {
	private readonly byThread = new Map<string, string[]>();
	/** Credential ids whose connection test the adapter resolves as successful
	 *  without contacting the provider — see `bypassCredentialTest` on
	 *  `InstanceAiEvalCredentialAllowlistRequest`. */
	private readonly testBypassByThread = new Map<string, string[]>();
	/** Thread id → credential type → target. */
	private readonly testTargetsByThread = new Map<string, Map<string, EvalCredentialTestTarget>>();

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

	/** Replaces an earlier target for the same credential type only. */
	setTestTarget(threadId: string, target: EvalCredentialTestTarget): void {
		const targets = this.testTargetsByThread.get(threadId) ?? new Map();
		targets.set(target.credentialType, { ...target });
		this.testTargetsByThread.set(threadId, targets);
	}

	getTestTarget(threadId: string, credentialType: string): EvalCredentialTestTarget | undefined {
		return this.testTargetsByThread.get(threadId)?.get(credentialType);
	}

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
		this.testBypassByThread.delete(threadId);
		this.testTargetsByThread.delete(threadId);
	}
}
