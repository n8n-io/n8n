import type {
	SelfHealingAgentInvestigationOutcome,
	SelfHealingAgentTrigger,
	SelfHealingResultUsage,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { SelfHealingConfiguration } from '../../database/self-healing-configuration.entity';
import { SelfHealingAgentResult } from './self-healing-agent-result.entity';

@Entity('self_healing_agent_investigation')
// One unfinished investigation for each agent: this index is the claim.
@Index(['agentId'], { unique: true, where: '"finishedAt" IS NULL' })
@Index(['agentId', 'createdAt'])
@Index(['configurationId', 'createdAt'])
export class SelfHealingAgentInvestigation extends WithTimestampsAndStringId {
	@Column({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	// The foreign key to `agents` is in the migration only. Instance AI must not import the agent entity.
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Index()
	@Column({ type: 'uuid' })
	backgroundUserId: string;

	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'backgroundUserId' })
	backgroundUser: Relation<User>;

	@Column({ type: 'varchar', length: 16 })
	trigger: SelfHealingAgentTrigger;

	/** The published agent version at admission. */
	@Column({ type: 'varchar', length: 36 })
	agentVersionId: string;

	/** The trace window is `(traceWindowStart, traceWindowEnd]`. A null start has no lower limit. */
	@DateTimeColumn({ nullable: true })
	traceWindowStart: Date | null;

	@DateTimeColumn()
	traceWindowEnd: Date;

	@Column({ type: 'int', default: 0 })
	traceCount: number;

	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'uuid' })
	runId: string;

	/** Null while the investigation runs. */
	@Column({ type: 'varchar', length: 16, nullable: true })
	outcome: SelfHealingAgentInvestigationOutcome | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	failureReason: string | null;

	@JsonColumn({ nullable: true })
	usage: SelfHealingResultUsage | null;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	resultId: string | null;

	@ManyToOne(() => SelfHealingAgentResult, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'resultId' })
	result: Relation<SelfHealingAgentResult> | null;

	@DateTimeColumn({ nullable: true })
	finishedAt: Date | null;
}
