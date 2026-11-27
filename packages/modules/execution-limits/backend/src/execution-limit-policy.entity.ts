import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** A named execution limit. Each project of the policy counts its own executions. */
@Entity('execution_limit_policy')
export class ExecutionLimitPolicy extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index({ unique: true })
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'int' })
	maxExecutions: number;
}
