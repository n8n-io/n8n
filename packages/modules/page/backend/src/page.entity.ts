import { Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

@Entity({ name: 'page' })
export class PageEntity extends WithTimestampsAndStringId {
	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	/** Markdown. A link to an editor path is a reference to an n8n resource. */
	@Column({ type: 'text', default: '' })
	content: string;

	/** Grows by one on each saved change. */
	@Column({ type: 'int', default: 1 })
	version: number;

	/** The author. `null` after the author is deleted. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;
}
