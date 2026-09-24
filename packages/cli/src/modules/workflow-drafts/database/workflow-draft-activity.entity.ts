import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WorkflowDraft } from './workflow-draft.entity';

@Entity('workflow_draft_activity')
@Index(['draftId', 'action'], { unique: true })
export class WorkflowDraftActivityEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar' })
	draftId: string;

	@ManyToOne(() => WorkflowDraft, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'draftId' })
	draft: WorkflowDraft;

	@Column({ type: 'varchar', length: 16 })
	action: 'submitted';

	@Column({ type: 'varchar', length: 16 })
	author: 'assistant';

	@Column({ type: 'int' })
	revision: number;
}
