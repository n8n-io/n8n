import {
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';
import { IWorkflowBase, UnexpectedError } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import { ExecutionEntity } from './execution-entity';
import { ISimplifiedPinData } from './types-db';
import { WorkflowHistory } from './workflow-history';
import { idStringifier } from '../utils/transformers';

type WorkflowData = Omit<IWorkflowBase, 'pinData'> & { pinData?: ISimplifiedPinData };

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
	@JsonColumn({ nullable: true })
	workflowData: WorkflowData | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;

	@ManyToOne(() => WorkflowHistory, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({
		name: 'workflowVersionId',
		referencedColumnName: 'versionId',
	})
	workflowHistory: Relation<WorkflowHistory> | null;

	@BeforeInsert()
	@BeforeUpdate()
	validateRelations() {
		if (this.workflowData === null && this.workflowVersionId === null) {
			throw new Error('Either workflowData or workflowVersionId must be provided');
		}
	}

	get workflow(): WorkflowData {
		if (this.workflowData) {
			return this.workflowData;
		}

		if (this.workflowHistory === null) {
			throw new UnexpectedError('ExecutionData invariant broken');
		}

		return { ...this.workflowHistory.workflow, ...this.workflowHistory };
	}

	@PrimaryColumn({ transformer: idStringifier })
	executionId: string;

	@OneToOne(
		() => ExecutionEntity,
		(ee) => ee.executionData,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({
		name: 'executionId',
	})
	execution: Relation<ExecutionEntity>;
}
