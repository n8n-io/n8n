import type { CommandResult, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import type { KnowledgeConsumerScope } from './knowledge-consumer-scope';
import type {
	KnowledgeSandboxHandle,
	KnowledgeSandboxProvider,
} from './knowledge-sandbox-provider';

/**
 * Holds the `KnowledgeSandboxProvider` a consumer registers on init (the agents module,
 * over its sandbox runtime) and stands in for it inside the module, so that services
 * the container creates before that registration still get a working instance.
 *
 * The module cannot mirror or search files without a sandbox, so a call before the
 * registration is a wiring mistake and throws instead of degrading.
 */
@Service()
export class KnowledgeSandboxProviderRegistry implements KnowledgeSandboxProvider {
	private provider: KnowledgeSandboxProvider | null = null;

	register(provider: KnowledgeSandboxProvider): void {
		this.provider = provider;
	}

	/** Whether a consumer registered its sandbox provider. */
	get isRegistered(): boolean {
		return this.provider !== null;
	}

	assertConfiguration(scope: KnowledgeConsumerScope): void {
		this.registeredProvider().assertConfiguration(scope);
	}

	async acquire(scope: KnowledgeConsumerScope): Promise<KnowledgeSandboxHandle> {
		return await this.registeredProvider().acquire(scope);
	}

	async executeCommand(
		sandbox: WorkspaceSandbox,
		command: string,
		timeoutMs: number,
	): Promise<CommandResult> {
		return await this.registeredProvider().executeCommand(sandbox, command, timeoutMs);
	}

	async warm(scope: KnowledgeConsumerScope): Promise<void> {
		await this.registeredProvider().warm(scope);
	}

	async destroy(scope: KnowledgeConsumerScope): Promise<void> {
		await this.registeredProvider().destroy(scope);
	}

	private registeredProvider(): KnowledgeSandboxProvider {
		if (!this.provider) {
			throw new UnexpectedError(
				'No knowledge sandbox provider is registered. A consumer module must register one on init before knowledge retrieval runs.',
			);
		}
		return this.provider;
	}
}
