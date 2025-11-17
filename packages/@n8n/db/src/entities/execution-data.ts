import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';

import { JsonColumn } from './abstract-entity';
import { ExecutionEntity } from './execution-entity';
import { StoredWorkflowData } from './types-db';
import { idStringifier } from '../utils/transformers';

@Entity()
export class ExecutionData {
	@Column('text')
	data: string;

	@JsonColumn()
	workflowData: StoredWorkflowData;

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
