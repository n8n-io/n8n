import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import type { TagEntity } from './tag-entity';

@Entity({ name: 'agents_tags' })
export class AgentTagMapping {
	/**
	 * Plain column, no relation to the `Agent` entity: `Agent` lives in
	 * `packages/cli` and a cross-package relation target would break
	 * `@n8n/db`-only test data sources. The `Agent.tags` many-to-many joins
	 * this table on the column directly.
	 */
	@PrimaryColumn()
	agentId: string;

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('TagEntity', 'agentMappings')
	@JoinColumn({ name: 'tagId' })
	tags: TagEntity;
}
