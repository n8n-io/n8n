import { Service } from '@n8n/di';

import {
	AssistantTurnOverrides,
	type AssistantCredentialTestTarget,
} from '../turn-setup/assistant-turn-overrides';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';

/**
 * Turn overrides that the eval harness sets. The module registers this class
 * only on an eval instance. The credential settings apply to both runtimes.
 */
@Service()
export class EvalAssistantTurnOverrides extends AssistantTurnOverrides {
	constructor(private readonly credentialAllowlists: EvalThreadCredentialAllowlistService) {
		super();
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
}
