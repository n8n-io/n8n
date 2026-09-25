import type {
	WorkflowSuggestionContent,
	WorkflowSuggestionLifecycleResult,
	WorkflowSuggestionSource,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity('workflow_suggestion')
@Index(['workflowId'], { unique: true, where: "state = 'pending'" })
@Index(['state', 'updatedAt'])
@Index(['state', 'closedAt'])
export class WorkflowSuggestion extends WithTimestampsAndStringId {
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
	expectedBaseline: WorkflowSuggestionSource['expectedBaseline'];

	@Column({ type: 'varchar', length: 16 })
	state: WorkflowSuggestionLifecycleResult['state'];

	@Column({ type: 'int' })
	revision: number;

	@Column({ type: 'int', nullable: true })
	submittedRevision: number | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	closedReason: WorkflowSuggestionLifecycleResult['closedReason'];

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	@JsonColumn({ nullable: true })
	payload: WorkflowSuggestionContent | null;
}
