/**
 * Pushes the in-memory draft to the real workflow on the backend, and emits a
 * synthetic `tool-call` + `tool-result` pair for a virtual `build-workflow`
 * tool so the existing frontend canvas-preview pipeline opens / refreshes the
 * iframe automatically (it watches for build-workflow tool calls to bump its
 * refresh key).
 *
 * Promotes the workflow out of "AI-temporary" as soon as the first node lands
 * so a session interruption never wastes user work.
 */

import type { AgentId, InstanceAiEvent, RunId, ToolCallId } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { DraftStore } from './draft-store';
import type { InstanceAiEventBus } from '../event-bus';
import type { InstanceAiWorkflowService } from '../types';

export interface BackendSyncerOptions {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	eventBus: InstanceAiEventBus;
	workflowService: InstanceAiWorkflowService;
	projectId?: string;
}

export class BackendSyncer {
	private readonly threadId: string;

	private readonly runId: string;

	private readonly agentId: string;

	private readonly userId?: string;

	private readonly eventBus: InstanceAiEventBus;

	private readonly workflowService: InstanceAiWorkflowService;

	private readonly projectId?: string;

	private workflowId?: string;

	private syncing: Promise<void> = Promise.resolve();

	private promoted = false;

	constructor(opts: BackendSyncerOptions) {
		this.threadId = opts.threadId;
		this.runId = opts.runId;
		this.agentId = opts.agentId;
		this.userId = opts.userId;
		this.eventBus = opts.eventBus;
		this.workflowService = opts.workflowService;
		this.projectId = opts.projectId;
	}

	/** Create the workflow shell upfront so the canvas can open immediately. */
	async create(draft: DraftStore): Promise<string> {
		const saved = await this.workflowService.createFromWorkflowJSON(draft.toWorkflowJSON(), {
			...(this.projectId !== undefined && { projectId: this.projectId }),
			markAsAiTemporary: true,
		});
		this.workflowId = saved.id;
		draft.setWorkflowId(saved.id);

		// Emit a build-workflow tool-call/result so:
		//  - useResourceRegistry picks up { workflowId } and adds it to producedArtifacts
		//  - useCanvasPreview's latestBuildResult watcher opens the preview tab
		this.emitBuildEvents(saved.id, saved.name ?? draft.getState().name);
		return saved.id;
	}

	/**
	 * Push the current draft to the backend and trigger a UI refresh. Calls
	 * are serialised so concurrent specialists can't interleave updates.
	 *
	 * As soon as the saved workflow has at least one node, the AI-temporary
	 * marker is cleared — this promotes the workflow to a real, user-owned
	 * one. After promotion, a session interruption (browser close, server
	 * restart, cancel) leaves the partial workflow intact instead of having
	 * it reaped by `reapAiTemporaryForThreadCleanup` / `archiveIfAiTemporary`.
	 */
	sync(draft: DraftStore): Promise<void> {
		if (!this.workflowId) return Promise.resolve();
		const json = draft.toWorkflowJSON();
		const workflowId = this.workflowId;
		const previousSync = this.syncing;
		this.syncing = previousSync
			.catch(() => undefined)
			.then(async () => {
				await this.workflowService.updateFromWorkflowJSON(workflowId, json, {
					...(this.projectId !== undefined && { projectId: this.projectId }),
				});
				if (!this.promoted && json.nodes.length > 0) {
					await this.workflowService.clearAiTemporary(workflowId).catch(() => {
						// best-effort; we'll retry on the next sync
					});
					this.promoted = true;
				}
				this.emitBuildEvents(workflowId, json.name);
			});
		return this.syncing;
	}

	getWorkflowId(): string | undefined {
		return this.workflowId;
	}

	async clearAiTemporary(): Promise<void> {
		if (!this.workflowId) return;
		await this.workflowService.clearAiTemporary(this.workflowId).catch(() => {
			// best-effort
		});
	}

	private emitBuildEvents(workflowId: string, workflowName: string): void {
		const toolCallId = `inc_build_${nanoid(8)}` as ToolCallId;
		// Match the real `build-workflow` tool result shape — useResourceRegistry
		// + getLatestBuildResult both gate on `success === true` and `workflowId`
		// being a string, so the synthetic events drop straight into the existing
		// artifacts pipeline (registry → tab → iframe auto-open).
		const args = { name: workflowName, workflowId };
		const result = { success: true, workflowId, workflowName };

		const callEvent: InstanceAiEvent = {
			type: 'tool-call',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: { toolCallId, toolName: 'build-workflow', args },
		};
		const resultEvent: InstanceAiEvent = {
			type: 'tool-result',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: { toolCallId, result },
		};
		this.eventBus.publish(this.threadId, callEvent);
		this.eventBus.publish(this.threadId, resultEvent);
	}
}
