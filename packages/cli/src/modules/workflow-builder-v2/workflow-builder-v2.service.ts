import type { Agent, GenerateResult, ModelConfig } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentsBuilderSettingsService } from '@/modules/agents/builder/agents-builder-settings.service';

import { createBuilderAgent, defaultLookupNodeDescription } from './builder-agent.factory';
import { RunStateRegistry } from './session/run-state-registry';
import type {
	ChatMessage,
	ConnectionContext,
	InsertionPoint,
	RunState,
	WorkflowJson,
} from './session/session.types';
import type { ProposeResumePayload } from './tools/propose-nodes.tool';
import { commitPendingNode } from './tools/commit-node.tool';

const WORKFLOW_BUILDER_V2_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export interface StartSessionInput {
	projectId: string;
	prompt: string;
	workflowJson: WorkflowJson;
	requestedInsertionPoint?: InsertionPoint;
	connectionContext?: ConnectionContext;
	user: User;
	/** Optional model override (used by tests). When set, skips credential resolution. */
	modelOverride?: ModelConfig;
}

export interface ConfirmInput {
	sessionId: string;
	resume: ProposeResumePayload;
	user: User;
	modelOverride?: ModelConfig;
	/**
	 * For `kind: 'pick'`, the on-canvas position the FE rendered the picked
	 * ghost at. Stashed on the run state so the `commit_node` tool can place
	 * the committed node exactly where the user saw the ghost.
	 */
	pickedPosition?: [number, number];
}

export interface SessionStateView {
	sessionId: string;
	taskList: RunState['taskList'];
	ghosts: RunState['pendingGhosts'];
	insertionPoint: RunState['pendingInsertionPoint'];
	connectionContext: RunState['connectionContext'];
	narrative: ChatMessage[];
	workflow: WorkflowJson;
	done: boolean;
	/**
	 * True when the agent is awaiting user input on a suspended tool call.
	 * The FE uses this together with `ghosts` to detect a "stuck" state:
	 * suspended with no UI affordance on screen.
	 */
	hasPendingSuspension: boolean;
}

@Service()
export class WorkflowBuilderV2Service {
	constructor(
		private readonly registry: RunStateRegistry,
		private readonly logger: Logger,
		private readonly builderSettings: AgentsBuilderSettingsService,
	) {}

	async startSession(input: StartSessionInput): Promise<{ sessionId: string }> {
		const modelConfig = await this.resolveModel(input.user, input.modelOverride);
		const sessionId = randomUUID();
		const initial: RunState = {
			sessionId,
			projectId: input.projectId,
			userPrompt: input.prompt,
			workflow: cloneWorkflow(input.workflowJson),
			requestedInsertionPoint: input.requestedInsertionPoint ?? null,
			connectionContext: input.connectionContext ?? null,
			pendingConnectionContext: null,
			taskList: [],
			pendingGhosts: null,
			pendingInsertionPoint: null,
			narrative: [],
			agentState: null,
			pendingResume: null,
			pickedPosition: null,
			autoCommittedPick: null,
			pendingCommit: null,
			done: false,
		};
		this.registry.create(initial);

		const agent = createBuilderAgent({
			sessionId,
			registry: this.registry,
			modelConfig,
		});

		await this.runAndDigest(
			sessionId,
			agent,
			async () => await agent.generate(formatInitialPrompt(input)),
		);

		return { sessionId };
	}

