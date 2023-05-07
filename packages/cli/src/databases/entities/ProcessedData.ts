import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { IProcessedDataEntries, IProcessedDataLatest } from '@/Interfaces';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';
import { objectRetriever } from '../utils/transformers';

@Entity()
@Index(['workflowId', 'context'], { unique: true })
export class ProcessedData extends AbstractEntity {
	// @Column('varchar')
	@PrimaryColumn('varchar')
	context: string;

	// @Column()
	@PrimaryColumn()
	workflowId: string;

	@Column({
		type: jsonColumnType,
		nullable: true,
		transformer: objectRetriever,
	})
	value: IProcessedDataEntries | IProcessedDataLatest;
}
