import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import {
	ARTIFACT_TAB_TOOLS,
	getArtifactTabChange,
	type ArtifactTabChange,
} from './artifact-tab-change';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiThreadTabsService } from './instance-ai-thread-tabs.service';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';

/** Most tool calls that wait for their result at a time, over all threads. */
const MAX_PENDING_CALLS = 1000;

interface PendingCall {
	toolName: string;
	args: Record<string, unknown>;
}

/**
 * Opens the tab of each artifact the agent creates or changes, in the stored
 * tabs of the thread owner. The frontend does the same during a live run, but
 * a run that no browser shows (a closed browser tab, a background task) must
 * still reopen a tab the user closed.
 */
@Service()
export class InstanceAiArtifactTabsTracker {
	/**
	 * Tool calls that wait for their result, keyed by thread and tool call. A
	 * `tool-result` carries no tool name or arguments, so the call supplies them.
	 */
	private readonly pendingCalls = new Map<string, PendingCall>();

	/** The tab write in progress per thread, so writes for one thread do not interleave. */
	private readonly writes = new Map<string, Promise<void>>();

	constructor(
		private readonly logger: Logger,
		eventBus: InProcessEventBus,
		private readonly threadRepository: InstanceAiThreadRepository,
		private readonly threadTabsService: InstanceAiThreadTabsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');
		eventBus.observePublished((threadId, event) => this.observe(threadId, event));
	}

	observe(threadId: string, event: InstanceAiEvent): void {
		if (event.type === 'tool-call') {
			if (!ARTIFACT_TAB_TOOLS.has(event.payload.toolName)) return;
			// A call whose result never comes must not stay forever. Map order is insertion order.
			if (this.pendingCalls.size >= MAX_PENDING_CALLS) {
				const oldest = this.pendingCalls.keys().next().value;
				if (oldest !== undefined) this.pendingCalls.delete(oldest);
			}
			this.pendingCalls.set(`${threadId}:${event.payload.toolCallId}`, {
				toolName: event.payload.toolName,
				args: event.payload.args,
			});
			return;
		}

		if (event.type !== 'tool-result' && event.type !== 'tool-error') return;
		const key = `${threadId}:${event.payload.toolCallId}`;
		const call = this.pendingCalls.get(key);
		if (!call) return;
		this.pendingCalls.delete(key);
		if (event.type === 'tool-error') return;

		const change = getArtifactTabChange(call.toolName, call.args, event.payload.result);
		if (change) this.enqueue(threadId, async () => await this.openTab(threadId, change));
	}

	/** Resolves when the tab writes that started before the call are done. */
	async flush(threadId: string): Promise<void> {
		await this.writes.get(threadId);
	}

	private enqueue(threadId: string, write: () => Promise<void>): void {
		const previous = this.writes.get(threadId) ?? Promise.resolve();
		const next = previous.then(write).catch((error: unknown) => {
			this.logger.warn('Failed to open an Instance AI artifact tab', { threadId, error });
		});
		this.writes.set(threadId, next);
		void next.finally(() => {
			if (this.writes.get(threadId) === next) this.writes.delete(threadId);
		});
	}

	private async openTab(threadId: string, change: ArtifactTabChange): Promise<void> {
		const userId = await this.threadRepository.findResourceId(threadId);
		if (!userId) return;
		await this.threadTabsService.openArtifactTab(threadId, userId, await this.withName(change));
	}

	/** The current name of the artifact. A rename can make the name in the tool call stale. */
	private async withName(change: ArtifactTabChange): Promise<ArtifactTabChange> {
		if (change.type === 'workflow') {
			const [workflow] = await this.workflowRepository.findByIds([change.id], {
				fields: ['name'],
			});
			return workflow ? { ...change, name: workflow.name } : change;
		}
		if (change.type === 'data-table') {
			const [table] = await this.dataTableRepository.findSummariesByIds([change.id]);
			return table ? { ...change, name: table.name, projectId: table.projectId } : change;
		}
		return change;
	}
}
