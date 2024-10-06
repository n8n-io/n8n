import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { IProcessedDataEntries, IProcessedDataLatest } from '@/interfaces';

import { jsonColumnType, WithTimestamps } from './abstract-entity';
import { objectRetriever } from '../utils/transformers';

@Entity()
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
