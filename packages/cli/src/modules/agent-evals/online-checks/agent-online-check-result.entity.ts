import type { AgentOnlineRubric, AgentOnlineVerdict } from '@n8n/api-types';
import { JsonColumn, WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';
import type { AgentOnlineCheckCase } from './agent-online-check-case.entity';

@Entity({ name: 'agent_online_check_result' })
export class AgentOnlineCheckResult extends WithCreatedAt {
	@PrimaryGeneratedColumn() id: number;
	@Index()
	@Column({ type: 'int' })
	caseId: number;
	@ManyToOne('AgentOnlineCheckCase', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'caseId' })
	testCase: Relation<AgentOnlineCheckCase>;
	@JsonColumn({ comment: 'Checks and generation date used for this assessment' })
	rubric: AgentOnlineRubric;
	@Column({ type: 'text', comment: 'Agent configuration hash at assessment time' })
	configHash: string;
	@JsonColumn({ comment: 'One verdict and reason for each check' }) verdicts: AgentOnlineVerdict[];
}
