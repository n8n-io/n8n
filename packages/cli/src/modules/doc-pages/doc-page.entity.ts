import type { DocPageKind, DocPageProperties, DocPageResourceType } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/**
 * A documentation page. A root page belongs to one workflow or agent. A child
 * page has a `parentId` and no resource.
 */
@Entity({ name: 'doc_page' })
@Index(['resourceType', 'resourceId'], { unique: true, where: '"resourceId" IS NOT NULL' })
export class DocPageEntity extends WithTimestampsAndStringId {
	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	parentId: string | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	resourceType: DocPageResourceType | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	resourceId: string | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	kind: DocPageKind | null;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	/** Tiptap editor document. Null until the first save in the editor. */
	@JsonColumn({ nullable: true })
	content: Record<string, unknown> | null;

	/** LLM output that waits for the editor to convert it. The first save clears it. */
	@Column({ type: 'text', nullable: true })
	markdown: string | null;

	@Column({ type: 'text' })
	contentText: string;

	/** Facts from the published resource. The publish listener refreshes them. Null on child pages. */
	@JsonColumn({ nullable: true })
	properties: DocPageProperties | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	writtenAgainstVersionId: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
