import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** Pins one skill version to one published agent version. */
@Entity({ name: 'agent_history_skill' })
export class AgentHistorySkill extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentVersionId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Index()
	@Column({ type: 'uuid' })
	skillVersionId: string;
}
