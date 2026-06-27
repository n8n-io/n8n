import type {
	AgentSkillDependenciesContract,
	AgentSkillInterfaceContract,
	AgentSkillPolicyContract,
} from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { AgentHistory } from './agent-history.entity';
import type { StoredSkillLinkedFiles } from './agent-skill.entity';

@Entity({ name: 'agent_skill_snapshot' })
export class AgentSkillSnapshot extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Published agent_history version this skill snapshot belongs to',
	})
	versionId: string;

	@ManyToOne(() => AgentHistory, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'versionId' })
	version: Relation<AgentHistory>;

	@PrimaryColumn({
		type: 'varchar',
		length: 32,
		comment: 'Stable skill ID referenced from the published agent JSON config',
	})
	skillId: string;

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

	@Column({ name: 'version', type: 'varchar', length: 128, nullable: true })
	versionName: string | null;

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
