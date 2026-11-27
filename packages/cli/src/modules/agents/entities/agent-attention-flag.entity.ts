import type { AgentAttentionFlagType } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { AgentExecutionThread } from './agent-execution-thread.entity';

@Entity({ name: 'agent_attention_flags' })
@Index(['sessionId', 'type'], { unique: true })
export class AgentAttentionFlagEntity extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 32, comment: 'Attention reason: session-error' })
	type: AgentAttentionFlagType;

	@Column({ type: 'varchar', length: 128, comment: 'Session that needs administrator attention' })
	sessionId: string;

	@ManyToOne(() => AgentExecutionThread, { onDelete: 'CASCADE', nullable: false })
	@JoinColumn({ name: 'sessionId' })
	session: Relation<AgentExecutionThread>;
}
