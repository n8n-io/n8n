import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, Unique } from '@n8n/typeorm';

/**
 * Tracks execution counts per project/workflow per period window.
 * One row per (projectId, workflowId, periodStart) combination.
 */
@Entity()
@Unique(['projectId', 'workflowId', 'periodStart'])
@Index(['projectId', 'periodStart'])
@Index(['workflowId', 'periodStart'])
export class ExecutionQuotaCounter extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	/** null = project-level aggregate counter */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	/** Start of the period window this counter tracks */
	@Column({ type: 'timestamp' })
	periodStart: Date;

	@Column({ type: 'int', default: 0 })
	count: number;
}
