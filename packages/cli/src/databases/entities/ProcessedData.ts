import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import type { IProcessedDataEntries, IProcessedDataLatest } from '@/Interfaces';
import { jsonColumnType, WithTimestamps } from './AbstractEntity';
import { objectRetriever } from '../utils/transformers';

@Entity()
@Index(['workflowId', 'context'], { unique: true })
export class ProcessedData extends WithTimestamps {
	@PrimaryColumn('varchar')
	context: string;

	@PrimaryColumn()
	workflowId: string;

	@Column({
		type: jsonColumnType,
		nullable: true,
		transformer: objectRetriever,
	})
	value: IProcessedDataEntries | IProcessedDataLatest;
}
