/**
 * Coordinates sidecar workflow-overview refreshes per thread: single-flight
 * with trailing coalescing (a trigger arriving mid-generation reruns once with
 * the latest bundle), bundle-hash dedupe (identical inputs never re-call the
 * LLM), and only-on-change publishing (identical outputs never re-render).
 */
import type { InstanceAiEvent, WorkflowOverview } from '@n8n/api-types';

import {
	generateWorkflowOverview,
	type GenerateWorkflowOverviewOptions,
	type WorkflowOverviewBundle,
} from './workflow-overview-generator';
import type { Logger } from '../logger';
import type { ModelConfig } from '../types';

export interface WorkflowOverviewRefreshArgs {
	threadId: string;
	/** Run to attribute the update to — keeps the event inside that run's agent tree. */
	runId: string;
	/** Root (orchestrator) agent id of that run. */
	agentId: string;
	modelId: ModelConfig;
	/** Trigger provenance for tracing/cost attribution (e.g. 't1-user-message'). */
	source?: string;
	/** User the refresh runs for — tracing metadata only. */
	userId?: string;
	/**
	 * Marks the published overview as provisional (grounded in code still being
	 * written). The next non-provisional refresh republishes the overview with
	 * the flag cleared even when no pane changed.
	 */
	provisional?: boolean;
	/** Bundle WITHOUT previousOverview — the sidecar injects its own last-published state. */
	bundle: Omit<WorkflowOverviewBundle, 'previousOverview'>;
}

interface ThreadOverviewState {
	inFlight: boolean;
	lastBundleHash?: string;
	lastOverview?: WorkflowOverview;
	/** Whether the currently shown overview was published as provisional. */
	lastProvisional?: boolean;
	pending?: WorkflowOverviewRefreshArgs;
}

interface WorkflowOverviewSidecarDeps {
	publish: (threadId: string, event: InstanceAiEvent) => void;
	logger: Logger;
	/**
	 * Generation delegate — receives the full refresh args so hosts can wrap
	 * the call with tracing/usage instrumentation. Defaults to the plain
	 * generator; injectable for tests.
	 */
	generate?: (
		args: WorkflowOverviewRefreshArgs,
		bundle: WorkflowOverviewBundle,
		options: GenerateWorkflowOverviewOptions,
	) => Promise<WorkflowOverview | null>;
}

function serializeOverview(overview: WorkflowOverview): string {
	return JSON.stringify({
		triggers: overview.triggers,
		steps: overview.steps,
		results: overview.results,
	});
}

export class WorkflowOverviewSidecar {
	private readonly states = new Map<string, ThreadOverviewState>();

	constructor(private readonly deps: WorkflowOverviewSidecarDeps) {}

	/** Fire-and-forget refresh entry point. Never throws. */
	refresh(args: WorkflowOverviewRefreshArgs): void {
		const state = this.ensureState(args.threadId);
		if (state.inFlight) {
			// Coalesce: the in-flight loop picks this up after the current call.
			state.pending = args;
			return;
		}
		state.inFlight = true;
		void this.run(state, args)
			.catch((error) => {
				this.deps.logger.warn('Workflow overview sidecar refresh failed', {
					threadId: args.threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			})
			.finally(() => {
				state.inFlight = false;
			});
	}

	/** Drop per-thread state (thread deleted / cleaned up). */
	clearThread(threadId: string): void {
		this.states.delete(threadId);
	}

	private ensureState(threadId: string): ThreadOverviewState {
		let state = this.states.get(threadId);
		if (!state) {
			state = { inFlight: false };
			this.states.set(threadId, state);
		}
		return state;
	}

	private async run(
		state: ThreadOverviewState,
		initial: WorkflowOverviewRefreshArgs,
	): Promise<void> {
		const generate =
			this.deps.generate ??
			(async (
				generateArgs: WorkflowOverviewRefreshArgs,
				generateBundle: WorkflowOverviewBundle,
				options: GenerateWorkflowOverviewOptions,
			) => await generateWorkflowOverview(generateArgs.modelId, generateBundle, options));
		let args: WorkflowOverviewRefreshArgs | undefined = initial;

		while (args) {
			state.pending = undefined;
			const provisional = args.provisional === true;
			const bundle: WorkflowOverviewBundle = {
				...args.bundle,
				previousOverview: state.lastOverview ?? null,
			};

			let overview: WorkflowOverview | null = null;
			const bundleHash = JSON.stringify(bundle);
			if (bundleHash !== state.lastBundleHash) {
				state.lastBundleHash = bundleHash;
				const { threadId, source } = args;
				overview = await generate(args, bundle, {
					onFailure: (reason, detail) => {
						// Info on purpose (PoC diagnostics): tells "model skipped" apart
						// from "panes identical" when a refresh yields no visible update.
						this.deps.logger.info('Workflow overview generation yielded no result', {
							threadId,
							source,
							reason,
							...(detail ? { detail } : {}),
						});
					},
				});
			}

			if (
				overview !== null &&
				(state.lastOverview === undefined ||
					serializeOverview(overview) !== serializeOverview(state.lastOverview))
			) {
				// `lastOverview` stays flag-free: it feeds previousOverview prompts
				// and the change compare; `provisional` is publish-time decoration.
				state.lastOverview = overview;
				state.lastProvisional = provisional;
				this.publishOverview(args, overview, provisional, 'panes-changed');
			} else if (state.lastOverview && (state.lastProvisional === true) !== provisional) {
				// Panes unchanged (generation skipped, deduped, or repeated itself)
				// but the provisional STATE flipped — republish so the UI shows the
				// lifecycle: promote to "drafting" when a build starts streaming,
				// demote back once a terminal refresh confirms the panes.
				state.lastProvisional = provisional;
				this.publishOverview(args, state.lastOverview, provisional, 'provisional-flag');
			}

			args = state.pending;
		}
	}

	private publishOverview(
		args: WorkflowOverviewRefreshArgs,
		overview: WorkflowOverview,
		provisional: boolean,
		cause: 'panes-changed' | 'provisional-flag',
	): void {
		// Info on purpose (PoC diagnostics): publishes are rare and this is the
		// one place that proves the whole refresh pipeline end-to-end.
		this.deps.logger.info('Workflow overview published', {
			threadId: args.threadId,
			source: args.source,
			provisional,
			cause,
		});
		this.deps.publish(args.threadId, {
			type: 'workflow-overview-update',
			runId: args.runId,
			agentId: args.agentId,
			payload: { overview: provisional ? { ...overview, provisional: true } : overview },
		});
	}
}
