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

	// We use 'text'/'blob' for TypeORM compatibility, migrations create the actual vector type
	@Column({
		type: dbType === 'postgresdb' ? 'text' : 'blob',
	})
	vector: string | Buffer;

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
