import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

export type QuotaPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type QuotaEnforcementMode = 'block' | 'warn' | 'workflow';

@Entity()
@Index(['projectId'])
@Index(['workflowId'])
export class ExecutionQuotaConfig extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	/** null = project-level quota (applies to all workflows in the project) */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/** null = project-level quota; non-null = workflow-level quota */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	@Column({ type: 'varchar', length: 10 })
	period: QuotaPeriod;

	@Column({ type: 'int' })
	limit: number;

	@Column({ type: 'varchar', length: 10 })
	enforcementMode: QuotaEnforcementMode;

	/** Workflow ID to trigger when quota is exceeded (only for enforcementMode = 'workflow') */
	@Column({ type: 'varchar', length: 36, nullable: true })
	quotaWorkflowId: string | null;

	@Column({ type: 'boolean', default: true })
	enabled: boolean;

	@CreateDateColumn({ precision: 3 })
	createdAt: Date;

	@UpdateDateColumn({ precision: 3 })
	updatedAt: Date;
}