	async confirm(input: ConfirmInput): Promise<void> {
		const state = this.registry.require(input.sessionId);
		this.logger.debug('[builder-v2] confirm received', {
			sessionId: input.sessionId,
			kind: input.resume.kind,
			done: state.done,
			hasPendingResume: state.pendingResume !== null,
			ghostsCount: state.pendingGhosts?.length ?? 0,
			hasPickedPosition: input.resume.kind === 'pick' && input.pickedPosition !== undefined,
		});
		if (state.done) {
			this.logger.warn('[builder-v2] confirm called on completed session', {
				sessionId: input.sessionId,
			});
			return;
		}
		if (!state.pendingResume) {
			this.logger.warn('[builder-v2] confirm called with no pending suspension', {
				sessionId: input.sessionId,
				kind: input.resume.kind,
			});
			throw new Error('No pending suspension to resume');
		}
		const { runId, toolCallId } = state.pendingResume;

		// Stash the FE-supplied ghost position so the `commit_node` tool can
		// place the committed node at the same spot the user saw the ghost.
		// `commit_node` clears this after use. For `reject` we still clear any
		// stale value from a previous pick.
		this.registry.update(input.sessionId, {
			pickedPosition: input.resume.kind === 'pick' ? (input.pickedPosition ?? null) : null,
			autoCommittedPick: null,
		});
		if (input.resume.kind === 'pick') {
			this.autoCommitPickedNode(input.sessionId, input.resume.chosenIndex);
		}

		const modelConfig = await this.resolveModel(input.user, input.modelOverride);

		const agent = createBuilderAgent({
			sessionId: input.sessionId,
			registry: this.registry,
			modelConfig,
		});

		await this.runAndDigest(
			input.sessionId,
			agent,
			async () => await agent.resume('generate', input.resume, { runId, toolCallId }),
		);
	}

	private autoCommitPickedNode(sessionId: string, chosenIndex: number): void {
		const state = this.registry.require(sessionId);
		const chosen = state.pendingGhosts?.[chosenIndex];
		const insertionPoint = state.requestedInsertionPoint ?? state.pendingInsertionPoint;
		if (!chosen || !insertionPoint) {
			this.logger.warn('[builder-v2] auto-commit skipped — no picked ghost', {
				sessionId,
				chosenIndex,
				ghostsCount: state.pendingGhosts?.length ?? 0,
				hasInsertionPoint: insertionPoint !== null,
			});
			return;
		}

		const connectionContext = state.pendingConnectionContext ?? state.connectionContext ?? null;
		this.registry.update(sessionId, {
			pendingCommit: {
				nodeType: chosen.nodeType,
				version: chosen.version,
				displayName: chosen.displayName,
				...(chosen.parameters ? { parameters: chosen.parameters } : {}),
				insertionPoint,
				connectionContext,
				...(state.pickedPosition ? { position: state.pickedPosition } : {}),
			},
		});

		const result = commitPendingNode({
			registry: this.registry,
			sessionId,
			lookupNodeDescription: defaultLookupNodeDescription,
			logger: this.logger,
			input: {
				nodeType: chosen.nodeType,
				version: chosen.version,
				displayName: chosen.displayName,
				parameters: chosen.parameters ?? {},
				insertionPoint,
			},
		});

		if ('error' in result) {
			this.logger.warn('[builder-v2] auto-commit skipped — commit guard failed', {
				sessionId,
				chosenIndex,
				error: result.error,
			});
			return;
		}

		this.registry.update(sessionId, { autoCommittedPick: result });
	}

	private async resolveModel(user: User, override: ModelConfig | undefined): Promise<ModelConfig> {
		if (override) return override;
		const { config } = await this.builderSettings.resolveModelConfig(user, {
			anthropicModelOverride: WORKFLOW_BUILDER_V2_DEFAULT_MODEL,
		});
		return config;
	}

	getState(sessionId: string): SessionStateView {
		const s = this.registry.require(sessionId);
		return {
			sessionId: s.sessionId,
			taskList: s.taskList,
			ghosts: s.pendingGhosts,
			insertionPoint: s.pendingInsertionPoint,
			connectionContext: s.pendingConnectionContext ?? s.connectionContext,
			narrative: s.narrative,
			workflow: s.workflow,
			done: s.done,
			hasPendingSuspension: s.pendingResume !== null,
		};
	}

