import { JsonColumn, WithCreatedAt } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import type { ExecutionLimitChange } from './execution-limits.types';

@Entity('execution_limit_audit')
export class ExecutionLimitAudit extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 32 })
	field: ExecutionLimitChange['field'];

	@JsonColumn({ nullable: true })
	oldValue: ExecutionLimitChange['oldValue'];

	@JsonColumn({ nullable: true })
	newValue: ExecutionLimitChange['newValue'];

	@Column({ type: 'uuid', nullable: true })
	updatedBy: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	loginId: string | null;
}
