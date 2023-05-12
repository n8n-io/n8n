import { Column, Entity, ManyToOne } from 'typeorm';
import { IWorkflowDb } from '@/Interfaces';
import { idStringifier } from '../utils/transformers';
import { ExecutionEntity } from './ExecutionEntity';
import { jsonColumnType } from './AbstractEntity';

@Entity()
export class ExecutionData {
	@Column('text')
	data: string;

	@Column(jsonColumnType)
	workflowData: IWorkflowDb;

	@Column({ nullable: true, transformer: idStringifier })
	executionId: string;

	@ManyToOne('ExecutionEntity', 'data', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;
}
