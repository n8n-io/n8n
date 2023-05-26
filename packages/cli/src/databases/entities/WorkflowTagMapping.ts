import { Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { idStringifier } from '../utils/transformers';
import type { TagEntity } from './TagEntity';
import type { WorkflowEntity } from './WorkflowEntity';

@Entity({ name: 'workflows_tags' })
export class WorkflowTagMapping {
	@PrimaryColumn({ transformer: idStringifier })
	workflowId: string;

	@ManyToOne('WorkflowEntity', 'tagMappings')
	@JoinColumn({ name: 'workflowId' })
	workflows: Relation<WorkflowEntity[]>;

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('TagEntity', 'workflowMappings')
	@JoinColumn({ name: 'tagId' })
	tags: Relation<TagEntity[]>;
}
