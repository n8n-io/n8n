import {
	computed,
	nextTick,
	onScopeDispose,
	ref,
	toValue,
	watch,
	type MaybeRefOrGetter,
} from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import { getWorkflow, getWorkflows } from '@/app/api/workflows';
import { DEBOUNCE_TIME } from '@/app/constants';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { IWorkflowGroup } from 'n8n-workflow';

import { buildMentionKey } from './buildMentionAttachment';
import type {
	InstanceAiDraftMention,
	InstanceAiMentionCandidate,
	InstanceAiMentionNode,
} from './instanceAiMentions.types';

const WORKFLOW_PAGE_SIZE = 50;
const MAX_VISIBLE_RESULTS = 50;
const MAX_DETAIL_REQUESTS = 2;

type CatalogAvailability = 'idle' | 'loading' | 'available' | 'empty' | 'error';

interface WorkflowMetadata {
	id: string;
	name: string;
	versionId: string;
	isArchived: boolean;
	updatedAt: number | string;
}

interface WorkflowProjection extends WorkflowMetadata {
	nodes: INodeUi[];
	groups: IWorkflowGroup[];
}

export interface UseInstanceAiMentionCatalogOptions {
	enabled: MaybeRefOrGetter<boolean>;
	projectId: MaybeRefOrGetter<string | undefined>;
	isOpen: MaybeRefOrGetter<boolean>;
	query: MaybeRefOrGetter<string>;
	durableWorkflowIds: MaybeRefOrGetter<ReadonlySet<string>>;
	draftMentions: MaybeRefOrGetter<readonly InstanceAiDraftMention[]>;
	buildingWorkflowIds?: MaybeRefOrGetter<ReadonlySet<string>>;
	nodeContextEnabled?: MaybeRefOrGetter<boolean>;
}

function normalize(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase()
		.trim();
}

function candidateRank(candidate: InstanceAiMentionCandidate, normalizedQuery: string): number {
	const label = normalize(candidate.label);
	const parent = normalize(candidate.parentLabel ?? '');
	if (label === normalizedQuery) return 0;
	if (label.startsWith(normalizedQuery)) return 1;
	if (label.includes(normalizedQuery)) return 2;
	if (parent.includes(normalizedQuery)) return 3;
	return Number.POSITIVE_INFINITY;
}

function toMentionNode(node: INodeUi): InstanceAiMentionNode {
	return {
		id: node.id,
		name: node.name,
		type: node.type,
		typeVersion: node.typeVersion,
		...(node.disabled ? { disabled: true } : {}),
	};
}

function toMetadata(workflow: IWorkflowDb): WorkflowMetadata {
	return {
		id: workflow.id,
		name: workflow.name,
		versionId: workflow.versionId,
		isArchived: workflow.isArchived,
		updatedAt: workflow.updatedAt,
	};
}

function toProjection(workflow: IWorkflowDb): WorkflowProjection {
	return {
		...toMetadata(workflow),
		nodes: workflow.nodes,
		groups: workflow.nodeGroups ?? [],
	};
}

function createIdIndex(nodes: INodeUi[]): Map<string, INodeUi[]> {
	const index = new Map<string, INodeUi[]>();
	for (const node of nodes) {
		const matches = index.get(node.id) ?? [];
		matches.push(node);
		index.set(node.id, matches);
	}
	return index;
}

