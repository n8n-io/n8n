import type { InstanceAiBuildMode } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { AssistantCredentialTestTarget } from '../turn-setup/assistant-turn-runtime';

/**
 * Per-thread overrides of Assistant agent turns. The turn setup reads them
 * when it builds a turn. Each method returns "no override" here, so normal
 * runtime keeps its default behavior.
 *
 * To supply overrides, extend this class and register the instance with
 * `Container.set(AssistantTurnOverrides, instance)` before the Assistant
 * agent registers. Product code then never imports the implementation.
 */
@Service()
export class AssistantTurnOverrides {
	/** The credential ids that the thread can see. `undefined` shows all credentials. */
	getCredentialIdAllowlist(_threadId: string): string[] | undefined {
		return undefined;
	}

	/** Whether the connection test of the credential passes without a call to the provider. */
	shouldBypassCredentialTest(_threadId: string, _credentialId: string): boolean {
		return false;
	}

	/** Where the connection tests of a credential type go instead of the provider. */
	getCredentialTestTarget(
		_threadId: string,
		_credentialType: string,
	): AssistantCredentialTestTarget | undefined {
		return undefined;
	}

	/** The build mode of the thread. `undefined` uses the experiment assignment. */
	getBuildMode(_threadId: string): InstanceAiBuildMode | undefined {
		return undefined;
	}

	/** The prompt profile version of the thread. It takes precedence over the build mode. */
	getPromptVersion(_threadId: string): string | undefined {
		return undefined;
	}
}
