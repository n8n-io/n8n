import type { ModelConfig } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { UserRepository, WorkflowRepository, type User, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { JSONValue } from '@n8n/utils/json/to-json-value';
import { createHash } from 'node:crypto';
import type { IRunData } from 'n8n-workflow';
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
import { toolNameOf } from './output-match';
import { redactJson, splitRuns } from './run-preparation';
import { SCHEDULE_TRIGGER } from './trace-mining';
import { classifyRunDataSteps, sumRunDataTokens } from './step-classification';

/** What the draft does, ignoring layout: nodes by name, their parameters, and the wiring. */
export function hashDraft(draft: Pick<WorkflowEntity, 'nodes' | 'connections'>) {
	const nodes = [...draft.nodes]
		.map(({ name, type, parameters }) => ({ name, type, parameters }))
		.sort((a, b) => a.name.localeCompare(b.name));
	return createHash('sha256')
		.update(JSON.stringify({ nodes, connections: draft.connections }))
		.digest('hex');
}

/** Drops ids, timestamps, urls and empty values so a tool result fits the judge's prompt. */
function compact(value: JSONValue): JSONValue {
	if (Array.isArray(value)) return value.map(compact);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key, v]) => v !== null && v !== '' && !/(^id$|_id$|Id$|_at$|url$|^src$)/i.test(key))
			.map(([key, v]) => [key, compact(v ?? null)]),
	);
}

// ponytail: fixed per-call cap; a large catalogue gets cut and the judge may miss items past it. Upgrade: grade structurally first, judge only disagreements.
const JUDGE_TOOL_CHARS = 8_000;

const clip = (value: unknown, max: number) => {
	const text = JSON.stringify(value) ?? 'undefined';
	return text.length > max ? `${text.slice(0, max)}…` : text;
};

/** One line per node that ran: items out and the first `max` items, clipped. */
function describeSteps(runData: IRunData, max = 1) {
	return Object.entries(runData)
		.flatMap(([name, tasks]) => {
			const outputs = tasks.at(-1)?.data?.main ?? [];
			// Each output on its own line: a Filter's output 2 is what it dropped, not what it passed on.
			return outputs.map((output, index) => {
				const items = output ?? [];
				const label = outputs.length > 1 ? ` [output ${index + 1}]` : '';
				const shown = items
					.slice(0, max)
					.map((item) => `    ${JSON.stringify(redactJson(item.json as JSONValue)).slice(0, 300)}`);
				return [`- ${name}${label}: ${items.length} items out`, ...shown].join('\n');
			});
		})
		.join('\n');
}

@Service()
export class DeterminismAnalysisService {
	private readonly queue = pLimit(1);

	private judgeModel: ModelConfig | null = null;

	private instructionsText: string | null = null;

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
		this.instructionsText = null;
		const fallback = await this.buildFallback(source);
		const draftFor = async (feedback?: ReplayFailure[]) =>
			annotateDraft(
				wrapWithGuards(
					await this.translator.translate({ actor, source, cluster, trainRuns: train, feedback }),
					train,
					fallback,
				),
			);
		const firstDraft = await draftFor();
		// One draft per source: a new analysis overwrites the last one, unless a person edited it.
		const row = await this.sourceRepository.findBySource(source.type, source.id);
		const previous = row?.draftWorkflowId
			? await this.workflowRepository.findById(row.draftWorkflowId)
			: null;
		const edited = previous !== null && hashDraft(previous) !== row?.result?.draftHash;
		if (edited) {
			this.logger.info('Determinism draft was edited: writing a new draft next to it', {
				sourceId: source.id,
				draftWorkflowId: previous.id,
			});
		}
		let saved =
			previous && !edited
				? await this.draftWriter.update(actor, previous, firstDraft)
				: await this.draftWriter.write(actor, source, firstDraft);

		// Feedback: replay a few train runs and redraft with the ones the draft got wrong,
		// as the lab script's `convert --feedback` does. The holdout stays unseen.
		const step = Math.max(1, Math.floor(train.length / VALIDATION_RUNS));
		const validation = train.filter((_, index) => index % step === 0).slice(0, VALIDATION_RUNS);
		for (let round = 0; round < FEEDBACK_ROUNDS; round++) {
			const failures: ReplayFailure[] = [];
			for (const run of validation) {
				const { matched, output, runData, why } = await this.replayAndJudge(
					saved,
					run,
					actor,
					source,
				);
				if (!matched) failures.push({ run, got: output, steps: describeSteps(runData), why });
				this.logger.info('Determinism validation graded', {
					sourceId: source.id,
					runId: run.id,
					round,
					matched,
					why,
				});
			}
			this.logger.info('Determinism draft validated', {
				sourceId: source.id,
				round,
				failures: failures.length,
				runs: validation.length,
			});
			if (failures.length === 0) break;
			const redrafted = await draftFor(failures);
			if (!(await this.isUnchanged(saved))) {
				this.logger.info('Determinism draft was edited during analysis: keeping the edit', {
					sourceId: source.id,
					draftWorkflowId: saved.id,
				});
				break;
			}
			saved = await this.draftWriter.update(actor, saved, redrafted);
		}