function projectLocalCandidates(projection: WorkflowProjection): InstanceAiMentionCandidate[] {
	const candidates: InstanceAiMentionCandidate[] = [];
	const nodesById = createIdIndex(projection.nodes);

	for (const [index, node] of projection.nodes.entries()) {
		if (node.type === STICKY_NODE_TYPE) continue;
		const nodeRef = toMentionNode(node);
		const available =
			!projection.isArchived && node.id.length > 0 && nodesById.get(node.id)?.length === 1;
		candidates.push({
			key: available
				? buildMentionKey({ kind: 'node', workflowId: projection.id, nodeId: node.id })
				: `unavailable-node:${projection.id}:${node.id}:${index}`,
			kind: 'node',
			label: node.name,
			parentLabel: projection.name,
			workflowId: projection.id,
			node: nodeRef,
			...(available
				? {
						source: {
							kind: 'node' as const,
							workflowId: projection.id,
							workflowName: projection.name,
							node: nodeRef,
						},
					}
				: { unavailableReason: 'node-unavailable' as const }),
		});
	}

	for (const [index, group] of projection.groups.entries()) {
		if (group.nodeIds.length === 0) continue;
		const uniqueMemberIds = new Set(group.nodeIds);
		const resolvedNodes = group.nodeIds.flatMap((nodeId) => nodesById.get(nodeId) ?? []);
		const tooLarge = group.nodeIds.length > 50;
		const available =
			!projection.isArchived &&
			!tooLarge &&
			group.id.length > 0 &&
			group.name.length > 0 &&
			uniqueMemberIds.size === group.nodeIds.length &&
			group.nodeIds.every((nodeId) => nodesById.get(nodeId)?.length === 1);
		candidates.push({
			key: available
				? buildMentionKey({ kind: 'canvas-group', workflowId: projection.id, groupId: group.id })
				: `unavailable-group:${projection.id}:${group.id}:${index}`,
			kind: 'canvas-group',
			label: group.name,
			parentLabel: projection.name,
			workflowId: projection.id,
			...(available
				? {
						source: {
							kind: 'canvas-group' as const,
							workflowId: projection.id,
							workflowName: projection.name,
							groupId: group.id,
							groupName: group.name,
							nodes: resolvedNodes.map(toMentionNode),
						},
					}
				: { unavailableReason: tooLarge ? 'group-too-large' : 'group-unavailable' }),
		});
	}

	return candidates;
}

