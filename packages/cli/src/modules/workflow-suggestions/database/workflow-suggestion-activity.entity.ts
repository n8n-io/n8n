import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { WorkflowSuggestion } from './workflow-suggestion.entity';

@Entity('workflow_suggestion_activity')
@Index(['suggestionId', 'action'], { unique: true })
export class WorkflowSuggestionActivityEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar' })
	suggestionId: string;

	@ManyToOne(() => WorkflowSuggestion, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'suggestionId' })
	suggestion: Relation<WorkflowSuggestion>;

	@Column({ type: 'varchar', length: 16 })
	action: 'submitted';

	@Column({ type: 'varchar', length: 16 })
	author: 'assistant';
}