		const replayed: ReplayedRun[] = [];
		for (const run of holdout) {
			const { matched, runData, why } = await this.replayAndJudge(saved, run, actor, source);
			this.logger.info('Determinism holdout graded', {
				sourceId: source.id,
				runId: run.id,
				matched,
				why,
			});
			replayed.push({
				recorded: run.steps,
				draft: classifyRunDataSteps(runData, saved),
				matched,
				recordedTokens: run.totalTokens,
				draftTokens: sumRunDataTokens(runData),
			});
		}

		const result = {
			...scoreDraft(replayed, succeeded.length, cluster.trafficShare),
			draftHash: hashDraft(saved),
		};
		this.logger.info('Determinism analysis finished', {
			sourceId: source.id,
			draftWorkflowId: saved.id,
			...result,
		});
		await this.sourceRepository.saveResult(source, saved.id, result);
	}

	private async isUnchanged(draft: WorkflowEntity) {
		const current = await this.workflowRepository.findById(draft.id);
		return current !== null && hashDraft(current) === hashDraft(draft);
	}

	/** Scheduled runs have no reader, so only their tool calls count; other runs also need the answer. */
	private async replayAndJudge(
		draft: WorkflowEntity,
		run: RecordedRun,
		actor: User,
		source: DeterminismSource,
	) {
		const { runData, output, actionsMatch } = await this.replayRunner.replay(draft, run, actor.id);
		this.judgeModel ??= await this.modelResolver.resolve(actor, source.projectId);
		if (!this.judgeModel) {
			// No model to grade with: fall back to "did the draft do what the agent did".
			return { matched: actionsMatch, output, runData, why: undefined };
		}
		// Graded on correctness, not on copying: the agent's own actions are a reference and can be wrong.
		this.instructionsText ??= await this.translator.instructions(source);
		// Keep the agent's actions apart from the workflow's: the judge must not credit one with the other.
		const toolNames = new Set(run.toolCalls.map((call) => call.name));
		const isTool = (name: string) => toolNames.has(toolNameOf(name));
		const toolData = run.toolCalls
			.map(
				(call) =>
					`${call.name} returned: ${call.output === undefined ? '(not recorded)' : clip(compact(redactJson(call.output)), JUDGE_TOOL_CHARS)}`,
			)
			.join('\n');
		const agentDid = run.toolCalls
			.map((call) => `${call.name}(${clip(redactJson(call.input ?? null), 800)})`)
			.join('\n');
		const workflowSteps = Object.fromEntries(
			Object.entries(runData).filter(([name]) => !isTool(name)),
		);
		const workflowCalls = Object.entries(runData)
			.filter(([name]) => isTool(name))
			.map(([name, tasks]) => {
				const task = tasks.at(-1);
				const from = task?.source?.[0];
				const sent = from
					? (runData[from.previousNode]?.[from.previousNodeRun ?? 0]?.data?.main?.[
							from.previousNodeOutput ?? 0
						] ?? [])
					: (task?.inputOverride?.ai_tool?.[0] ?? []);
				const items = sent
					.slice(0, 30)
					.map((item) => `    ${JSON.stringify(item.json).slice(0, 300)}`);
				return [`- ${toolNameOf(name)}: called with ${sent.length || 1} item(s)`, ...items].join(
					'\n',
				);
			})
			.join('\n');
		// A judge reply with no clear verdict is not a fail: ask again, up to twice.
		let verdict: Awaited<ReturnType<typeof judgeWithModel>> | undefined;
		for (let attempt = 0; attempt < 3 && verdict?.status !== 'completed'; attempt++) {
			verdict = await judgeWithModel(
				this.judgeModel,
				{
					input: [
						`Request: ${clip(redactJson(run.input), 1500)}`,
						`Data the tools returned (the same for agent and workflow):\n${toolData}`,
						`REFERENCE ONLY, NOT THE WORKFLOW: what the agent did (it can be wrong):\n${agentDid}\nAgent answer: ${clip(redactJson(run.output), 1500)}`,
					].join('\n\n'),
					output: [
						`Tool calls the WORKFLOW made (any tool not listed here was NOT called by the workflow):\n${workflowCalls || '(none)'}`,
						`Workflow's other steps (a "Pick items" filter's output 2 is the items it dropped):\n${describeSteps(workflowSteps, 30)}`,
						`Workflow answer: ${clip(output === null ? null : redactJson(output), 1500)}`,
					].join('\n\n'),
					criteria: `${this.instructionsText || '(no instructions)'}

	Grade ONLY the workflow's tool calls and answer against the instructions above, for this request and this tool data. Never count the agent's actions as the workflow's.
	Pass if the workflow called the tools the instructions require, on the right items and no others, and, when the request needs an answer, its answer states the same facts a correct agent would give. Wording does not matter. Not calling a tool is correct when the instructions say nothing should be done.
	Fail if it skipped a required call, acted on wrong or extra items, or stated a wrong fact. Say which item or fact was wrong.${run.trigger === SCHEDULE_TRIGGER ? '\nThis was a scheduled run: nobody reads its answer, so grade only the tool calls and ignore the answer.' : ''}`,
					expectedOutput: null,
				},
				this.logger,
			);
		}
		const matched = verdict?.status === 'completed' && verdict.outcome === 'pass';
		return { matched, output, runData, why: verdict?.reasoning ?? undefined };
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
