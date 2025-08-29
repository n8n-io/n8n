import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';
import { IWorkflowBase } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import { ExecutionEntity } from './execution-entity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class ExecutionData {
	@Column('text')
	data: string;

	// WARNING: the workflowData column has been changed from IWorkflowDb to IWorkflowBase
	// when ExecutionData was introduced as a separate entity.
	// This is because manual executions of unsaved workflows have no workflow id
	// and IWorkflowDb has it as a mandatory field. IWorkflowBase reflects the correct
	// data structure for this entity.
	@JsonColumn()
	workflowData: IWorkflowBase;

	@PrimaryColumn({ transformer: idStringifier })
	executionId: string;

	@OneToOne('ExecutionEntity', 'executionData', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'executionId',
	})
	execution: ExecutionEntity;
}
