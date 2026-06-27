import type {
	AgentSkillDependenciesContract,
	AgentSkillInterfaceContract,
	AgentSkillPolicyContract,
	AgentSkillReference,
} from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';

export interface StoredSkillLinkedFiles {
	references: AgentSkillReference[];
}

@Entity({ name: 'agent_skill_definition' })
export class AgentSkillDefinition extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 32,
		comment: 'Application-generated skill ID referenced from agent JSON config',
	})
	id: string;

	@Index()
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Owning agent; skill definitions are deleted with the agent',
	})
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 512 })
	description: string;

	@Column({ type: 'text' })
	instructions: string;

	@JsonColumn({ nullable: true })
	allowedTools: string[] | null;

	@JsonColumn({ nullable: true })
	recommendedTools: string[] | null;

	@JsonColumn({ name: 'interface', nullable: true })
	interfaceData: AgentSkillInterfaceContract | null;

	@JsonColumn({ nullable: true })
	policy: AgentSkillPolicyContract | null;

	@JsonColumn({ nullable: true })
	dependencies: AgentSkillDependenciesContract | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	version: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	license: string | null;

	@Column({ type: 'text', nullable: true })
	compatibility: string | null;

	@JsonColumn({ nullable: true })
	platforms: string[] | null;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;

	@JsonColumn({ nullable: true })
	linkedFiles: StoredSkillLinkedFiles | null;
}
