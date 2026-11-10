import type { ObservationResumeColumns } from '@n8n/agents';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column } from '@n8n/typeorm';

/**
 * Columns shared by the Agents and Assistant observation cursor tables: where
 * the Observer stopped, and where the model resumes from.
 */
export abstract class ObservationCursorColumns
	extends WithTimestamps
	implements ObservationResumeColumns
{
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
