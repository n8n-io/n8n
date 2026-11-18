import type { WorkflowTestRunResult } from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity({ name: 'workflow_test' })
export class WorkflowTestEntity extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	@Index()
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'text' })
	source: string;

	@JsonColumn({ nullable: true })
	lastRun: WorkflowTestRunResult | null;
}
