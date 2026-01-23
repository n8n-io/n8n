import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from '@n8n/typeorm';
import { IConnections, INode, IWorkflowBase } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import { ExecutionEntity } from './execution-entity';
import { ISimplifiedPinData } from './types-db';
import { WorkflowHistory } from './workflow-history';
import { idStringifier } from '../utils/transformers';

/**
 * Workaround: Pindata causes TS errors from excessively deep type instantiation
 * due to `INodeExecutionData`, so we use a simplified version so `QueryDeepPartialEntity`
 * can resolve and calls to `update`, `insert`, and `insert` pass typechecking.
 */
export type FullWorkflowData = Omit<IWorkflowBase, 'pinData'> & {
	pinData?: ISimplifiedPinData;
};
type VersionedWorkflowData = Omit<FullWorkflowData, 'nodes' | 'connections'> &
	Partial<Pick<FullWorkflowData, 'nodes' | 'connections'>> & {
		pinData?: ISimplifiedPinData;
	};

@Entity()
export class ExecutionData {
	@Column('text')
	data: string;

	// WARNING: the workflowData column has been changed from IWorkflowDb to IWorkflowBase
	// when ExecutionData was introduced as a separate entity.
	// This is because manual executions of unsaved workflows have no workflow id
	// and IWorkflowDb has it as a mandatory field. IWorkflowBase reflects the correct
	// data structure for this entity.

	// FullWorkflowData if workflowVersionId is undefined, otherwise either FullWorkflowData | VersionedWorkflowData
	// depending on which n8n version the execution happened on
	@JsonColumn()
	workflowData: FullWorkflowData | VersionedWorkflowData;

	@PrimaryColumn({ transformer: idStringifier })
	executionId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;

	@ManyToOne('WorkflowHistory', 'versionId')
	@JoinColumn({ name: 'workflowVersionId' })
	workflowHistory?: WorkflowHistory;

	@OneToOne('ExecutionEntity', 'executionData', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'executionId',
	})
	execution: ExecutionEntity;

	// Ensure you provide `{ relations: { workflowHistory: true }}` when using this helper
	getWorkflowData(): FullWorkflowData {
		if (this.workflowVersionId) {
			return {
				...this.workflowData,
				nodes: (this.workflowHistory?.nodes ?? this.workflowData.nodes) as INode[],
				connections:
					this.workflowHistory?.connections ?? (this.workflowData.connections as IConnections),
			};
		}

		return this.workflowData as FullWorkflowData;
	}
}
