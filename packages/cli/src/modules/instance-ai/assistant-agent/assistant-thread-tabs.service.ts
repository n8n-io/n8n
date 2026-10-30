import {
	assistantThreadTabsStateSchema,
	MAX_ASSISTANT_THREAD_CLOSED_TABS,
	MAX_ASSISTANT_THREAD_OPEN_TABS,
	type AssistantThreadTab,
	type AssistantThreadTabRef,
	type AssistantThreadTabsState,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiChangedArtifact } from '@n8n/instance-ai';

import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/** Thread metadata key with the tabs that the owner of an Assistant agent thread has open. */
export const ASSISTANT_TABS_METADATA_KEY = 'assistantTabs';

function isSameTab(a: AssistantThreadTabRef, b: AssistantThreadTabRef) {
	return a.type === b.type && a.id === b.id;
}

/**
 * The stored tabs with `tab` shown, as during a live run: removed from the
 * closed tabs, added at the end when it is not open yet, active, and with the
 * preview open. Returns `null` when nothing changes.
 */
export function withShownTab(
	stored: AssistantThreadTabsState | null,
	tab: InstanceAiChangedArtifact,
): AssistantThreadTabsState | null {
	const existing = stored?.tabs.find((open) => isSameTab(open, tab));
	// The tab renders this name until the thread's messages load. The ID is the last fallback.
	const name = (tab.name ?? existing?.name ?? tab.id).slice(0, 255);
	const projectId = tab.projectId ?? existing?.projectId;
	const merged: AssistantThreadTab = {
		type: tab.type,
		id: tab.id,
		name,
		...(projectId ? { projectId } : {}),
	};
	const activeTab = { type: tab.type, id: tab.id };
	if (stored === null) {
		return { tabs: [merged], closedTabs: [], activeTab, previewOpen: true };
	}

	const isClosed = stored.closedTabs.some((closed) => isSameTab(closed, tab));
	const isShown =
		stored.activeTab !== null && isSameTab(stored.activeTab, tab) && stored.previewOpen === true;
	if (
		!isClosed &&
		isShown &&
		existing?.name === merged.name &&
		existing.projectId === merged.projectId
	) {
		return null;
	}

	const tabs = existing
		? stored.tabs.map((open) => (isSameTab(open, tab) ? merged : open))
		: [...stored.tabs, merged];
	let closedTabs = stored.closedTabs.filter((closed) => !isSameTab(closed, tab));

	// Close the leftmost tabs over the limit, because a state over it fails to save.
	while (tabs.length > MAX_ASSISTANT_THREAD_OPEN_TABS) {
		const index = tabs.findIndex((open) => !isSameTab(open, tab));
		const [dropped] = tabs.splice(index, 1);
		closedTabs = [
			...closedTabs.filter((closed) => !isSameTab(closed, dropped)),
			{ type: dropped.type, id: dropped.id },
		];
	}

	return {
		tabs,
		closedTabs: closedTabs.slice(-MAX_ASSISTANT_THREAD_CLOSED_TABS),
		activeTab,
		previewOpen: true,
	};
}

/**
 * Saves and loads the tabs of Assistant agent threads, in the thread metadata
 * of the Agents memory. A thread has one owner, so it stores one state.
 */
@Service()
export class AssistantThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly n8nMemory: N8nMemory,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {}

	/** The caller checks thread access. */
	async getState(threadId: string): Promise<AssistantThreadTabsState | null> {
		const thread = await this.memory().getThread(threadId);
		return this.parseStored(threadId, thread?.metadata?.[ASSISTANT_TABS_METADATA_KEY]);
	}

	/**
	 * The caller checks thread access. A thread gets its memory row with its
	 * first turn, so a save before then does nothing.
	 */
	async saveState(threadId: string, state: AssistantThreadTabsState): Promise<void> {
		await this.updateState(threadId, () => state);
	}

	/**
	 * Show the tab of an artifact the agent created or changed, as the frontend
	 * does during a live run. A tab the user closed opens again. The first
	 * artifact of a thread creates its stored tabs.
	 */
	async showArtifactTab(threadId: string, artifact: InstanceAiChangedArtifact): Promise<void> {
		const tab = await this.withCurrentName(artifact);
		await this.updateState(threadId, (stored) => withShownTab(stored, tab));
	}

	/** The current name of the artifact. A rename can make the name the tool knows stale. */
	async withCurrentName(artifact: InstanceAiChangedArtifact): Promise<InstanceAiChangedArtifact> {
		if (artifact.type === 'workflow') {
			const [workflow] = await this.workflowRepository.findByIds([artifact.id], {
				fields: ['name'],
			});
			return workflow ? { ...artifact, name: workflow.name } : artifact;
		}
		if (artifact.type === 'data-table') {
			const [table] = await this.dataTableRepository.findSummariesByIds([artifact.id]);
			return table ? { ...artifact, name: table.name, projectId: table.projectId } : artifact;
		}
		return artifact;
	}

	/**
	 * Change the stored tabs on the locked thread row. The other metadata keys
	 * stay, because `patchThread` replaces the whole metadata.
	 */
	private async updateState(
		threadId: string,
		change: (stored: AssistantThreadTabsState | null) => AssistantThreadTabsState | null,
	): Promise<void> {
		await this.memory().patchThread({
			threadId,
			update: ({ metadata }) => {
				const next = change(this.parseStored(threadId, metadata?.[ASSISTANT_TABS_METADATA_KEY]));
				if (next === null) return null;
				return { metadata: { ...metadata, [ASSISTANT_TABS_METADATA_KEY]: next } };
			},
		});
	}

	private memory() {
		return this.n8nMemory.getImplementation(ASSISTANT_AGENT_ID);
	}

	private parseStored(threadId: string, stored: unknown): AssistantThreadTabsState | null {
		if (stored === undefined || stored === null) return null;

		// A state saved by an older schema must not break the tab bar. The client
		// falls back to the default tabs and saves a valid state on the next change.
		const parsed = assistantThreadTabsStateSchema.safeParse(stored);
		if (!parsed.success) {
			this.logger.warn('Ignoring invalid stored Assistant thread tabs', { threadId });
			return null;
		}
		return parsed.data;
	}
}
