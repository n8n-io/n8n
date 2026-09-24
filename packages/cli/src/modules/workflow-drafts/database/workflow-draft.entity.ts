import type {
	WorkflowDraftContent,
	WorkflowDraftLifecycleResult,
	WorkflowDraftSource,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity('workflow_draft')
@Index(['workflowId'], { unique: true, where: "state = 'pending'" })
@Index(['state', 'updatedAt'])
@Index(['state', 'closedAt'])
export class WorkflowDraft extends WithTimestampsAndStringId {
	@Index({ unique: true })
	@Column({ type: 'varchar', length: 255 })
	sourceKey: string;

	// Historical identities must survive user, project, and workflow deletion.
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'uuid' })
	backgroundUserId: string;

	@JsonColumn()
	expectedBaseline: WorkflowDraftSource['expectedBaseline'];

	@Column({ type: 'varchar', length: 16 })
	state: WorkflowDraftLifecycleResult['state'];

	@Column({ type: 'int' })
	revision: number;

	@Column({ type: 'int', nullable: true })
	submittedRevision: number | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	closedReason: WorkflowDraftLifecycleResult['closedReason'];

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	@JsonColumn({ nullable: true })
	payload: WorkflowDraftContent | null;
}
