import type { InstanceAiBuildMode } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { EvalThreadCredentialAllowlistService } from '../../eval/thread-credential-allowlist.service';
import { AssistantTurnOverrides } from '../assistant-turn-overrides';
import type { AssistantCredentialTestTarget } from '../../turn-setup/assistant-turn-runtime';

export interface EvalAssistantThreadOverrides {
	mode?: InstanceAiBuildMode;
	promptVersion?: string;
}

/**
 * Turn overrides that the eval harness sets for Assistant agent threads. The
 * module registers this class only on an eval instance. An eval instance is a
 * single main that the harness discards after the run, so the state stays in memory.
 */
@Service()
export class EvalAssistantTurnOverrides extends AssistantTurnOverrides {
	private readonly byThread = new Map<string, EvalAssistantThreadOverrides>();

	constructor(private readonly credentialAllowlists: EvalThreadCredentialAllowlistService) {
		super();
	}

	/** Replace all overrides of the thread. An omitted field has no override. */
	setThreadOverrides(threadId: string, overrides: EvalAssistantThreadOverrides): void {
		const { mode, promptVersion } = overrides;
		this.byThread.set(threadId, { mode, promptVersion });
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

	override getBuildMode(threadId: string): InstanceAiBuildMode | undefined {
		return this.byThread.get(threadId)?.mode;
	}

	override getPromptVersion(threadId: string): string | undefined {
		return this.byThread.get(threadId)?.promptVersion;
	}
}
