import { JsonColumn, WithCreatedAt, type User } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';
import type { Agent } from '../../agents/entities/agent.entity';
import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import type { ChatTurn } from './types';

@Entity({ name: 'agent_online_check_case' })
@Index(['agentId', 'threadId'], { unique: true })
export class AgentOnlineCheckCase extends WithCreatedAt {
	@PrimaryGeneratedColumn() id: number;
	@Column({ type: 'varchar', length: 36 }) agentId: string;
	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;
	@Index()
	@Column({
		type: 'varchar',
		length: 36,
		nullable: true,
		comment: 'Source session; null after the session is deleted',
	})
	threadId: string | null;
	@ManyToOne('AgentExecutionThread', { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'threadId' })
	thread: Relation<AgentExecutionThread> | null;
	@Index()
	@Column({
		type: 'uuid',
		nullable: true,
		comment: 'Private session owner; null for a shared project session',
	})
	ownerId: string | null;
	@ManyToOne('User', { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner: Relation<User> | null;
	@Column({ type: 'text' }) title: string;
	@JsonColumn({ comment: 'Fixed recorded conversation and tool timeline used for checks' })
	turns: ChatTurn[];
}
