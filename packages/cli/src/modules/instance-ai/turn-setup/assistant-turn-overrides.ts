import { Service } from '@n8n/di';

/**
 * Where the connection tests of one credential type go instead of the provider.
 * See `InstanceAiEvalCredentialTestTargetRequest`.
 */
export interface AssistantCredentialTestTarget {
	credentialType: string;
	baseUrl: string;
	urlField: string;
}

/**
 * Per-thread overrides of Assistant turns. The turn environment factory reads
 * the credential settings for both runtimes. The Assistant agent also reads the
 * prompt version. Each method returns "no override" here,
 * so normal runtime keeps its default behavior.
 *
 * To supply overrides, extend this class and register the instance with
 * `Container.set(AssistantTurnOverrides, instance)` before the module resolves
 * a service that injects it. Product code then never imports the implementation.
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

	/** The prompt profile version of the thread. `undefined` uses the experiment assignment. */
	getPromptVersion(_threadId: string): string | undefined {
		return undefined;
	}
}
