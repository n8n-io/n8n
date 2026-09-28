import { type CredentialsEntity, WithCreatedAt } from '@n8n/db';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import type { Agent } from './agent.entity';

@Entity({ name: 'agent_credential_dependency' })
export class AgentCredentialDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	credentialId: string;

	@ManyToOne('CredentialsEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credentialId' })
	credential: Relation<CredentialsEntity>;
}
