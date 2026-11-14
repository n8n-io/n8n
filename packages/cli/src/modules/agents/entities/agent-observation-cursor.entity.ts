import type { ObservationResumeColumns } from '@n8n/agents';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** Where the Observer stopped for an agent scope, and where the model resumes from. */
@Entity({ name: 'agents_observation_cursors' })
@Index(['observationScopeId'])
export class AgentObservationCursorEntity
	extends WithTimestamps
	implements ObservationResumeColumns
{
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastObservedMessageId: string;

	@DateTimeColumn()
	lastObservedAt: Date;

	/** Last message replaced by `resumeNotes`; later requests start after it. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	resumeFromMessageId: string | null;

	@DateTimeColumn({ nullable: true })
	resumeFromAt: Date | null;

	@Column({ type: 'text', nullable: true })
	resumeNotes: string | null;

	@Column({ type: 'int', nullable: true })
	lastRequestTokens: number | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	lastModelId: string | null;
}
