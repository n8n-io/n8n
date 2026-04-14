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

	/** LLM-generated summary of the first user message. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	title: string | null;

	/** Emoji representing the session topic. */
	@Column({ type: 'varchar', length: 8, nullable: true })
	emoji: string | null;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	projectId: string;

	/** Stable, project-scoped incrementing counter assigned at creation. */
	@Column({ type: 'int', default: 0 })
	sessionNumber: number;

	@Column({ type: 'int', default: 0 })
	totalPromptTokens: number;

	@Column({ type: 'int', default: 0 })
	totalCompletionTokens: number;

	@Column({ type: 'double precision', default: 0 })
	totalCost: number;

	/** Total generation time across all messages, in milliseconds. */
	@Column({ type: 'int', default: 0 })
	totalDuration: number;
}
