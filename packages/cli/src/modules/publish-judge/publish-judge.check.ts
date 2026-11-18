import { PUBLISH_JUDGE_VIOLATION_KIND } from '@n8n/api-types';
import type { PolicyViolation, PublishJudgeEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type {
	PolicedArtifactKind,
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
	WorkflowSaveContext,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IDataObject } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import type { JudgeReview } from './publish-judge-runner.service';
import type { ReviewedSubject } from './publish-judge-review.service';
import { PublishJudgeReviewService } from './publish-judge-review.service';
import { PublishJudgeRunner } from './publish-judge-runner.service';
import type { ApplicableJudge } from './publish-judge-settings.service';
import { PublishJudgeSettingsService } from './publish-judge-settings.service';
import type { PublishJudgeVerdict } from './publish-judge-verdict.store';
import { PublishJudgeVerdictStore } from './publish-judge-verdict.store';
import { PublishJudgeConfig } from './publish-judge.config';

const CHECK_ID = 'publish-judge';
/** A new workflow or agent has no id yet, and its content hash tells it apart. */
const NEW_SUBJECT_ID = 'new';
const NO_ANSWER = 'The judge did not answer. Try again, or ask an admin.';
/** Long enough for the check that follows the prepare step, short enough for a retry. */
const NO_ANSWER_TTL_MS = 30 * Time.seconds.toMilliseconds;

/**
 * What is reviewed. `versionId` is the saved version for a publish. A save has no version
 * yet, so it is a hash of the content.
 */
type Subject = { kind: PolicedArtifactKind; id: string; versionId: string };

type Judged = { subject: Subject; judges: ApplicableJudge[] };

const eventFor = (kind: PolicedArtifactKind, action: 'Publish' | 'Save'): PublishJudgeEvent =>
	`${kind}${action}`;

/** A dry-run judge records its verdicts and blocks nothing. */
const isEnforcing = (judge: ApplicableJudge) => judge.mode !== 'dryRun';

/** Through JSON, so stored or request content becomes plain data for the judge. */
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? {})) as IDataObject;

/**
 * Lets admin-chosen judges decide whether a workflow or an agent may be published or saved:
 * one judge for the instance and one for the project. A judge is a workflow or an agent.
 *
 * The judges run only in the prepare steps. The checks only read the stored verdicts, so
 * startup, the leader's second check and previews never start a judge run.
 */
