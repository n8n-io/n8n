import { WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { AgentExecution } from './agent-execution.entity';

@Entity({ name: 'agent_execution_timeline_journal' })
export class AgentExecutionTimelineJournalEntry extends WithTimestamps {
	@ManyToOne(() => AgentExecution, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'executionId' })
	execution: AgentExecution;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	executionId: string;

	@PrimaryColumn({ type: 'int' })
	seq: number;

	@Column({ type: 'text' })
	event: string;
}
