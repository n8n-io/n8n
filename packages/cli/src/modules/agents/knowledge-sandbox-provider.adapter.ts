import type { CommandResult, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';

import type { KnowledgeConsumerScope } from '@/modules/knowledge/knowledge-consumer-scope';
import type {
	KnowledgeSandboxHandle,
	KnowledgeSandboxProvider,
} from '@/modules/knowledge/knowledge-sandbox-provider';

import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';

/**
 * The knowledge sandbox of an agent, as the knowledge module asks for it. Each call
 * hands the scope's project and agent ids to the sandbox runtime unchanged, so the
 * sandbox id derivation and lifecycle settings stay where they are. The agents module
 * registers it on `KnowledgeSandboxProviderRegistry` on init.
 */
@Service()
export class AgentKnowledgeSandboxProvider implements KnowledgeSandboxProvider {
	constructor(private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService) {}

	assertConfiguration(scope: KnowledgeConsumerScope): void {
		this.agentSandboxRuntimeService.assertSandboxConfiguration(scope.projectId, scope.agentId);
	}

	async acquire(scope: KnowledgeConsumerScope): Promise<KnowledgeSandboxHandle> {
		return await this.agentSandboxRuntimeService.acquireKnowledgeSandbox(
			scope.projectId,
			scope.agentId,
		);
	}

	async executeCommand(
		sandbox: WorkspaceSandbox,
		command: string,
		timeoutMs: number,
	): Promise<CommandResult> {
		return await this.agentSandboxRuntimeService.executeSandboxCommand(sandbox, command, timeoutMs);
	}

	async warm(scope: KnowledgeConsumerScope): Promise<void> {
		await this.agentSandboxRuntimeService.warmKnowledgeSandbox(scope.projectId, scope.agentId);
	}

	async destroy(scope: KnowledgeConsumerScope): Promise<void> {
		await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(scope.projectId, scope.agentId);
	}
}
