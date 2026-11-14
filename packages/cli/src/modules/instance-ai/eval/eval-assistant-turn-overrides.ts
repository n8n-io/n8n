import { Service } from '@n8n/di';

import {
	AssistantTurnOverrides,
	type AssistantCredentialTestTarget,
} from '../turn-setup/assistant-turn-overrides';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';

export interface EvalAssistantThreadOverrides {
	promptVersion?: string;
}

/**
 * Turn overrides that the eval harness sets. The module registers this class
 * only on an eval instance. The credential settings apply to both runtimes. The
 * prompt version applies to Assistant agent threads. An eval
 * instance is a single main that the harness discards after the run, so the
 * state stays in memory.
 */
@Service()
export class EvalAssistantTurnOverrides extends AssistantTurnOverrides {
	private readonly byThread = new Map<string, EvalAssistantThreadOverrides>();

	constructor(private readonly credentialAllowlists: EvalThreadCredentialAllowlistService) {
		super();
	}

	/** Replace all overrides of the thread. An omitted field has no override. */
	setThreadOverrides(threadId: string, overrides: EvalAssistantThreadOverrides): void {
		const { promptVersion } = overrides;
		this.byThread.set(threadId, { promptVersion });
	}

	/** Remove the overrides and the credential settings of the thread. */
	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
		this.credentialAllowlists.clearThread(threadId);
	}

	override getCredentialIdAllowlist(threadId: string): string[] | undefined {
		return this.credentialAllowlists.get(threadId);
	}

	override shouldBypassCredentialTest(threadId: string, credentialId: string): boolean {
		return this.credentialAllowlists.shouldBypassTest(threadId, credentialId);
	}

	override getCredentialTestTarget(
		threadId: string,
		credentialType: string,
	): AssistantCredentialTestTarget | undefined {
		return this.credentialAllowlists.getTestTarget(threadId, credentialType);
	}

	override getPromptVersion(threadId: string): string | undefined {
		return this.byThread.get(threadId)?.promptVersion;
	}
}
