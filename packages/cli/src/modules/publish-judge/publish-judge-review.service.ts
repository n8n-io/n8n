import type {
	PublishJudgeEvent,
	PublishJudgeReviewItem,
	PublishJudgeReviewSummary,
	PublishJudgeReviewVerdict,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import type { PublishJudgeReview } from './database/entities/publish-judge-review.entity';
import { PublishJudgeReviewRepository } from './database/repositories/publish-judge-review.repository';
import type { ApplicableJudge } from './publish-judge-settings.service';
import { PublishJudgeSettingsService } from './publish-judge-settings.service';
import type { PublishJudgeVerdict } from './publish-judge-verdict.store';

const LIST_LIMIT = 100;
/** Enough for a busy week. Above it the oldest days of the chart undercount. */
const SUMMARY_ROW_CAP = 10_000;

export type ReviewedSubject = {
	event: PublishJudgeEvent;
	kind: 'workflow' | 'agent';
	id: string | null;
	name: string;
	versionId: string;
	projectId: string | null;
};

const verdictOf = (verdict: PublishJudgeVerdict | undefined): PublishJudgeReviewVerdict =>
	!verdict || verdict.unavailable ? 'noAnswer' : verdict.allow ? 'allowed' : 'refused';

const dayOf = (date: Date) => date.toISOString().slice(0, 10);

function median(values: number[]): number | null {
	if (values.length === 0) return null;

	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

/** Records each judge review and reads the history back for the monitoring page. */
@Service()
export class PublishJudgeReviewService {
	constructor(
		private readonly logger: Logger,
		private readonly reviews: PublishJudgeReviewRepository,
		private readonly settings: PublishJudgeSettingsService,
	) {}

	/** `verdict` is absent when the judge gave no answer. A failed write never fails the review. */
	async record(
		subject: ReviewedSubject,
		judge: ApplicableJudge,
		verdict: PublishJudgeVerdict | undefined,
		durationMs: number,
	): Promise<void> {
		try {
			const outcome = verdictOf(verdict);
			const stops =
				outcome === 'refused' || (outcome === 'noAnswer' && judge.onUnavailable === 'block');
			const dryRun = judge.mode === 'dryRun';

			await this.reviews.record({
				event: subject.event,
				subjectKind: subject.kind,
				subjectId: subject.id,
				subjectName: subject.name,
				versionId: subject.versionId,
				projectId: subject.projectId,
				judgeScope: judge.scope,
				judgeType: judge.judgeType,
				judgeId: judge.judgeId,
				judgeName: (await this.settings.describe(judge))?.name ?? judge.judgeId,
				verdict: outcome,
				reason: verdict?.reason ?? null,
				durationMs,
				runRef: verdict?.executionId ?? verdict?.sessionId ?? null,
				dryRun,
				// For a dry run this says what an enforcing judge would have done.
				blocked: stops,
			});
		} catch (error) {
			this.logger.warn('Could not record a judge review', { error: ensureError(error).message });
		}
	}

	/** Allowed reviews are stored but not listed: the page is about what a judge stopped. */
	async list(): Promise<PublishJudgeReviewItem[]> {
		const rows = await this.reviews.findLatestNotAllowed(LIST_LIMIT);
		const judgeProjects = new Map<string, string | null>();

		for (const { judgeType, judgeId } of rows) {
			if (judgeProjects.has(judgeId)) continue;
			judgeProjects.set(
				judgeId,
				(await this.settings.describe({ judgeType, judgeId }))?.projectId ?? null,
			);
		}

		return rows.map((row) => this.toItem(row, judgeProjects.get(row.judgeId) ?? null));
	}

	async summary(days: number): Promise<PublishJudgeReviewSummary> {
		const today = new Date();
		const since = new Date(today.getTime() - (days - 1) * Time.days.toMilliseconds);
		since.setUTCHours(0, 0, 0, 0);

		const rows = await this.reviews.findSince(since, SUMMARY_ROW_CAP);
		const byDay = new Map<string, PublishJudgeReviewSummary['byDay'][number]>();
		for (let offset = 0; offset < days; offset++) {
			const date = dayOf(new Date(since.getTime() + offset * Time.days.toMilliseconds));
			byDay.set(date, { date, allowed: 0, refused: 0, noAnswer: 0 });
		}

		const totals = { allowed: 0, refused: 0, noAnswer: 0, blocked: 0, wouldBlock: 0 };
		for (const row of rows) {
			totals[row.verdict]++;
			if (row.blocked) totals[row.dryRun ? 'wouldBlock' : 'blocked']++;

			const day = byDay.get(dayOf(row.createdAt));
			if (day) day[row.verdict]++;
		}

		return {
			days,
			totals,
			medianDurationMs: median(rows.map((row) => row.durationMs)),
			byDay: [...byDay.values()],
		};
	}

	private toItem(row: PublishJudgeReview, judgeProjectId: string | null): PublishJudgeReviewItem {
		const { createdAt, updatedAt: _updatedAt, versionId: _versionId, ...review } = row;

		return { ...review, createdAt: createdAt.toISOString(), judgeProjectId };
	}
}
