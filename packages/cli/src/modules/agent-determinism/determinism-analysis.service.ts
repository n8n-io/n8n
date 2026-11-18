import { Logger } from '@n8n/backend-common';
import { UserRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';

import { judgeWithModel } from '@/modules/agent-evals/agent-eval-judge';
import { OwnershipService } from '@/services/ownership.service';

import { MAX_COLLECTED_RUNS } from './agent-determinism.constants';
import {
	RunClusterer,
	RunCollector,
	WorkflowTranslator,
	type DeterminismSource,
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
import { prepareRuns, redactJson } from './run-preparation';
import { classifyRunDataSteps, sumRunDataTokens } from './step-classification';

@Service()
export class DeterminismAnalysisService {
	private readonly queue = pLimit(1);

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
			this.logger.warn('Determinism analysis failed', { sourceId: source.id, error });
			await this.sourceRepository.markFailed(source.type, source.id);
		}
	}

	private async analyze(source: DeterminismSource, userId: string | null) {
		const actor = await this.resolveActor(source, userId);
		if (!actor) throw new Error('No user can act for this source');

		const { train, holdout, total } = prepareRuns(
			await this.collector.collect(source, MAX_COLLECTED_RUNS),
		);
		const [cluster] = this.clusterer.cluster(train);
		if (!cluster) throw new Error('No repeated tool sequence among the recorded runs');

		const translated = await this.translator.translate({
			actor,
			source,
			cluster,
			trainRuns: cluster.runs,
		});
		const draft = annotateDraft(
			wrapWithGuards(translated, cluster.runs, await this.buildFallback(source)),
		);
		const saved = await this.draftWriter.write(actor, source, draft);

		const model = await this.modelResolver.resolve(actor, source.projectId);
		if (!model) throw new Error('No model credential is available in the project');

		const replayed: ReplayedRun[] = [];
		for (const run of holdout) {
			const { runData, output } = await this.replayRunner.replay(saved, run, actor.id);
			const judge: TextJudge = async (expected, actual) => {
				const verdict = await judgeWithModel(
					model,
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
			replayed.push({
				recorded: run.steps,
				draft: classifyRunDataSteps(runData, saved),
				matched: await matchOutput(run.output, output, judge),
				recordedTokens: run.totalTokens,
				draftTokens: sumRunDataTokens(runData),
			});
		}

		const result = scoreDraft(replayed, total, cluster.trafficShare);
		this.logger.info('Determinism analysis finished', {
			sourceId: source.id,
			draftWorkflowId: saved.id,
			...result,
		});
		await this.sourceRepository.saveResult(source, saved.id, result);
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
		const user = userId ? await this.userRepository.findOneBy({ id: userId }) : null;
		return user ?? (await this.ownershipService.getPersonalProjectOwnerCached(source.projectId));
	}
}
