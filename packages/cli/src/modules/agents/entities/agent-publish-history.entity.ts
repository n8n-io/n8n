import { WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';
import type { User } from '@n8n/db';

import type { AgentHistory } from './agent-history.entity';
import type { Agent } from './agent.entity';

@Entity({ name: 'agent_publish_history' })
@Index(['agentId', 'id'])
export class AgentPublishHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	versionId: string | null;

	@ManyToOne('AgentHistory', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'versionId' })
	version: Relation<AgentHistory> | null;

	@Column({ type: 'varchar', length: 16 })
	event: 'activated' | 'deactivated';

	@Index()
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'userId' })
	user: Relation<User> | null;

	@Column({ type: 'varchar', length: 255 })
	author: string;

	@Column({ type: 'boolean', default: false })
	isLegacy: boolean;
}
