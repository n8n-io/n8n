import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { dbType, JsonColumn, WithTimestamps } from './abstract-entity';
import { Project } from './project';

@Entity()
@Index(['memoryKey', 'projectId'])
export class VectorStoreData extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Column('varchar', { length: 255 })
	@Index()
	memoryKey: string;

	/**
	 * Binary vector storage: bytea for PostgreSQL, blob for SQLite.
	 * Nullable because PostgreSQL uses vectorPgv column when pgvector extension is available.
	 * Only one of vector or vectorPgv is populated (never both).
	 */
	@Column(dbType === 'postgresdb' ? 'bytea' : 'blob', { nullable: true })
	vector: Buffer | null;

	/**
	 * Optional pgvector column for PostgreSQL (vector type).
	 * Added automatically by VectorStoreDataRepository.init() if pgvector extension is available.
	 * When present, provides significant performance improvements for similarity search.
	 * Only one of vector or vectorPgv is populated (never both).
	 * Managed via raw SQL queries in VectorStoreDataRepository (addVectors, similaritySearch).
	 * TypeORM should never read/write this column directly.
	 */
	@Column('varchar', { nullable: true })
	vectorPgv?: unknown;

	@Column('text')
	content: string;

	@JsonColumn()
	metadata: Record<string, unknown>;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;
}
