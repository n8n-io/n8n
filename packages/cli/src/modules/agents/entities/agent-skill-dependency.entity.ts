import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * Mirrors the skill refs of an agent draft, disabled refs included. A row without
 * `skillVersionId` follows the skill: the agent runs the latest saved version, and
 * each Save marks the agent as changed. A row with `skillVersionId` is pinned by a
 * revert: the agent runs that version, and a Save does not reach it.
 */
@Entity({ name: 'agent_skill_dependency' })
export class AgentSkillDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	skillVersionId: string | null;
}
