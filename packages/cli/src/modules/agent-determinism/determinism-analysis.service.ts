import type { ModelConfig } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { UserRepository, WorkflowRepository, type User, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';

import { judgeWithModel } from '@/modules/agent-evals/agent-eval-judge';
import { OwnershipService } from '@/services/ownership.service';

import {
	FEEDBACK_ROUNDS,
	MAX_COLLECTED_RUNS,
	VALIDATION_RUNS,
} from './agent-determinism.constants';
import {
	RunClusterer,
	RunCollector,
	WorkflowTranslator,
	type DeterminismSource,
	type RecordedRun,
	type ReplayFailure,
} from './agent-determinism.contracts';
import { DeterminismSourceRepository } from './database/determinism-source.repository';
import { annotateDraft } from './draft-annotation';
import { wrapWithGuards } from './draft-guards';
import { DraftWorkflowWriter } from './draft-workflow.writer';
import { buildAgentFallback, buildWorkflowFallback } from './fallback-node';
import { DeterminismModelResolver } from './determinism-model.resolver';
import { scoreDraft, type ReplayedRun } from './determinism-score';
import { DraftReplayRunner } from './draft-replay.runner';
import { matchOutput, type TextJudge } from './output-match';
import { redactJson, splitRuns } from './run-preparation';
import { classifyRunDataSteps, sumRunDataTokens } from './step-classification';
import { SCHEDULE_TRIGGER } from './trace-mining';

@Service()
export class DeterminismAnalysisService {
	private readonly queue = pLimit(1);

	private judgeModel: ModelConfig | null = null;

	constructor(
		private readonly sourceRepository: DeterminismSourceRepository,
		private readonly collector: RunCollector,
		private readonly clusterer: RunClusterer,
		private readonly translator: WorkflowTranslator,
		private readonly draftWriter: DraftWorkflowWriter,
		private readonly replayRunner: DraftReplayRunner,
		private readonly modelResolver: DeterminismModelResolver,
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('agent-determinism');
	}

	enqueue(source: DeterminismSource, userId: string | null): void {
		this.logger.info('Determinism analysis queued', {
			sourceType: source.type,
			sourceId: source.id,
		});
		void this.queue(async () => await this.run(source, userId));
	}

	private async run(source: DeterminismSource, userId: string | null) {
		if (!(await this.sourceRepository.tryClaimForAnalysis(source.type, source.id))) return;
		try {
			await this.analyze(source, userId);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.logger.warn(`Determinism analysis failed: ${reason}`, { sourceId: source.id });
			await this.sourceRepository.markFailed(source.type, source.id);
		}
	}

	private async analyze(source: DeterminismSource, userId: string | null) {
		const actor = await this.resolveActor(source, userId);
		if (!actor) throw new Error('No user can act for this source');

		const succeeded = (await this.collector.collect(source, MAX_COLLECTED_RUNS)).filter(
			(run) => run.succeeded,
		);
		const [cluster] = this.clusterer.cluster(succeeded);
		if (!cluster) throw new Error('No repeated tool sequence among the recorded runs');
		const { train, holdout } = splitRuns(cluster.runs);
		this.judgeModel = null;
		const fallback = await this.buildFallback(source);
		const draftFor = async (feedback?: ReplayFailure[]) =>
			annotateDraft(
				wrapWithGuards(
					await this.translator.translate({ actor, source, cluster, trainRuns: train, feedback }),
					train,
					fallback,
				),
			);
		let saved = await this.draftWriter.write(actor, source, await draftFor());

		// Feedback: replay a few train runs and redraft with the ones the draft got wrong,
		// as the lab script's `convert --feedback` does. The holdout stays unseen.
		const step = Math.max(1, Math.floor(train.length / VALIDATION_RUNS));
		const validation = train.filter((_, index) => index % step === 0).slice(0, VALIDATION_RUNS);
		for (let round = 0; round < FEEDBACK_ROUNDS; round++) {
			const failures: ReplayFailure[] = [];
			for (const run of validation) {
				const { matched, output } = await this.replayAndJudge(saved, run, actor, source);
				if (!matched) failures.push({ run, got: output });
			}
			this.logger.info('Determinism draft validated', {
				sourceId: source.id,
				round,
				failures: failures.length,
				runs: validation.length,
			});
			if (failures.length === 0) break;
			const redrafted = await draftFor(failures);
			saved = await this.draftWriter.update(actor, saved, redrafted);
		}

		const replayed: ReplayedRun[] = [];
		for (const run of holdout) {
			const { matched, runData } = await this.replayAndJudge(saved, run, actor, source);
			replayed.push({
				recorded: run.steps,
				draft: classifyRunDataSteps(runData, saved),
				matched,
				recordedTokens: run.totalTokens,
				draftTokens: sumRunDataTokens(runData),
			});
		}

		const result = scoreDraft(replayed, succeeded.length, cluster.trafficShare);
		this.logger.info('Determinism analysis finished', {
			sourceId: source.id,
			draftWorkflowId: saved.id,
			...result,
		});
		await this.sourceRepository.saveResult(source, saved.id, result);
	}

	/** Scheduled runs have no reader, so only their tool calls count; other runs also need the answer. */
	private async replayAndJudge(
		draft: WorkflowEntity,
		run: RecordedRun,
		actor: User,
		source: DeterminismSource,
	) {
		const { runData, output, actionsMatch } = await this.replayRunner.replay(draft, run, actor.id);
		const judge: TextJudge = async (expected, actual) => {
			this.judgeModel ??= await this.modelResolver.resolve(actor, source.projectId);
			if (!this.judgeModel) {
				throw new Error('No model credential is available to judge text answers');
			}
			const verdict = await judgeWithModel(
				this.judgeModel,
				{
					input: JSON.stringify(redactJson(run.input)),
					output: actual,
					criteria: null,
					expectedOutput: expected,
				},
				this.logger,
			);
			return verdict.status === 'completed' && verdict.outcome === 'pass';
		};
		const matched =
			actionsMatch &&
			(run.trigger === SCHEDULE_TRIGGER || (await matchOutput(run.output, output, judge)));
		return { matched, output, runData };
	}

	private async buildFallback(source: DeterminismSource) {
		if (source.type === 'agent') return buildAgentFallback(source);
		const workflow = await this.workflowRepository.findById(source.id);
		if (!workflow) throw new Error('The source workflow no longer exists');
		return buildWorkflowFallback(workflow);
	}

	private async resolveActor(
		source: DeterminismSource,
		userId: string | null,
	): Promise<User | null> {
		const loadWithRole = async (id: string) =>
			await this.userRepository.findOne({ where: { id }, relations: ['role'] });
		const user = userId ? await loadWithRole(userId) : null;
		if (user) return user;
		const owner = await this.ownershipService.getPersonalProjectOwnerCached(source.projectId);
		return owner ? await loadWithRole(owner.id) : null;
	}
}
