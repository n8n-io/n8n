import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { idStringifier } from '../utils/transformers';
import { ExecutionEntity } from './ExecutionEntity';
import { jsonColumnType } from './AbstractEntity';
import { IWorkflowBase } from 'n8n-workflow';

@Entity()
export class ExecutionData {
	@Column('text')
	data: string;

	// WARNING: the workflowData column has been changed from IWorkflowDb to IWorkflowBase
	// when ExecutionData was introduced as a separate entity.
	// This is because manual executions of unsaved workflows have no workflow id
	// and IWorkflowDb has it as a mandatory field. IWorkflowBase reflects the correct
	// data structure for this entity.
	@Column(jsonColumnType)
	workflowData: IWorkflowBase;

	@PrimaryColumn({ transformer: idStringifier })
	executionId: string;

	@ManyToOne('ExecutionEntity', 'data', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;
}
