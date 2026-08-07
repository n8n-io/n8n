import type { SandboxProvider } from '@n8n/agents/sandbox';
import { BaseRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentKnowledgeSandbox } from '../entities/agent-knowledge-sandbox.entity';

@Service()
export class AgentKnowledgeSandboxRepository extends BaseRepository<AgentKnowledgeSandbox> {
	constructor(dataSource: DataSource) {
		super(AgentKnowledgeSandbox, dataSource.manager);
	}

	async findByAgentAndProvider(
		agentId: string,
		provider: SandboxProvider,
		ctx: OperationContext,
	): Promise<AgentKnowledgeSandbox | null> {
		return await this.managerFor(ctx).findOne(AgentKnowledgeSandbox, {
			where: { agentId, provider },
		});
	}

	async upsertSandboxId(
		agentId: string,
		provider: SandboxProvider,
		sandboxId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).upsert(AgentKnowledgeSandbox, { agentId, provider, sandboxId }, [
			'agentId',
			'provider',
		]);
	}

	async findAllByAgent(agentId: string, ctx: OperationContext): Promise<AgentKnowledgeSandbox[]> {
		return await this.managerFor(ctx).find(AgentKnowledgeSandbox, { where: { agentId } });
	}

	async deleteByAgentProviderAndSandboxId(
		agentId: string,
		provider: SandboxProvider,
		sandboxId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).delete(AgentKnowledgeSandbox, { agentId, provider, sandboxId });
	}
}
