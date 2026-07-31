import { type CredentialsEntity, WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { Agent } from './agent.entity';

export type AgentCredentialDependencySource = 'draft' | 'published';

@Entity({ name: 'agent_credential_dependency' })
export class AgentCredentialDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 16,
		comment: 'Agent configuration snapshot that references the credential',
	})
	source: AgentCredentialDependencySource;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	credentialId: string;

	@ManyToOne('CredentialsEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credentialId' })
	credential: Relation<CredentialsEntity>;

	@Column({
		type: 'varchar',
		length: 36,
		nullable: true,
		comment: 'Published agent version; null for the current draft',
	})
	sourceVersionId: string | null;
}
