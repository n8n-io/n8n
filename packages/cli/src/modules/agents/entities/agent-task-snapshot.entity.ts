import { AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH, AGENT_TASK_ID_MAX_LENGTH } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { AgentHistory } from './agent-history.entity';

/** Immutable task body captured for a single published agent version. */
@Entity({ name: 'agent_task_snapshot' })
export class AgentTaskSnapshot extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Published agent_history version this task snapshot belongs to',
	})
	versionId: string;

	@ManyToOne(() => AgentHistory, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'versionId' })
	version: Relation<AgentHistory>;

	@PrimaryColumn({
		type: 'varchar',
		length: AGENT_TASK_ID_MAX_LENGTH,
		comment: 'Stable task ID referenced from the published agent JSON config',
	})
	taskId: string;

	@Column({
		type: 'boolean',
		comment: 'Published enabled state for this task at publish time',
	})
	enabled: boolean;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({
		type: 'text',
		comment: 'User-authored instruction sent to the agent when this task runs',
	})
	objective: string;

	@Column({
		type: 'varchar',
		length: AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH,
		comment: 'Cron schedule evaluated in the timezone of this task',
	})
	cronExpression: string;

	// Same shape as `scheduled_job.timezone`.
	@Column({
		type: 'varchar',
		length: 64,
		nullable: true,
		comment: 'IANA timezone the cron is evaluated in; null falls back to the instance timezone',
	})
	timezone: string | null;
}
