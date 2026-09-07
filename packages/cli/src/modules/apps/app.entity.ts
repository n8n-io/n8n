import { Project, WithTimestampsAndStringId } from '@n8n/db';
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
	theme: Record<string, unknown> | null;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;
}
