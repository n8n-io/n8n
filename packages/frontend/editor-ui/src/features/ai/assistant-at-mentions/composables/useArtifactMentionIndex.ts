import { getWorkflow } from '@/app/api/workflows';
import { STICKY_NODE_TYPE } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { IWorkflowDb } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INode, IWorkflowGroup } from 'n8n-workflow';
import {
	computed,
	onScopeDispose,
	ref,
	shallowReactive,
	toValue,
	watch,
	type MaybeRefOrGetter,
} from 'vue';

import type {
	WorkflowArtifactIndex,
	WorkflowArtifactIndexEntry,
	WorkflowArtifactReference,
} from '../assistantAtMentions.types';

const MAX_CONCURRENT_WORKFLOW_LOADS = 2;

type ProjectionNode = Pick<INode, 'id' | 'name' | 'type' | 'typeVersion'>;
type ProjectionGroup = Pick<IWorkflowGroup, 'id' | 'name' | 'nodeIds'>;

export interface WorkflowArtifactProjectionSource {
	id: string;
	name: string;
	versionId: string;
	nodes: readonly ProjectionNode[];
	nodeGroups?: readonly ProjectionGroup[];
}

export interface UseArtifactMentionIndexOptions {
	artifacts: MaybeRefOrGetter<readonly WorkflowArtifactReference[]>;
	activeWorkflowId?: MaybeRefOrGetter<string | undefined>;
	fetchWorkflow?: (workflowId: string) => Promise<IWorkflowDb>;
	getActiveWorkflow?: (workflowId: string) => WorkflowArtifactProjectionSource | undefined;
}

interface QueuedLoad {
	workflowId: string;
	generation: number;
	resolve: (index: WorkflowArtifactIndex | undefined) => void;
}

export function projectWorkflowArtifact(
	workflow: WorkflowArtifactProjectionSource,
): WorkflowArtifactIndex {
	const nodes = workflow.nodes
		.filter((node) => node.type !== STICKY_NODE_TYPE)
		.map(({ id, name, type, typeVersion }) => ({
			id,
			name,
			type,
			typeVersion,
		}));
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const groups = (workflow.nodeGroups ?? [])
		.map(({ id, name, nodeIds }) => ({
			id,
			name,
			nodeIds: [...new Set(nodeIds.filter((nodeId) => nodesById.has(nodeId)))],
		}))
		.filter((group) => group.nodeIds.length > 0);
	const groupsById = new Map(groups.map((group) => [group.id, group]));
	const nodeIdToGroupId = new Map<string, string>();
	for (const group of groups) {
		for (const nodeId of group.nodeIds) {
			if (!nodeIdToGroupId.has(nodeId)) nodeIdToGroupId.set(nodeId, group.id);
		}
	}

	return {
		workflowId: workflow.id,
		workflowName: workflow.name,
		versionId: workflow.versionId,
		nodes,
		groups,
		nodesById,
		groupsById,
		nodeIdToGroupId,
	};
}

