import type { SandboxProvider } from '@n8n/agents/sandbox';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_knowledge_sandboxes' })
export class AgentKnowledgeSandbox extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 16,
		comment: 'Sandbox provider: daytona or n8n-sandbox',
	})
	provider: SandboxProvider;

	@Column({
		type: 'varchar',
		length: 255,
		comment: 'Opaque remote sandbox identifier assigned by the provider',
	})
	sandboxId: string;
}
