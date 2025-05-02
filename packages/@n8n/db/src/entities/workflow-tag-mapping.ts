import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import type { TagEntity } from './tag-entity';
import type { WorkflowEntity } from './workflow-entity';

@Entity({ name: 'workflows_tags' })
export class WorkflowTagMapping {
	@PrimaryColumn()
	workflowId: string;

	@ManyToOne('WorkflowEntity', 'tagMappings')
	@JoinColumn({ name: 'workflowId' })
	workflows: WorkflowEntity[];

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('TagEntity', 'workflowMappings')
	@JoinColumn({ name: 'tagId' })
	tags: TagEntity[];
}
