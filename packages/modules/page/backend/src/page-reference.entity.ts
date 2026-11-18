import type { PageResourceType } from '@n8n/api-types';
import {
	BaseEntity,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { PageEntity } from './page.entity';

/** The longest resource id that a reference row can hold. */
export const PAGE_REFERENCE_ID_MAX_LENGTH = 255;

/** One n8n resource that the content of a page links to. The rows are derived from the content. */
@Entity({ name: 'page_reference' })
@Index(['resourceType', 'resourceId'])
export class PageReferenceEntity extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	pageId: string;

	@ManyToOne(() => PageEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'pageId' })
	page: Relation<PageEntity>;

	@PrimaryColumn({ type: 'varchar', length: 32 })
	resourceType: PageResourceType;

	@PrimaryColumn({ type: 'varchar', length: PAGE_REFERENCE_ID_MAX_LENGTH })
	resourceId: string;

	/** The workflow id when `resourceType` is `node`. `null` for the other types. */
	@Index()
	@Column({ type: 'varchar', length: PAGE_REFERENCE_ID_MAX_LENGTH, nullable: true })
	parentResourceId: string | null;
}
