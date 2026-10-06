import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_session_output_files' })
@Index(['projectId', 'threadId'])
@Unique(['threadId', 'fileName'])
export class AgentSessionOutputFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent> | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 128 })
	runId: string;

	@Column({ type: 'varchar', length: 128 })
	writerId: string;

	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;

	@Column({ type: 'text' })
	binaryDataId: string;
}
