import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';
import { IWorkflowBase } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import { ExecutionEntity } from './execution-entity';
import { ISimplifiedPinData } from './types-db';
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
	/**
	 * Workaround: Pindata causes TS errors from excessively deep type instantiation
	 * due to `INodeExecutionData`, so we use a simplified version so `QueryDeepPartialEntity`
	 * can resolve and calls to `update`, `insert`, and `insert` pass typechecking.
	 */
	@JsonColumn()
	workflowData: Omit<IWorkflowBase, 'pinData'> & { pinData?: ISimplifiedPinData };

	@PrimaryColumn({ transformer: idStringifier })
	executionId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;

	@OneToOne('ExecutionEntity', 'executionData', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'executionId',
	})
	execution: ExecutionEntity;
}
