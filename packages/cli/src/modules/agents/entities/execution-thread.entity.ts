import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'execution_threads' })
export class ExecutionThread extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/** Denormalized for display — avoids joining agents table when listing threads. */
	@Column({ type: 'varchar', length: 255 })
	agentName: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	projectId: string;
}
