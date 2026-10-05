import type { WorkflowSuggestionActivity as WorkflowSuggestionActivityDto } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { WorkflowSuggestion } from './workflow-suggestion.entity';

@Entity('workflow_suggestion_activity')
@Index(['suggestionId', 'action'], { unique: true })
export class WorkflowSuggestionActivity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	suggestionId: string;

	@ManyToOne(() => WorkflowSuggestion, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'suggestionId' })
	suggestion: Relation<WorkflowSuggestion>;

	@Column({ type: 'varchar', length: 16 })
	action: WorkflowSuggestionActivityDto['action'];

	@Column({ type: 'varchar', length: 16 })
	author: WorkflowSuggestionActivityDto['author'];
}
