import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import type { TagEntity } from './tag-entity';

@Entity({ name: 'agents_tags' })
export class AgentTagMapping {
	@PrimaryColumn()
	agentId: string;

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('TagEntity', 'agentMappings')
	@JoinColumn({ name: 'tagId' })
	tags: TagEntity[];
}
