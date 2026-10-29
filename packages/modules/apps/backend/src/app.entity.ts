import type { AppBinding, AppVisibility } from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'app' })
@Index(['namespace'], { unique: true })
export class App extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	namespace: string;

	@Column({ type: 'varchar', length: 16, default: 'project' })
	visibility: AppVisibility;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	draftVersionId: string | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	publishedVersionId: string | null;

	@JsonColumn({ default: '[]' })
	bindings: AppBinding[];
}
