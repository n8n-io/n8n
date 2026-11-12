import { Column, CreateDateColumn, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { JsonValue } from '../../common';
import type { ActionDeclaration } from '../../execution/actions.types';

/**
 * One round of a declaring step that ended with actions
 * (ADR-20261109-store-rounds-in-their-own-table-and-spawned-steps-with-the-graph-steps).
 * It holds only what is new in the round. The outcome of each action is on its
 * spawned step.
 */
@Entity('workflow_step_round')
export class WorkflowStepRound {
	@PrimaryColumn('uuid', { name: 'step_id' })
	stepId!: string;

	@PrimaryColumn('int')
	round!: number;

	@Column('uuid', { name: 'execution_id' })
	executionId!: string;

	/** The engine reads the target and the call id of each action. */
	@Column('jsonb')
	actions!: ActionDeclaration[];

	/** The node's round payload. The engine does not read it. */
	@Column('jsonb')
	payload!: JsonValue;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;
}
