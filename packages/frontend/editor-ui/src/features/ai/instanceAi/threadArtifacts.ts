import type { InstanceAiThreadArtifact, InstanceAiThreadArtifactsContext } from '@n8n/api-types';

import type { ArtifactTurn } from './artifactTurns';
import {
	getExecutionResultsByWorkflow,
	type RememberedManualExecution,
} from './canvasPreview.utils';
import type { ResourceEntry } from './useResourceRegistry';

type ThreadArtifactType = InstanceAiThreadArtifact['type'];

/** A tab the user has open in the thread view. */
export type OpenThreadTab = {
	type: ThreadArtifactType;
	id: string;
	name?: string;
	projectId?: string;
	pending?: boolean;
};

const MAX_THREAD_ARTIFACTS = 20;

function isThreadArtifactType(type: ResourceEntry['type']): type is ThreadArtifactType {
	return (
		type === 'workflow' ||
		type === 'agent' ||
		type === 'data-table' ||
		type === 'skill' ||
		type === 'app'
	);
}

/** Reads the execution that the preview of a workflow shows, if it shows one. */
export type DisplayedExecutionReader = (workflowId: string) => string | undefined;

/**
 * Reads the execution that the preview of a workflow shows. The run of the user
 * wins, unless the agent ran the workflow after it. The thread keeps both, so
 * the answer is the same for a workflow tab that is not mounted.
 */
export function createDisplayedExecutionReader(
	turns: readonly ArtifactTurn[],
	getRememberedManualExecution: (workflowId: string) => RememberedManualExecution | undefined,
): DisplayedExecutionReader {
	const agentRuns = getExecutionResultsByWorkflow(turns);
	return (workflowId) => {
		const agentExecutionId = agentRuns.get(workflowId)?.executionId;
		const manual = getRememberedManualExecution(workflowId);
		return manual && manual.agentExecutionId === agentExecutionId
			? manual.executionId
			: agentExecutionId;
	};
}

function toThreadArtifact(
	tab: OpenThreadTab,
	produced: ResourceEntry | undefined,
	executionId?: string,
): InstanceAiThreadArtifact {
	const name = tab.name ?? produced?.name;
	const projectId = tab.projectId ?? produced?.projectId;
	return {
		type: tab.type,
		id: tab.id,
		...(name ? { name } : {}),
		...(projectId ? { projectId } : {}),
		...(tab.pending || produced?.pending ? { pending: true as const } : {}),
		...(produced?.archived ? { archived: true as const } : {}),
		...(executionId ? { executionId } : {}),
	};
}

/**
 * Build the per-turn index the backend injects inside `<thread-context>`: ids
 * and names only.
 *
 * With `openTabs`, the index is the tabs the user has open, in tab order. An
 * empty list tells the agent no tabs are open. Without it, for a
 * client that has no tab bar, the index is every artifact the thread produced.
 *
 * A workflow tab also names the execution that its preview shows. Without it,
 * the agent cannot find a run that the user started in the preview, and asks
 * to run the workflow again.
 */
export function buildThreadArtifactsContext(
	produced: Iterable<ResourceEntry>,
	activeId?: string,
	openTabs?: OpenThreadTab[],
	displayedExecutionId?: DisplayedExecutionReader,
): InstanceAiThreadArtifactsContext | undefined {
	const producedById = new Map<string, ResourceEntry>();
	const all: InstanceAiThreadArtifact[] = [];
	for (const entry of produced) {
		if (!isThreadArtifactType(entry.type)) continue;
		producedById.set(entry.id, entry);
		if (!openTabs) all.push(toThreadArtifact({ type: entry.type, id: entry.id }, entry));
	}

	if (openTabs) {
		const artifacts = openTabs.map((tab) =>
			toThreadArtifact(
				tab,
				producedById.get(tab.id),
				tab.type === 'workflow' ? displayedExecutionId?.(tab.id) : undefined,
			),
		);
		// Over the cap, keep the first tabs in tab order and never drop the focused one.
		const active = artifacts.find((artifact) => artifact.id === activeId);
		let capped = artifacts.slice(0, MAX_THREAD_ARTIFACTS);
		if (active && !capped.includes(active)) capped = [...capped.slice(0, -1), active];
		return { artifacts: capped, ...(active ? { activeId: active.id } : {}) };
	}

	if (all.length === 0) return undefined;

	// Insertion order is oldest first. Over the cap, keep the newest tabs — the
	// ones the user most likely refers to — and never drop the focused one.
	const active = all.find((artifact) => artifact.id === activeId);
	let artifacts = all.slice(-MAX_THREAD_ARTIFACTS);
	if (active && !artifacts.includes(active)) {
		artifacts = [active, ...artifacts.slice(1)];
	}

	return {
		artifacts,
		...(active ? { activeId: active.id } : {}),
	};
}
