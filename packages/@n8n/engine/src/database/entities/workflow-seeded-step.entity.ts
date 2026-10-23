import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { StepSlots } from '../../execution/execution.types';

/**
 * The outputs a caller supplied for a step at start, read when the run reaches
 * that step. One row per node and pass, so a settlement loads only the passes
 * it is about to record.
 */
@Entity('workflow_seeded_step')
export class WorkflowSeededStep {
	@PrimaryColumn('uuid', { name: 'execution_id' })
	executionId!: string;

	@PrimaryColumn('varchar', { name: 'node_id' })
	nodeId!: string;

	@PrimaryColumn('int')
	iteration!: number;

	@Column('jsonb')
	outputs!: StepSlots;
}
