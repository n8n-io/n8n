import type { ObservationResumeColumns } from '@n8n/agents';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/** Where the Observer stopped, and where the model resumes from. */
@Entity({ name: 'instance_ai_observation_cursors' })
export class InstanceAiObservationCursor
	extends WithTimestamps
	implements ObservationResumeColumns
{
	@PrimaryColumn({ type: 'uuid' })
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
