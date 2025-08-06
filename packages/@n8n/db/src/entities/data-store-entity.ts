import {
	Entity,
	PrimaryColumn,
	Column,
	OneToMany,
	Index,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
} from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column-entity';
import type { Project } from './project';

@Entity({ name: 'data_store_entity' })
@Index(['projectId', 'name'], { unique: true })
export class DataStoreEntity {
	@PrimaryColumn({ length: 36 })
	id: string;

	@Column({ length: 128 })
	name: string;

	@Column({ length: 36 })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	// Ideally, BIGINT would be used, but it is not supported by SQLite
	@Column({ type: 'varchar', length: 255, default: '0' })
	private _sizeBytes: string;

	get sizeBytes(): number {
		return Number(this._sizeBytes);
	}

	set sizeBytes(value: number) {
		this._sizeBytes = value.toString();
	}

	@OneToMany(
		() => DataStoreColumnEntity,
		(column) => column.dataStore,
	)
	columns: DataStoreColumnEntity[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