export function useArtifactMentionIndex(options: UseArtifactMentionIndexOptions) {
	const entries = shallowReactive(new Map<string, WorkflowArtifactIndexEntry>());
	const revision = ref(0);
	const artifactById = computed(
		() => new Map(toValue(options.artifacts).map((artifact) => [artifact.id, artifact])),
	);
	const requestGenerations = new Map<string, number>();
	const pendingLoads = new Map<string, Promise<WorkflowArtifactIndex | undefined>>();
	const loadQueue: QueuedLoad[] = [];
	let activeLoadCount = 0;
	let disposed = false;

	const fetchWorkflow =
		options.fetchWorkflow ??
		(async (workflowId: string) => await getWorkflow(useRootStore().restApiContext, workflowId));
	const getActiveWorkflow =
		options.getActiveWorkflow ??
		((workflowId: string): WorkflowArtifactProjectionSource | undefined => {
			const store = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			if (!store?.hydrated) return undefined;
			return {
				id: workflowId,
				name: store.name,
				versionId: store.versionId,
				nodes: store.allNodes,
				nodeGroups: store.allGroups,
			};
		});

	function setEntry(workflowId: string, entry: WorkflowArtifactIndexEntry): void {
		entries.set(workflowId, entry);
		revision.value++;
	}

	function removeEntry(workflowId: string): void {
		if (entries.delete(workflowId)) revision.value++;
	}

	function nextGeneration(workflowId: string): number {
		const generation = (requestGenerations.get(workflowId) ?? 0) + 1;
		requestGenerations.set(workflowId, generation);
		return generation;
	}

	function isCurrent(workflowId: string, generation: number): boolean {
		return (
			!disposed &&
			artifactById.value.has(workflowId) &&
			requestGenerations.get(workflowId) === generation
		);
	}

	function getActiveProjection(workflowId: string): WorkflowArtifactIndex | undefined {
		if (toValue(options.activeWorkflowId) !== workflowId) return undefined;
		const workflow = getActiveWorkflow(workflowId);
		return workflow ? projectWorkflowArtifact(workflow) : undefined;
	}

	async function executeLoad(task: QueuedLoad): Promise<WorkflowArtifactIndex | undefined> {
		if (!isCurrent(task.workflowId, task.generation)) return undefined;

		try {
			const workflow = await fetchWorkflow(task.workflowId);
			if (!isCurrent(task.workflowId, task.generation)) return undefined;

			const activeProjection = getActiveProjection(task.workflowId);
			if (activeProjection) {
				setEntry(task.workflowId, {
					status: 'ready',
					source: 'active',
					index: activeProjection,
				});
				return activeProjection;
			}

			// The thread artifact owns the display name. A rename that lands while this
			// fetch is in flight must not be undone by the older server response.
			const artifact = artifactById.value.get(task.workflowId);
			const index = projectWorkflowArtifact(
				artifact ? { ...workflow, name: artifact.name } : workflow,
			);
			setEntry(task.workflowId, { status: 'ready', source: 'fetched', index });
			return index;
		} catch (error) {
			if (isCurrent(task.workflowId, task.generation)) {
				const previous = entries.get(task.workflowId);
				setEntry(task.workflowId, {
					status: 'error',
					error,
					...(previous?.index ? { source: previous.source, index: previous.index } : {}),
				});
			}
			return undefined;
		}
	}

	function drainQueue(): void {
		while (!disposed && activeLoadCount < MAX_CONCURRENT_WORKFLOW_LOADS && loadQueue.length > 0) {
			const task = loadQueue.shift();
			if (!task) return;
			if (!isCurrent(task.workflowId, task.generation)) {
				task.resolve(undefined);
				continue;
			}

			activeLoadCount++;
			void executeLoad(task).then((index) => {
				activeLoadCount--;
				task.resolve(index);
				drainQueue();
			});
		}
	}

	function invalidate(workflowId: string): void {
		nextGeneration(workflowId);
		pendingLoads.delete(workflowId);
		if (artifactById.value.has(workflowId)) {
			setEntry(workflowId, { status: 'idle' });
		} else {
			removeEntry(workflowId);
		}
	}

	async function load(
		workflowId: string,
		options: { force?: boolean } = {},
	): Promise<WorkflowArtifactIndex | undefined> {
		if (disposed || !artifactById.value.has(workflowId)) return undefined;

		const current = entries.get(workflowId);
		if (current?.status === 'ready' && current.source === 'active') {
			return current.index;
		}

		const activeProjection = getActiveProjection(workflowId);
		if (activeProjection) {
			nextGeneration(workflowId);
			setEntry(workflowId, {
				status: 'ready',
				source: 'active',
				index: activeProjection,
			});
			return activeProjection;
		}

		if (!options.force) {
			const pending = pendingLoads.get(workflowId);
			if (pending) return await pending;
			if (current?.status === 'ready') return current.index;
			if (current?.status === 'error') return current.index;
		} else {
			nextGeneration(workflowId);
			pendingLoads.delete(workflowId);
		}

		const generation = nextGeneration(workflowId);
		setEntry(workflowId, {
			status: 'loading',
			...(current?.index ? { source: current.source, index: current.index } : {}),
		});
		const promise = new Promise<WorkflowArtifactIndex | undefined>((resolve) => {
			loadQueue.push({ workflowId, generation, resolve });
			drainQueue();
		});
		pendingLoads.set(workflowId, promise);
		void promise.then(() => {
			if (pendingLoads.get(workflowId) === promise) pendingLoads.delete(workflowId);
		});
		return await promise;
	}

	async function loadAll(): Promise<void> {
		const activeWorkflowId = toValue(options.activeWorkflowId);
		const workflowIds = [...artifactById.value.keys()].sort((left, right) => {
			if (left === activeWorkflowId) return -1;
			if (right === activeWorkflowId) return 1;
			return 0;
		});
		await Promise.all(workflowIds.map(async (workflowId) => await load(workflowId)));
	}

	function getEntry(workflowId: string): WorkflowArtifactIndexEntry | undefined {
		return entries.get(workflowId);
	}

	function getIndex(workflowId: string): WorkflowArtifactIndex | undefined {
		return entries.get(workflowId)?.index;
	}

	async function retry(workflowId: string): Promise<WorkflowArtifactIndex | undefined> {
		return await load(workflowId, { force: true });
	}

	function dispose(): void {
		if (disposed) return;
		disposed = true;
		for (const workflowId of artifactById.value.keys()) nextGeneration(workflowId);
		for (const task of loadQueue.splice(0)) task.resolve(undefined);
		pendingLoads.clear();
		entries.clear();
		revision.value++;
	}

	watch(
		() => toValue(options.artifacts).map(({ id, name }) => [id, name] as const),
		(artifacts, previousArtifacts = []) => {
			const artifactsChanged =
				artifacts.length !== previousArtifacts.length ||
				artifacts.some(
					([workflowId, name], index) =>
						workflowId !== previousArtifacts[index]?.[0] || name !== previousArtifacts[index]?.[1],
				);
			const revisionBeforeChange = revision.value;
			const nextIds = new Set(artifacts.map(([workflowId]) => workflowId));
			for (const [workflowId, name] of artifacts) {
				const entry = entries.get(workflowId);
				if (!entry?.index || entry.source === 'active' || entry.index.workflowName === name) {
					continue;
				}
				setEntry(workflowId, {
					...entry,
					index: { ...entry.index, workflowName: name },
				});
			}
			for (const [workflowId] of previousArtifacts) {
				if (nextIds.has(workflowId)) continue;
				nextGeneration(workflowId);
				pendingLoads.delete(workflowId);
				removeEntry(workflowId);
			}
			if (artifactsChanged && revision.value === revisionBeforeChange) revision.value++;
		},
		{ immediate: true },
	);

	const activeProjection = computed(() => {
		const workflowId = toValue(options.activeWorkflowId);
		if (!workflowId || !artifactById.value.has(workflowId)) return undefined;
		return getActiveProjection(workflowId);
	});
	watch(
		[() => toValue(options.activeWorkflowId), activeProjection],
		([workflowId, index], previousValues) => {
			const previousWorkflowId = previousValues?.[0];
			const activeWorkflowChanged =
				previousWorkflowId !== undefined && previousWorkflowId !== workflowId;
			if (activeWorkflowChanged && entries.get(previousWorkflowId)?.source === 'active') {
				// The previous workflow lost its live canvas projection. Refresh it from the backend.
				invalidate(previousWorkflowId);
				void load(previousWorkflowId);
			}

			if (!workflowId || !artifactById.value.has(workflowId)) return;
			if (index) {
				nextGeneration(workflowId);
				setEntry(workflowId, { status: 'ready', source: 'active', index });
			} else if (entries.get(workflowId)?.source === 'active') {
				invalidate(workflowId);
				void load(workflowId);
			} else if (!entries.has(workflowId)) {
				void load(workflowId);
			}
		},
		{ immediate: true },
	);

	onScopeDispose(dispose);

	return {
		entries,
		revision,
		getEntry,
		getIndex,
		load,
		loadAll,
		invalidate,
		retry,
		dispose,
	};
}
