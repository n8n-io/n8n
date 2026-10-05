import type { PromotionRunState } from '@n8n/api-types';
import { DateTimeColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { PromotionConnection } from './promotion-connection.entity';

/**
 * One Promote that opened a merge request. The row survives the deletion of its
 * connection, project, and users, so the inbox keeps its history. The host owns
 * the state while the run is `open`; n8n owns it once it is terminal.
 */
@Entity('promotion_run')
@Index(['state', 'createdAt'])
export class PromotionRun extends WithTimestampsAndStringId {
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	connectionId: string | null;

	/** The project of a project-scoped promote. NULL for an instance promote. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'varchar', length: 255 })
	branchName: string;

	@Column({ type: 'varchar', length: 64 })
	commitSha: string;

	/**
	 * The Review Baseline, frozen when the run leaves `open`. While open it is
	 * computed at read time, because the base branch keeps moving.
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	baselineCommitSha: string | null;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	/** Numeric GitLab project id. Stable across repository renames. */
	@Column({ type: 'int' })
	gitlabProjectId: number;

	/** Scoped to the GitLab project, so it is only unique together with it. */
	@Column({ type: 'int' })
	mergeRequestIid: number;

	@Column({ type: 'text' })
	webUrl: string;

	@Column({ type: 'varchar', length: 16, default: 'open' })
	state: PromotionRunState;

	@Column({ type: 'boolean', default: false })
	hasConflicts: boolean;

	@DateTimeColumn({ nullable: true })
	lastSyncedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	mergedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	/** The n8n user who approved in n8n. The host only sees the token's bot user. */
	@Column({ type: 'uuid', nullable: true })
	approvedById: string | null;

	@DateTimeColumn({ nullable: true })
	approvedAt: Date | null;

	@ManyToOne(() => PromotionConnection, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<PromotionConnection> | null;

	@ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'approvedById' })
	approvedBy: Relation<User> | null;
}
