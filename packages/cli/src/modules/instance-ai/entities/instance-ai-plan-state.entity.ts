import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import type { InstanceAiPlanSpec } from '@n8n/api-types';

@Entity({ name: 'instance_ai_plan_states' })
export class InstanceAiPlanState extends WithTimestamps {
	@PrimaryColumn('varchar')
	threadId: string;

	@Index()
	@Column({ type: 'varchar' })
	planId: string;

	@Column({ type: 'int', default: 1 })
	version: number;

	@JsonColumn()
	plan: InstanceAiPlanSpec;
}
