import { Service } from '@n8n/di';

/**
 * Per-thread credential visibility for evaluation runs. The eval harness
 * declares which credentials a build thread may see; the builder context's
 * credential `list()` is filtered to that set. Threads without an entry see
 * the unfiltered instance listing.
 */
@Service()
export class EvalThreadCredentialAllowlistService {
	private readonly byThread = new Map<string, string[]>();
	/** Credential ids whose connection test the adapter resolves as successful
	 *  without contacting the provider — see `bypassCredentialTest` on
	 *  `InstanceAiEvalCredentialAllowlistRequest`. */
	private readonly testBypassByThread = new Map<string, string[]>();

	set(threadId: string, credentialIds: string[], bypassCredentialTest?: string[]): void {
		this.byThread.set(threadId, [...credentialIds]);
		// Bound to the allowlist, which is the property that makes this endpoint
		// safe for an `instanceAi:eval` caller: the allowlist only ever NARROWS
		// what a thread can see, so a bypass outside it would be the one part that
		// widens — synthesizing a passing connection test for a credential the
		// thread cannot even reach, including one owned by somebody else. An id
		// that isn't allowlisted is dropped rather than rejected: the harness
		// re-sends the whole list as it appends mid-run credentials, and ordering
		// there shouldn't fail a run.
		const allowed = new Set(credentialIds);
		// Always overwrite rather than merge: the harness re-sends the whole list
		// when it appends a mid-run credential, so a stale bypass must not survive.
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

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
		this.testBypassByThread.delete(threadId);
	}
}