@PolicyCheck()
export class PublishJudgeCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	constructor(
		private readonly config: PublishJudgeConfig,
		private readonly logger: Logger,
		private readonly settings: PublishJudgeSettingsService,
		private readonly runner: PublishJudgeRunner,
		private readonly verdicts: PublishJudgeVerdictStore,
		private readonly reviews: PublishJudgeReviewService,
	) {}

	async prepareWorkflowPublish(context: WorkflowPublishContext): Promise<void> {
		const publish = await this.judgedPublish(context);
		if (!publish) return;

		await Promise.all(
			publish.judges.map(
				async (judge) =>
					await this.askJudge(
						judge,
						publish.subject,
						async () => await this.publishReview(publish.subject, context),
						{
							event: eventFor(publish.subject.kind, 'Publish'),
							name: context.workflow.name,
							projectId: context.projectId,
						},
					),
			),
		);
	}

	async onWorkflowPublish(context: WorkflowPublishContext): Promise<PolicyCheckResult> {
		const publish = await this.judgedPublish(context);
		if (!publish) return { violations: [] };

		const { subject, judges } = publish;
		// A version that is already live was published under the rules of its time.
		const alreadyLive =
			(await this.runner.publishedVersionOf({ judgeType: subject.kind, judgeId: subject.id })) ===
			subject.versionId;

		const violations: PolicyViolation[] = [];

		for (const judge of judges.filter(isEnforcing)) {
			const verdict = await this.verdictOf(judge, subject);

			if (verdict) {
				if (!verdict.allow) violations.push(this.refusal(verdict, judge, context.projectId));
			} else if (!alreadyLive && judge.onUnavailable === 'block') {
				violations.push(
					this.refusal(
						{ allow: false, reason: NO_ANSWER, unavailable: true },
						judge,
						context.projectId,
					),
				);
			}
		}

		return { violations };
	}

	/** Runs on each save. A judge that does not answer stores a short refusal when it blocks. */
	async prepareWorkflowSave(context: WorkflowSaveContext): Promise<void> {
		const save = await this.judgedSave(context);
		if (!save) return;

		await Promise.all(
			save.judges.map(async (judge) => {
				const answered = await this.askJudge(
					judge,
					save.subject,
					() => this.saveReview(save.subject, context),
					{
						event: eventFor(save.subject.kind, 'Save'),
						name: context.workflow.name,
						projectId: context.projectId,
					},
				);
				if (answered || judge.onUnavailable !== 'block' || !isEnforcing(judge)) return;

				const judgeVersionId = (await this.runner.publishedVersionOf(judge)) ?? 'unpublished';
				await this.verdicts.set(
					{ ...this.keyOf(save.subject), judgeVersionId },
					{ allow: false, reason: NO_ANSWER, unavailable: true },
					NO_ANSWER_TTL_MS,
				);
			}),
		);
	}

	/**
	 * A save without a verdict is clear: the prepare step that ran just before stores every
	 * refusal, and an advisory call that ran no judge must not report one.
	 */
	async onWorkflowSave(context: WorkflowSaveContext): Promise<PolicyCheckResult> {
		const save = await this.judgedSave(context);
		if (!save) return { violations: [] };

		const violations: PolicyViolation[] = [];

		for (const judge of save.judges.filter(isEnforcing)) {
			const verdict = await this.verdictOf(judge, save.subject);
			if (verdict && !verdict.allow) {
				violations.push(this.refusal(verdict, judge, context.projectId));
			}
		}

		return { violations };
	}

	private async verdictOf(judge: ApplicableJudge, subject: Subject) {
		const judgeVersionId = (await this.runner.publishedVersionOf(judge)) ?? 'unpublished';

		return await this.verdicts.get({ ...this.keyOf(subject), judgeVersionId });
	}

	/** Returns whether a verdict is stored after the call. Each judge run is recorded. */
	private async askJudge(
		judge: ApplicableJudge,
		subject: Subject,
		review: () => Promise<JudgeReview> | JudgeReview,
		reviewed: Omit<ReviewedSubject, 'kind' | 'id' | 'versionId'>,
	): Promise<boolean> {
		const startedAt = Date.now();
		const record = async (verdict?: PublishJudgeVerdict) => {
			const id = subject.id === NEW_SUBJECT_ID ? null : subject.id;
			const target = { ...reviewed, kind: subject.kind, id, versionId: subject.versionId };
			await this.reviews.record(target, judge, verdict, Date.now() - startedAt);
		};

		try {
			const judgeVersionId = await this.runner.publishedVersionOf(judge);
			if (!judgeVersionId) {
				await record();
				return false;
			}

			const key = { ...this.keyOf(subject), judgeVersionId };
			if (await this.verdicts.get(key)) return true;

			const verdict = await this.runner.judge(judge, await review(), this.config.timeoutMs);
			await this.verdicts.set(key, verdict);
			await record(verdict);

			return true;
		} catch (error) {
			this.logger.warn('Judge gave no verdict', {
				...subject,
				scope: judge.scope,
				judgeType: judge.judgeType,
				error: ensureError(error).message,
			});
			await record();

			return false;
		}
	}

	/** An agent is read from its saved version: the policed nodes leave out its instructions. */
	private async publishReview(
		subject: Subject,
		{ projectId, workflow, connections, settings }: WorkflowPublishContext,
	): Promise<JudgeReview> {
		const event = eventFor(subject.kind, 'Publish');

		if (subject.kind === 'workflow') {
			const { name, nodes } = workflow;
			const content = { id: subject.id, name, nodes, connections, settings: settings ?? {} };
			return { kind: 'workflow', event, projectId, workflow: plain(content) };
		}

		const { AgentHistoryRepository } = await import(
			'@/modules/agents/repositories/agent-history.repository.js'
		);
		const version = await Container.get(AgentHistoryRepository).findByVersionAndAgentId(
			subject.versionId,
			subject.id,
			{},
		);
		if (!version?.schema) throw new OperationalError('The agent version to review was not found');

		const agent = { id: subject.id, name: workflow.name, config: plain(version.schema) };
		return { kind: 'agent', event, projectId, agent };
	}

	private saveReview(subject: Subject, context: WorkflowSaveContext): JudgeReview {
		const { projectId, workflow, connections, settings, agentConfig } = context;
		const event = eventFor(subject.kind, 'Save');

		if (subject.kind === 'agent') {
			const agent = { id: workflow.id, name: workflow.name, config: plain(agentConfig) };
			return { kind: 'agent', event, projectId, agent };
		}

		const { id, name, nodes } = workflow;
		const content = { id, name, nodes, connections, settings: settings ?? {} };
		return { kind: 'workflow', event, projectId, workflow: plain(content) };
	}

	/** `undefined` when nothing judges this publish. */
	private async judgedPublish({
		workflow,
		versionId,
		projectId,
	}: WorkflowPublishContext): Promise<Judged | undefined> {
		if (!versionId || !workflow.id) return undefined;

		const kind = workflow.artifactKind ?? 'workflow';

		return await this.judged(
			eventFor(kind, 'Publish'),
			projectId,
			kind,
			workflow.id,
			() => versionId,
		);
	}

	/** `undefined` when nothing judges this save. */
	private async judgedSave(context: WorkflowSaveContext): Promise<Judged | undefined> {
		const { workflow, connections, settings, agentConfig, projectId } = context;
		const kind = workflow.artifactKind ?? 'workflow';
		const id = workflow.id ?? NEW_SUBJECT_ID;

		// Saves are frequent, so the content is hashed only when a judge reviews this save.
		return await this.judged(eventFor(kind, 'Save'), projectId, kind, id, () => {
			const { name, nodes } = workflow;
			const reviewed = { name, nodes, connections, settings, agentConfig };
			return createHash('sha256').update(JSON.stringify(reviewed)).digest('hex');
		});
	}

	/** A judge reviews the events its admin chose, and never itself. */
	private async judged(
		event: PublishJudgeEvent,
		projectId: string | null,
		kind: PolicedArtifactKind,
		id: string,
		versionId: () => string,
	): Promise<Judged | undefined> {
		const judges = (await this.settings.judgesFor(projectId)).filter(
			(judge) =>
				judge.events.includes(event) && !(judge.judgeType === kind && judge.judgeId === id),
		);

		return judges.length > 0
			? { subject: { kind, id, versionId: versionId() }, judges }
			: undefined;
	}

	private keyOf({ id, versionId }: Subject) {
		return { subjectId: id, versionId };
	}

	private refusal(
		verdict: PublishJudgeVerdict,
		{ scope }: ApplicableJudge,
		projectId: string | null,
	): PolicyViolation {
		return {
			kind: verdict.unavailable
				? PUBLISH_JUDGE_VIOLATION_KIND.unavailable
				: PUBLISH_JUDGE_VIOLATION_KIND.denied,
			checkId: CHECK_ID,
			message: verdict.reason,
			scope,
			...(projectId && { projectId }),
		};
	}
}
