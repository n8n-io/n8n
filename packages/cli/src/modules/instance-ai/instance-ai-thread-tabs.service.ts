import {
	instanceAiThreadTabsStateSchema,
	MAX_INSTANCE_AI_THREAD_CLOSED_TABS,
	MAX_INSTANCE_AI_THREAD_OPEN_TABS,
	type InstanceAiThreadTab,
	type InstanceAiThreadTabRef,
	type InstanceAiThreadTabsState,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiChangedArtifact } from '@n8n/instance-ai';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import { InstanceAiThreadTabsRepository } from './repositories/instance-ai-thread-tabs.repository';

function isSameTab(a: InstanceAiThreadTabRef, b: InstanceAiThreadTabRef) {
	return a.type === b.type && a.id === b.id;
}

/**
 * The stored tabs with `tab` shown, as during a live run: removed from the
 * closed tabs, added at the end when it is not open yet, active, and with the
 * preview open. Returns `null` when nothing changes.
 */
export function withShownTab(
	stored: InstanceAiThreadTabsState | null,
	tab: InstanceAiChangedArtifact,
): InstanceAiThreadTabsState | null {
	const existing = stored?.tabs.find((open) => isSameTab(open, tab));
	// The tab renders this name until the thread's messages load. The ID is the last fallback.
	const name = (tab.name ?? existing?.name ?? tab.id).slice(0, 255);
	const projectId = tab.projectId ?? existing?.projectId;
	const merged: InstanceAiThreadTab = {
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
	while (tabs.length > MAX_INSTANCE_AI_THREAD_OPEN_TABS) {
		const index = tabs.findIndex((open) => !isSameTab(open, tab));
		const [dropped] = tabs.splice(index, 1);
		closedTabs = [
			...closedTabs.filter((closed) => !isSameTab(closed, dropped)),
			{ type: dropped.type, id: dropped.id },
		];
	}

	return {
		tabs,
		closedTabs: closedTabs.slice(-MAX_INSTANCE_AI_THREAD_CLOSED_TABS),
		activeTab,
		previewOpen: true,
	};
}

/** Saves and loads the tabs that each user has open in a thread. */
@Service()
export class InstanceAiThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly threadTabsRepository: InstanceAiThreadTabsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {}

	async getState(threadId: string, userId: string): Promise<InstanceAiThreadTabsState | null> {
		const stored = await this.threadTabsRepository.findState(threadId, userId);
		return this.parseStored(threadId, stored);
	}

	async saveState(
		threadId: string,
		userId: string,
		state: InstanceAiThreadTabsState,
	): Promise<void> {
		await this.threadTabsRepository.saveState(threadId, userId, state);
	}

	/**
	 * Show the tab of an artifact the agent created or changed, as the frontend
	 * does during a live run. A tab the user closed opens again. The first
	 * artifact of a thread creates its stored tabs.
	 */
	async showArtifactTab(
		threadId: string,
		userId: string,
		artifact: InstanceAiChangedArtifact,
	): Promise<void> {
		const tab = await this.withCurrentName(artifact);
		await this.threadTabsRepository.updateState(threadId, userId, (stored) =>
			withShownTab(this.parseStored(threadId, stored), tab),
		);
	}

	/** The current name of the artifact. A rename can make the name the tool knows stale. */
	private async withCurrentName(
		artifact: InstanceAiChangedArtifact,
	): Promise<InstanceAiChangedArtifact> {
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

	private parseStored(threadId: string, stored: unknown): InstanceAiThreadTabsState | null {
		if (stored === null) return null;

		// A state saved by an older schema must not break the tab bar. The client
		// falls back to the default tabs and saves a valid state on the next change.
		const parsed = instanceAiThreadTabsStateSchema.safeParse(stored);
		if (!parsed.success) {
			this.logger.warn('Ignoring invalid stored Instance AI thread tabs', { threadId });
			return null;
		}
		return parsed.data;
	}
}