export function useInstanceAiMentionCatalog(options: UseInstanceAiMentionCatalogOptions) {
	const rootStore = useRootStore();
	const availability = ref<CatalogAvailability>('idle');
	const workflowMetadata = ref<WorkflowMetadata[]>([]);
	const workflowCount = ref(0);
	const workflowError = ref(false);
	const isLoadingWorkflows = ref(false);
	const loadedQuery = ref('');
	const remoteQuery = ref('');
	const projections = ref(new Map<string, WorkflowProjection>());
	const pageCache = new Map<string, { count: number; data: WorkflowMetadata[] }>();
	const queuedDetailIds = new Set<string>();
	const scheduledDetailIds = new Set<string>();
	const detailQueue: string[] = [];
	const inFlightDetails = new Map<string, Promise<void>>();
	let activeDetailRequests = 0;
	let scopeGeneration = 0;
	let searchGeneration = 0;
	let disposed = false;

	const selectedKeys = computed(
		() => new Set(toValue(options.draftMentions).map((mention) => mention.key)),
	);
	const eligibleWorkflowIds = computed(() => {
		const ids = new Set(toValue(options.durableWorkflowIds));
		for (const mention of toValue(options.draftMentions)) ids.add(mention.target.workflowId);
		return ids;
	});
	const buildingWorkflowIds = computed(() =>
		toValue(options.buildingWorkflowIds ?? new Set<string>()),
	);

	const workflowCandidates = computed<InstanceAiMentionCandidate[]>(() =>
		workflowMetadata.value.map((workflow) => {
			const key = buildMentionKey({ kind: 'workflow', workflowId: workflow.id });
			return {
				key,
				kind: 'workflow',
				label: workflow.name,
				workflowId: workflow.id,
				source: {
					kind: 'workflow',
					workflowId: workflow.id,
					workflowName: workflow.name,
				},
				...(selectedKeys.value.has(key) ? { unavailableReason: 'selected' as const } : {}),
			};
		}),
	);
	const localCandidates = computed(() => {
		if (!toValue(options.nodeContextEnabled ?? true)) return [];
		return [...projections.value.values()]
			.flatMap(projectLocalCandidates)
			.map((candidate) =>
				selectedKeys.value.has(candidate.key)
					? { ...candidate, unavailableReason: 'selected' as const }
					: candidate,
			);
	});
	const visibleCandidates = computed(() => {
		const query = normalize(toValue(options.query));
		const workflows =
			loadedQuery.value === normalize(remoteQuery.value) &&
			loadedQuery.value === normalize(toValue(options.query))
				? workflowCandidates.value
				: [];
		const candidates = [...workflows, ...localCandidates.value];
		if (!query) return candidates.slice(0, MAX_VISIBLE_RESULTS);

		return candidates
			.map((candidate, index) => ({ candidate, index, rank: candidateRank(candidate, query) }))
			.filter(({ rank }) => Number.isFinite(rank))
			.sort((left, right) => left.rank - right.rank || left.index - right.index)
			.slice(0, MAX_VISIBLE_RESULTS)
			.map(({ candidate }) => candidate);
	});
	const hasMoreWorkflows = computed(() => workflowMetadata.value.length < workflowCount.value);

	async function checkAvailability(): Promise<void> {
		const enabled = toValue(options.enabled);
		const projectId = toValue(options.projectId);
		const generation = ++scopeGeneration;
		if (!enabled || !projectId) {
			availability.value = 'idle';
			return;
		}

		availability.value = 'loading';
		try {
			const response = await getWorkflows(
				rootStore.restApiContext,
				{ projectId, isArchived: false },
				{ skip: 0, take: 1, sortBy: 'name:asc' },
				['id'],
			);
			if (generation !== scopeGeneration) return;
			availability.value = response.count > 0 ? 'available' : 'empty';
		} catch {
			if (generation === scopeGeneration) availability.value = 'error';
		}
	}

	async function loadWorkflowPage(reset = true): Promise<void> {
		if (!toValue(options.enabled) || !toValue(options.isOpen)) return;
		const projectId = toValue(options.projectId);
		if (!projectId) return;

		const query = normalize(remoteQuery.value);
		const skip = reset ? 0 : workflowMetadata.value.length;
		const cacheKey = `${projectId}:${query}:${skip}`;
		const generation = ++searchGeneration;
		workflowError.value = false;
		isLoadingWorkflows.value = true;

		try {
			let page = pageCache.get(cacheKey);
			if (!page) {
				const response = await getWorkflows(
					rootStore.restApiContext,
					{ projectId, isArchived: false, ...(query ? { query } : {}) },
					{ skip, take: WORKFLOW_PAGE_SIZE, sortBy: 'name:asc' },
					['id', 'name', 'versionId', 'isArchived', 'updatedAt'],
				);
				page = { count: response.count, data: response.data.map(toMetadata) };
				pageCache.set(cacheKey, page);
			}
			if (generation !== searchGeneration) return;
			workflowMetadata.value = reset
				? page.data
				: [
						...workflowMetadata.value,
						...page.data.filter(
							(workflow) => !workflowMetadata.value.some(({ id }) => id === workflow.id),
						),
					];
			workflowCount.value = page.count;
			loadedQuery.value = query;
		} catch {
			if (generation === searchGeneration) workflowError.value = true;
		} finally {
			if (generation === searchGeneration) isLoadingWorkflows.value = false;
		}
	}

	async function fetchProjection(workflowId: string, generation: number): Promise<void> {
		try {
			const workflow = await getWorkflow(rootStore.restApiContext, workflowId);
			if (
				disposed ||
				generation !== scopeGeneration ||
				!eligibleWorkflowIds.value.has(workflowId) ||
				buildingWorkflowIds.value.has(workflowId)
			) {
				return;
			}
			const next = new Map(projections.value);
			next.set(workflowId, toProjection(workflow));
			projections.value = next;
		} catch {
			// Keep the artifact out of the catalog until a later invalidation retries it.
		} finally {
			activeDetailRequests -= 1;
			inFlightDetails.delete(workflowId);
			drainDetailQueue();
			if (
				generation !== scopeGeneration &&
				eligibleWorkflowIds.value.has(workflowId) &&
				!projections.value.has(workflowId)
			) {
				queueProjection(workflowId);
			}
		}
	}

	function drainDetailQueue(): void {
		while (activeDetailRequests < MAX_DETAIL_REQUESTS && detailQueue.length > 0) {
			const workflowId = detailQueue.shift();
			if (!workflowId) continue;
			queuedDetailIds.delete(workflowId);
			if (
				!eligibleWorkflowIds.value.has(workflowId) ||
				buildingWorkflowIds.value.has(workflowId) ||
				inFlightDetails.has(workflowId)
			) {
				continue;
			}
			activeDetailRequests += 1;
			const request = fetchProjection(workflowId, scopeGeneration);
			inFlightDetails.set(workflowId, request);
		}
	}

	function enqueueProjection(workflowId: string): void {
		if (
			!toValue(options.enabled) ||
			!toValue(options.projectId) ||
			queuedDetailIds.has(workflowId) ||
			inFlightDetails.has(workflowId) ||
			buildingWorkflowIds.value.has(workflowId)
		) {
			return;
		}
		queuedDetailIds.add(workflowId);
		detailQueue.push(workflowId);
		drainDetailQueue();
	}

	function queueProjection(workflowId: string): void {
		if (scheduledDetailIds.has(workflowId)) return;
		scheduledDetailIds.add(workflowId);
		void nextTick(() => {
			scheduledDetailIds.delete(workflowId);
			const store = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			if (store) {
				if (store.hydrated) refreshEligibleProjections();
				return;
			}
			enqueueProjection(workflowId);
		});
	}

	function refreshEligibleProjections(): void {
		if (!toValue(options.enabled) || !toValue(options.projectId)) {
			projections.value = new Map();
			return;
		}
		const eligible = eligibleWorkflowIds.value;
		const next = new Map([...projections.value].filter(([workflowId]) => eligible.has(workflowId)));

		for (const workflowId of eligible) {
			const store = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			if (store) {
				if (store.hydrated) {
					next.set(workflowId, {
						id: workflowId,
						name: store.name,
						versionId: store.versionId,
						isArchived: store.isArchived,
						updatedAt: store.updatedAt,
						nodes: store.allNodes,
						groups: store.allGroups,
					});
				}
				continue;
			}
			if (!next.has(workflowId)) queueProjection(workflowId);
		}

		projections.value = next;
	}

	const updateRemoteQuery = useDebounceFn((value: string) => {
		if (normalize(toValue(options.query)) === value) remoteQuery.value = value;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	watch(
		() => normalize(toValue(options.query)),
		(value) => {
			if (!value) remoteQuery.value = '';
			else void updateRemoteQuery(value);
		},
		{ immediate: true },
	);
	watch(
		() => [toValue(options.enabled), toValue(options.projectId)] as const,
		() => {
			scopeGeneration += 1;
			searchGeneration += 1;
			workflowMetadata.value = [];
			workflowCount.value = 0;
			loadedQuery.value = '';
			projections.value = new Map();
			pageCache.clear();
			void checkAvailability();
		},
		{ immediate: true },
	);
	watch(
		() => [
			toValue(options.enabled),
			toValue(options.projectId),
			toValue(options.isOpen),
			remoteQuery.value,
		],
		() => {
			void loadWorkflowPage();
		},
		{ immediate: true },
	);
	watch(
		() =>
			[...eligibleWorkflowIds.value].map((workflowId) => {
				const store = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
				return {
					workflowId,
					hydrated: store?.hydrated,
					versionId: store?.versionId,
					name: store?.name,
					nodes: store?.allNodes,
					groups: store?.allGroups,
				};
			}),
		refreshEligibleProjections,
		{ immediate: true, deep: true },
	);
	let previousBuildingIds = new Set<string>();
	watch(
		() => [...buildingWorkflowIds.value],
		(ids) => {
			const current = new Set(ids);
			const next = new Map(projections.value);
			for (const workflowId of previousBuildingIds) {
				if (!current.has(workflowId) && eligibleWorkflowIds.value.has(workflowId)) {
					next.delete(workflowId);
					queueProjection(workflowId);
				}
			}
			projections.value = next;
			previousBuildingIds = current;
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		disposed = true;
		scopeGeneration += 1;
		searchGeneration += 1;
		detailQueue.length = 0;
		queuedDetailIds.clear();
		scheduledDetailIds.clear();
	});

	return {
		availability,
		workflowCandidates,
		localCandidates,
		visibleCandidates,
		isLoadingWorkflows,
		workflowError,
		hasMoreWorkflows,
		loadMore: async () => await loadWorkflowPage(false),
		retry: async () => await loadWorkflowPage(true),
	};
}
