import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { BinaryColumn, JsonColumn, WithTimestamps } from './abstract-entity';

@Entity()
export class VectorStoreData extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Column('varchar', { length: 255 })
	@Index()
	memoryKey: string;

	@BinaryColumn()
	vector: Buffer;

	@Column('text')
	content: string;

	@JsonColumn()
	metadata: Record<string, unknown>;
}
