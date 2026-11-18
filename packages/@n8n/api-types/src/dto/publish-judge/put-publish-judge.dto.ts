import { z } from 'zod';

import { Z } from '../../zod-class';

export const publishJudgeOnUnavailableSchema = z.enum(['block', 'allow']);

export type PublishJudgeOnUnavailable = z.infer<typeof publishJudgeOnUnavailableSchema>;

export const publishJudgeTypeSchema = z.enum(['workflow', 'agent']);

/** What gives the verdict: a workflow that returns it, or an agent that answers it. */
export type PublishJudgeType = z.infer<typeof publishJudgeTypeSchema>;

export const publishJudgeEventSchema = z.enum([
	'workflowPublish',
	'workflowSave',
	'agentPublish',
	'agentSave',
]);

/** What a judge reviews. A save is refused the same way as a publish. */
export type PublishJudgeEvent = z.infer<typeof publishJudgeEventSchema>;

/** The `kind` of the policy violations that a judge refusal carries. */
export const PUBLISH_JUDGE_VIOLATION_KIND = {
	denied: 'publish-judge-denied',
	unavailable: 'publish-judge-unavailable',
} as const;

export const DEFAULT_PUBLISH_JUDGE_EVENTS: PublishJudgeEvent[] = ['workflowPublish'];

export const publishJudgeModeSchema = z.enum(['enforce', 'dryRun']);

/** A dry-run judge records its verdicts and blocks nothing. */
export type PublishJudgeMode = z.infer<typeof publishJudgeModeSchema>;

export type PublishJudgeReviewVerdict = 'allowed' | 'refused' | 'noAnswer';

/** One review by a judge, as the monitoring page lists it. */
export type PublishJudgeReviewItem = {
	id: number;
	createdAt: string;
	event: PublishJudgeEvent;
	subjectKind: 'workflow' | 'agent';
	subjectId: string | null;
	subjectName: string;
	projectId: string | null;
	judgeScope: 'instance' | 'project';
	judgeType: PublishJudgeType;
	judgeId: string;
	judgeName: string;
	verdict: PublishJudgeReviewVerdict;
	reason: string | null;
	durationMs: number;
	/** Execution id of a workflow judge run, or session id of an agent judge run. */
	runRef: string | null;
	/** Project of the judge, to link to its run. `null` when the judge no longer exists. */
	judgeProjectId: string | null;
	dryRun: boolean;
	blocked: boolean;
};

type ReviewCounts = Record<PublishJudgeReviewVerdict, number>;

export type PublishJudgeReviewSummary = {
	days: number;
	totals: ReviewCounts & { blocked: number; wouldBlock: number };
	/** Median judge response time over the period, or `null` with no review. */
	medianDurationMs: number | null;
	/** One entry for each day, oldest first. `date` is `YYYY-MM-DD` in UTC. */
	byDay: Array<ReviewCounts & { date: string }>;
};

/** The judge of one scope: the instance, or one project. */
export type PublishJudgeSettings = {
	judgeType: PublishJudgeType;
	/** Id of the workflow or of the agent. */
	judgeId: string;
	/** `null` when the workflow or the agent no longer exists. */
	judgeName: string | null;
	/** What a publish does when the judge gives no answer. */
	onUnavailable: PublishJudgeOnUnavailable;
	events: PublishJudgeEvent[];
	mode: PublishJudgeMode;
	/** Whether `events` has the agent publish. Kept for callers that predate the event list. */
	reviewAgents: boolean;
};

/** The judge of one project, as the instance admin page lists it. */
export type ProjectPublishJudge = PublishJudgeSettings & { projectId: string };

export class PutPublishJudgeDto extends Z.class({
	judgeType: publishJudgeTypeSchema.default('workflow'),
	/** `null` removes the judge of this scope. */
	judgeId: z.string().min(1).nullable(),
	onUnavailable: publishJudgeOnUnavailableSchema.default('block'),
	/** Absent means the default events, plus the agent publish when `reviewAgents` is set. */
	events: z.array(publishJudgeEventSchema).optional(),
	reviewAgents: z.boolean().optional(),
	/** Absent means `enforce`. Optional so callers that predate the mode still compile. */
	mode: publishJudgeModeSchema.optional(),
}) {}
