import { WithCreatedAt, type User } from '@n8n/db';
import {
	Check,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';
import type { AgentOnlineCheckResult } from './agent-online-check-result.entity';

@Entity({ name: 'agent_online_check_review' })
@Check("\"feedback\" IN ('good', 'bad')")
export class AgentOnlineCheckReview extends WithCreatedAt {
	@PrimaryGeneratedColumn() id: number;
	@Index()
	@Column({ type: 'int' })
	resultId: number;
	@ManyToOne('AgentOnlineCheckResult', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resultId' })
	result: Relation<AgentOnlineCheckResult>;
	@Index()
	@Column({ type: 'uuid', nullable: true, comment: 'Reviewer; null after the user is deleted' })
	userId: string | null;
	@ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User> | null;
	@Column({ type: 'text', comment: 'Check ID in the assessment rubric' }) checkId: string;
	@Column({ type: 'varchar', length: 4, comment: 'Human assessment of the recorded response' })
	feedback: 'good' | 'bad';
}
