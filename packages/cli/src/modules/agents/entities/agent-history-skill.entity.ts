import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * Pins one skill version to one published agent version. `skillRefId` is the ref id as
 * written in that agent_history row's schema, so a snapshot never needs rewriting.
 */
@Entity({ name: 'agent_history_skill' })
export class AgentHistorySkill extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentVersionId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillRefId: string;

	@Index()
	@Column({ type: 'uuid' })
	skillVersionId: string;
}
