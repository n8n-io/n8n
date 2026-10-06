import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * Mirrors the skill refs of an agent draft, disabled refs included. A row with a
 * `skillVersionId` is pinned: that draft reads the saved version instead of the
 * skill's live draft row, so edits to the draft row do not reach it.
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
