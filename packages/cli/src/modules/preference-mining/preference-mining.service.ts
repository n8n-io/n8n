import type { ModelConfig } from '@n8n/agents';
import type {
	PreferenceMiningRun,
	RecallPreferenceMiningDto,
	StartPreferenceMiningDto,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { createHash, randomUUID } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { PreferenceMiningDataService } from './preference-mining-data.service';
import {
	createMiningModel,
	loadMiningMemory,
	MINING_CALL_TIMEOUT_MS,
} from './preference-mining-model';
import {
	CONSOLIDATION_BATCH_SIZE,
	MAXIMUM_CANDIDATES_PER_SOURCE,
} from '../workflow-index/preference-mining/lab-types';
import {
	estimatePreferenceContext,
	resolveMiningPricing,
} from '../workflow-index/preference-mining/context-estimate';
import { sumMiningMetrics } from '../workflow-index/preference-mining/lab-metrics';
import { captureNodeUsage } from '../workflow-index/preference-mining/node-preference-miner';
import {
	APPROACHES,
	emptyResult,
	labOptionsSchema,
	retrieve,
	runCombined,
	runCredentials,
	runNodes,
	runThreads,
	runWorkflows,
	type LabModel,
} from '../workflow-index/preference-mining/preference-lab';
import { WorkflowDependencyQueryService } from '../workflow-index/workflow-dependency-query.service';

interface MiningJob {
	userId: string;
	run: PreferenceMiningRun;
	controller: AbortController;
	expiresAt: number;
}

const MINING_RUN_TIMEOUT_MS = 30 * 60_000;

@Service()
export class PreferenceMiningService {
	private readonly jobs = new Map<string, MiningJob>();

	constructor(
		private readonly dataService: PreferenceMiningDataService,
		private readonly nodeUsage: WorkflowDependencyQueryService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async start(user: User, projectId: string, dto: StartPreferenceMiningDto) {
		this.assertCapacity(user.id);
		const selected = dto.approaches.includes('combined') ? APPROACHES : dto.approaches;
		let modelConfig: ModelConfig | undefined;
		let model: PreferenceMiningRun['model'];
		const requiresModel = selected.some((a) => a === 'workflows' || a === 'threads');
		try {
			const options = await this.dataService.options(user);
			if (requiresModel && !options.assistant.available) {
				throw new BadRequestError(
					'Agent approaches need access to a configured n8n Assistant. Check Assistant settings.',
				);
			}
			if (options.assistant.available) {
				const { InstanceAiModelService } = await import(
					'../instance-ai/instance-ai-model.service.js'
				);
				const modelService = Container.get(InstanceAiModelService);
				modelConfig = await modelService.resolveAgentModelConfig(user);
				const { modelConfigId } = await import('@n8n/instance-ai');
				if (dto.model !== 'assistant') {
					if (!modelConfigId(modelConfig)?.startsWith('anthropic/')) {
						throw new BadRequestError('Sonnet requires an Anthropic Assistant connection.');
					}
					modelConfig = await modelService.resolveAgentModelConfig(user, undefined, dto.model);
					if (modelConfigId(modelConfig) !== `anthropic/${dto.model}`) {
						throw new BadRequestError('The Assistant connection could not select Sonnet.');
					}
				}
				model = {
					source: 'assistant',
					id: modelConfigId(modelConfig) ?? null,
					maxOutputTokens: dto.maxOutputTokens,
				};
				if (model.id) model.pricing = await resolveMiningPricing(model.id);
			}
		} catch (error) {
			// Usage miners can run even when Assistant pricing cannot be resolved.
			if (requiresModel || dto.model !== 'assistant') throw error;
		}
		// Credential resolution can yield. Reserve capacity only after it completes.
		this.assertCapacity(user.id);
		const job: MiningJob = {
			userId: user.id,
			controller: new AbortController(),
			expiresAt: Date.now() + MINING_RUN_TIMEOUT_MS + 15 * 60_000,
			run: {
				id: randomUUID(),
				projectId,
				status: 'running',
				stage: 'Loading project data',
				...(model ? { model } : {}),
				results: [],
			},
		};
		this.jobs.set(job.run.id, job);
		void this.execute(job, user, dto, selected, modelConfig);
		return job.run;
	}

	get(user: User, projectId: string, runId: string) {
		return this.find(user, projectId, runId).run;
	}

	cancel(user: User, projectId: string, runId: string) {
		const job = this.find(user, projectId, runId);
		job.controller.abort();
		if (job.run.status === 'running') job.run.status = 'cancelled';
		return job.run;
	}

	async recall(user: User, projectId: string, runId: string, dto: RecallPreferenceMiningDto) {
		const { run } = this.find(user, projectId, runId);
		if (dto.folderId && !run.sources?.folders.some((f) => f.id === dto.folderId)) {
			throw new BadRequestError('Select a folder from this project.');
		}
		const memory = await loadMiningMemory();
		const probe = { id: 'preview', projectId, ...dto, expected: [], forbidden: [] };
		return await Promise.all(
			run.results.map(async (result) => {
				const prompt =
					result.status === 'complete'
						? retrieve(result.preferences, probe, memory, 'prompt', dto.topK)
						: [];
				const recall =
					result.status === 'complete'
						? retrieve(result.preferences, probe, memory, 'recall', dto.topK)
						: [];
				return {
					approach: result.approach,
					status: result.status,
					prompt,
					recall,
					estimates:
						result.status === 'complete'
							? {
									prompt: await estimatePreferenceContext(prompt, run.model?.pricing),
									recall: await estimatePreferenceContext(recall, run.model?.pricing),
								}
							: null,
				};
			}),
		);
	}

	@OnShutdown()
	shutdown() {
		for (const job of this.jobs.values()) job.controller.abort();
		this.jobs.clear();
	}

	private find(user: User, projectId: string, runId: string) {
		this.prune();
		const job = this.jobs.get(runId);
		if (!job || job.userId !== user.id || job.run.projectId !== projectId) {
			throw new NotFoundError('Preference scan not found.');
		}
		return job;
	}

	private assertCapacity(userId: string) {
		this.prune();
		if ([...this.jobs.values()].some((j) => j.userId === userId && j.run.status === 'running')) {
			throw new BadRequestError('Cancel the current preference scan before starting another.');
		}
		if (this.jobs.size >= 20) throw new BadRequestError('The preference lab is busy. Retry later.');
	}

	private prune() {
		for (const [id, job] of this.jobs) {
			if (job.expiresAt > Date.now()) continue;
			job.controller.abort();
			this.jobs.delete(id);
		}
	}

	private async execute(
		job: MiningJob,
		user: User,
		dto: StartPreferenceMiningDto,
		selected: StartPreferenceMiningDto['approaches'],
		modelConfig?: ModelConfig,
	) {
		const signal = AbortSignal.any([
			job.controller.signal,
			AbortSignal.timeout(MINING_RUN_TIMEOUT_MS),
		]);
		const progress = (text: string) => {
			signal.throwIfAborted();
			job.run.stage = text;
		};
		try {
			const { data, sources, completeWorkflowScan, threadsAvailable } = await this.dataService.load(
				user,
				job.run.projectId,
				selected.includes('threads'),
				signal,
			);
			job.run.sources = sources;
			const options = labOptionsSchema.parse({ projectId: job.run.projectId, thresholds: dto });
			const bounded = data.workflows.filter((w) => JSON.stringify(w).length <= 60000).slice(0, 30);
			job.run.experiment = {
				protocolVersion: 2,
				inputHash: createHash('sha256').update(JSON.stringify({ data, options })).digest('hex'),
				workflowIds: bounded.map((workflow) => workflow.id),
				maximumCandidatesPerSource: MAXIMUM_CANDIDATES_PER_SOURCE,
				consolidationBatchSize: CONSOLIDATION_BATCH_SIZE,
				runTimeoutMs: MINING_RUN_TIMEOUT_MS,
				callTimeoutMs: MINING_CALL_TIMEOUT_MS,
			};
			for (const approach of APPROACHES.filter((a) => selected.includes(a))) {
				progress(`Running ${approach}`);
				const started = performance.now();
				let result = emptyResult(approach);
				let model: LabModel | undefined;
				try {
					if (approach === 'nodes') {
						const snapshot = await captureNodeUsage(
							async (query) => await this.nodeUsage.getNodeTypeUsage(user, query),
							options.projectId,
							data.groups,
						);
						if (snapshot.histogram.workflowsInScope !== sources.totalWorkflows) {
							result.status = 'unavailable';
							result.notes.push(
								'The workflow index does not cover this project scan. Wait for indexing, then retry.',
							);
						} else result = await runNodes(data, options, snapshot);
					}
					if (approach === 'credentials') {
						if (completeWorkflowScan) result = runCredentials(data, options);
						else {
							result.status = 'unavailable';
							result.notes.push(
								'Credential usage needs a complete workflow scan. Reduce the project size for this spike.',
							);
						}
					}
					if (approach === 'combined') result = runCombined(job.run.results);
					if (approach === 'workflows' || approach === 'threads') {
						if (approach === 'threads' && !threadsAvailable) {
							result.status = 'unavailable';
							result.notes.push('Thread mining requires access to an enabled n8n Assistant.');
						} else if (!modelConfig) {
							result.status = 'unavailable';
							result.notes.push('Configure n8n Assistant to run this approach.');
						} else {
							model = await createMiningModel(
								modelConfig,
								this.outboundHttp,
								signal,
								job.run.model?.pricing,
								dto.maxOutputTokens,
							);
							// Bound each prompt. Never send partial workflow JSON as evidence.
							const omitted = data.workflows.length - bounded.length;
							result =
								approach === 'workflows'
									? await runWorkflows(
											{ ...data, workflows: bounded },
											options,
											model,
											progress,
											result,
										)
									: await runThreads(data, options, model, await loadMiningMemory(), progress);
							if (approach === 'workflows' && omitted)
								result.notes.push(
									`Skipped ${omitted} workflows. Extraction accepts up to 30 workflows, each at most 60,000 characters.`,
								);
						}
					}
				} catch {
					result.status = 'failed';
					result.notes.push(
						'The approach did not finish. Completed workflow checkpoints and call measurements are retained. Partial preferences are not scored.',
					);
				}
				result.metrics = {
					...result.metrics,
					...model?.metrics(),
					elapsedMs: result.metrics.elapsedMs + Math.round(performance.now() - started),
				};
				const failedCall = result.metrics.calls?.findLast((call) => call.status === 'failed');
				if (failedCall)
					result.notes.push(
						`Model stage: ${failedCall.stage}. Failure: ${failedCall.failure}. Open the call measurements for reported usage.`,
					);
				job.run.results.push(result);
				job.run.metrics = sumMiningMetrics(
					job.run.results.filter((r) => r.approach !== 'combined').map((r) => r.metrics),
				);
				signal.throwIfAborted();
			}
			job.run.status = job.run.results.some((r) => r.status === 'failed') ? 'failed' : 'complete';
			job.run.stage = 'Finished';
		} catch {
			job.run.status = signal.aborted ? 'cancelled' : 'failed';
			job.run.stage = signal.aborted
				? 'Stopped or reached the 30 minute limit'
				: 'Could not load project data';
		} finally {
			job.expiresAt = Date.now() + 15 * 60_000;
			setTimeout(() => this.jobs.delete(job.run.id), 15 * 60_000).unref();
		}
	}
}