	/**
	 * Run the agent (either start or resume) and digest the result into the
	 * session state. Captures pending suspend, completion, and any assistant
	 * narrative messages.
	 */
	private async runAndDigest(
		sessionId: string,
		_agent: Agent,
		run: () => Promise<GenerateResult>,
	): Promise<void> {
		try {
			const result = await run();
			this.digestResult(sessionId, result);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('[builder-v2] agent run failed', { sessionId, error: message });
			const narrative = this.registry.require(sessionId).narrative;
			this.registry.update(sessionId, {
				done: true,
				narrative: [...narrative, { role: 'assistant', content: `Error: ${message}` }],
			});
		}
	}

	private digestResult(sessionId: string, result: GenerateResult): void {
		const state = this.registry.require(sessionId);

		// Extract assistant text into the narrative log.
		const newNarrative: ChatMessage[] = [];
		for (const msg of result.messages) {
			if ('role' in msg && msg.role === 'assistant' && 'content' in msg) {
				const text = msg.content
					.filter((c) => c.type === 'text')
					.map((c) => ('text' in c ? c.text : ''))
					.join('')
					.trim();
				if (text) newNarrative.push({ role: 'assistant', content: text });
			}
		}

		const pending = result.pendingSuspend?.[0];
		if (pending) {
			const ghostsCount = this.registry.require(sessionId).pendingGhosts?.length ?? 0;
			this.logger.debug('[builder-v2] digestResult — suspended', {
				sessionId,
				runId: pending.runId,
				toolCallId: pending.toolCallId,
				ghostsCount,
				newNarrative: newNarrative.length,
			});
			// 2b: Suspended but no ghosts on the registry — likely a stuck state.
			// Surface as a warn so we can spot it in production logs. The FE has
			// an escape hatch (Cancel / Retry) that the user can trigger.
			if (ghostsCount === 0) {
				this.logger.warn('[builder-v2] suspended without pending ghosts — agent may be stuck', {
					sessionId,
					toolCallId: pending.toolCallId,
					runId: pending.runId,
				});
			}
			this.registry.update(sessionId, {
				narrative: [...state.narrative, ...newNarrative],
				pendingResume: { runId: pending.runId, toolCallId: pending.toolCallId },
			});
		} else {
			// Run completed.
			this.logger.debug('[builder-v2] digestResult — completed', {
				sessionId,
				newNarrative: newNarrative.length,
				workflowNodes: state.workflow.nodes.length,
			});
			this.registry.update(sessionId, {
				narrative: [...state.narrative, ...newNarrative],
				done: true,
				pendingResume: null,
				pendingGhosts: null,
				pendingInsertionPoint: null,
				autoCommittedPick: null,
				pendingCommit: null,
			});
		}
	}
}

export function formatInitialPrompt(input: StartSessionInput): string {
	const isCanvasAddNodeMode =
		input.connectionContext !== undefined || input.requestedInsertionPoint?.kind === 'after';
	const contextLines: string[] = isCanvasAddNodeMode
		? [
				'Build exactly one next node for this user request, then stop after the user accepts or rejects the proposed node.',
			]
		: [
				'Build the requested workflow to completion, one reviewed node at a time.',
				'Do not stop after the first accepted node. After each accepted node, continue with the next task until the workflow has all nodes and required connections needed to run.',
			];

	if (input.requestedInsertionPoint) {
		contextLines.push(
			`Use this exact insertionPoint in propose_nodes: ${JSON.stringify(input.requestedInsertionPoint)}.`,
		);
	}

	if (input.connectionContext) {
		contextLines.push(
			`Only propose nodes compatible with this canvas connection context: ${JSON.stringify(input.connectionContext)}.`,
		);
	}

	if (!isCanvasAddNodeMode) {
		contextLines.push(
			'When an AI root node needs required model/tool/memory/parser sub-nodes, propose those support nodes too, using propose_nodes.connectionContext so they connect to the correct non-main AI input.',
		);
	}

	return `${contextLines.join('\n')}\n\nUser request: ${input.prompt}`;
}

function cloneWorkflow(workflow: WorkflowJson): WorkflowJson {
	return {
		...workflow,
		nodes: [...workflow.nodes],
		connections: structuredClone(workflow.connections),
	};
}
