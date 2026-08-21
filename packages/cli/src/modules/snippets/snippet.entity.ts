import { jsonColumnType, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne } from '@n8n/typeorm';
import type { SnippetTestCase } from 'n8n-workflow';

@Entity()
export class Snippet extends WithTimestampsAndStringId {
	@Column('text')
	name: string;

	/** A single JS expression (typically an arrow function), compiled at evaluation time */
	@Column('text')
	code: string;

	@Column('text', { nullable: true })
	description: string | null;

	/** Unit tests: each `code` is a single expression that must evaluate truthy */
	@Column({ type: jsonColumnType, nullable: true })
	tests: SnippetTestCase[] | null;

	// If null, the snippet is instance-global ($snippets); otherwise project-scoped ($project)
	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Project | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;
}
