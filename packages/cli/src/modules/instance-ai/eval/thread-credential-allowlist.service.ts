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

	set(threadId: string, credentialIds: string[]): void {
		this.byThread.set(threadId, [...credentialIds]);
	}

	get(threadId: string): string[] | undefined {
		return this.byThread.get(threadId);
	}

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
	}
}
