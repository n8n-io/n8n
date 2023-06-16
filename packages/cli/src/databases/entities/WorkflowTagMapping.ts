import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { idStringifier } from '../utils/transformers';
import type { TagEntity } from './TagEntity';
import type { WorkflowEntity } from './WorkflowEntity';

@Entity({ name: 'workflows_tags' })
export class WorkflowTagMapping {
	@PrimaryColumn({ transformer: idStringifier })
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
