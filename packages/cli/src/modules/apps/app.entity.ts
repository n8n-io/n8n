import type { AppBinding, AppTheme } from '@n8n/api-types';
import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

@Entity()
@Index(['namespace'], { unique: true })
export class App extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@Column()
	namespace: string;

	@Column({ type: 'json', nullable: true })
	theme: AppTheme | null;

	/** Resources the served app may call through `/apps/<namespace>/api/*`, keyed by `key`. */
	@JsonColumn({ default: '[]' })
	bindings: AppBinding[];

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	/** Version served at `/apps/<namespace>/`; set to null by the database when that version is deleted. */
	@Column({ type: String, nullable: true })
	activeVersionId: string | null;
}
