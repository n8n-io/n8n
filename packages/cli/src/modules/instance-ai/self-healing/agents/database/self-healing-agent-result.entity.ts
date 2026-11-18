import type {
	AgentProposalEdit,
	AgentProposalEvalCase,
	AgentProposalEvidence,
	SelfHealingAgentApplyProgress,
	SelfHealingAgentGoal,
	SelfHealingAgentReviewState,
	SelfHealingAgentTrigger,
	SelfHealingResultUsage,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { SelfHealingConfiguration } from '../../database/self-healing-configuration.entity';

@Entity('self_healing_agent_result')
@Index(['projectId', 'reviewState'])
@Index(['agentId', 'reviewState'])
@Index(['configurationId', 'updatedAt'])
export class SelfHealingAgentResult extends WithTimestampsAndStringId {
	@Column({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	// The foreign key to `agents` is in the migration only. Instance AI must not import the agent entity.
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/** The agent name when the proposal was saved. The Inbox list reads it. */
	@Column({ type: 'varchar', length: 255 })
	agentName: string;

	@Index()
	@Column({ type: 'uuid' })
	backgroundUserId: string;

	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'backgroundUserId' })
	backgroundUser: Relation<User>;

	/** The published agent version that the investigation read and tested. */
	@Column({ type: 'varchar', length: 36 })
	baseVersionId: string;

	/** The aims of the investigation, in the stored order. The first one is `quality`. */
	@JsonColumn()
	goals: SelfHealingAgentGoal[];

	@Column({ type: 'varchar', length: 16 })
	trigger: SelfHealingAgentTrigger;

	@DateTimeColumn({ nullable: true })
	traceWindowStart: Date | null;

	@DateTimeColumn()
	traceWindowEnd: Date;

	@Column({ type: 'int', default: 0 })
	traceCount: number;

	@Column({ type: 'varchar', length: 255 })
	summary: string;

	@Column({ type: 'text' })
	report: string;

	@JsonColumn()
	edits: AgentProposalEdit[];

	@JsonColumn()
	evalCases: AgentProposalEvalCase[];

	@JsonColumn({ nullable: true })
	evidence: AgentProposalEvidence | null;

	@JsonColumn()
	usage: SelfHealingResultUsage;

	@Column({ type: 'varchar', length: 16, default: 'open' })
	reviewState: SelfHealingAgentReviewState;

	@Column({ type: 'boolean', default: false })
	appliedAutomatically: boolean;

	@Column({ type: 'varchar', length: 36, nullable: true })
	publishedVersionId: string | null;

	@JsonColumn()
	applyProgress: SelfHealingAgentApplyProgress;

	@Column({ type: 'text', nullable: true })
	applyError: string | null;

	/** The claim of an apply in progress. An old claim is from an apply that crashed. */
	@DateTimeColumn({ nullable: true })
	applyStartedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	closedById: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'closedById' })
	closedBy: Relation<User> | null;
}
