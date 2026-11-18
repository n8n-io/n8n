import type {
	PublishJudgeEvent,
	PublishJudgeReviewVerdict,
	PublishJudgeType,
} from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

/** One review by a judge. A history row: it keeps the names it saw. */
@Entity('publish_judge_review')
// The monitoring page reads the last days.
@Index(['createdAt'])
export class PublishJudgeReview extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 32 })
	event: PublishJudgeEvent;

	@Column({ type: 'varchar', length: 16 })
	subjectKind: 'workflow' | 'agent';

	/** `null` for a workflow or an agent that is not saved yet. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	subjectId: string | null;

	@Column({ type: 'text' })
	subjectName: string;

	@Column({ type: 'varchar', length: 64 })
	versionId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 16 })
	judgeScope: 'instance' | 'project';

	@Column({ type: 'varchar', length: 16 })
	judgeType: PublishJudgeType;

	@Column({ type: 'varchar', length: 36 })
	judgeId: string;

	@Column({ type: 'text' })
	judgeName: string;

	@Column({ type: 'varchar', length: 16 })
	verdict: PublishJudgeReviewVerdict;

	@Column({ type: 'text', nullable: true })
	reason: string | null;

	@Column({ type: 'integer' })
	durationMs: number;

	/** Execution id of a workflow judge run, or session id of an agent judge run. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	runRef: string | null;

	@Column({ type: 'boolean', default: false })
	dryRun: boolean;

	@Column({ type: 'boolean', default: false })
	blocked: boolean;
}
