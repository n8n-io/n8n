import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	Index,
	CreateDateColumn,
	UpdateDateColumn,
	JoinColumn,
} from '@n8n/typeorm';

import type { DataStoreEntity } from './data-store-entity';

@Entity({ name: 'data_store_column_entity' })
@Index(['dataStoreId', 'name'], { unique: true })
export class DataStoreColumnEntity {
	@PrimaryColumn({ length: 36 })
	id: string;

	@Column({ length: 128 })
	name: string;

	@Column({ length: 32 })
	type: string;

	@Column({ type: 'int' })
	columnIndex: number;

	@Column({ length: 36 })
	dataStoreId: string;

	@ManyToOne('DataStoreEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'dataStoreId' })
	dataStore: DataStoreEntity;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
