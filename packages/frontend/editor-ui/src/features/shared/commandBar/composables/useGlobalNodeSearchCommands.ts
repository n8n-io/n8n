import { computed, ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import debounce from 'lodash/debounce';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	NODE_SEARCH_MIN_QUERY_LENGTH,
	type NodeSearchHit,
	type NodeSearchMatchedField,
} from '@n8n/api-types';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { DEBOUNCE_TIME, VIEWS } from '@/app/constants';
import { GLOBAL_NODE_SEARCH_EXPERIMENT } from '@/app/constants/experiments';
import { searchWorkflowNodes } from '@/app/api/workflows';
import NodeIcon from '@/app/components/NodeIcon.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import type { CommandBarItem, CommandGroup } from '../types';
import { useWorkflowLocationSuffix } from './useWorkflowLocationSuffix';

export const GLOBAL_NODE_SEARCH_COMMAND_ID = 'global-node-search-result';

const MATCHED_FIELD_RANK: Record<NodeSearchMatchedField, number> = {
	name: 0,
	type: 1,
	notes: 2,
	parameters: 3,
};

const SNIPPET_SUFFIX_MAX_LENGTH = 40;

export function useGlobalNodeSearchCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	/**
	 * When true (workflow context badge visible), skip cross-workflow search —
	 * local open-node commands already cover the current workflow.
	 */
	isWorkflowScoped: Ref<boolean>;
	/** When set (project context badge visible), only search nodes in that project. */
	scopedProjectId: Ref<string | null>;
}): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const rootStore = useRootStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const posthogStore = usePostHog();
	const { setNodeActive } = useCanvasOperations();
	const { getProjectIcon } = useWorkflowLocationSuffix();
	const { lastQuery, activeNodeId, isWorkflowScoped, scopedProjectId } = options;

	const results = ref<NodeSearchHit[]>([]);
	const hasMore = ref(false);
	const isLoading = ref(false);

	/**
	 * Monotonic token used to drop stale responses. `makeRestApiRequest` has no
	 * abort support, so without this a slow request for "sla" can land after a
	 * fast one for "slack" and overwrite the newer results.
	 */
	let latestRequestId = 0;

	// Opt-out: on unless PostHog explicitly assigns control. Local/dev (no flag)
	// stays enabled so Overview Cmd+K can search nodes without a manual override.
	const isEnabled = computed(() => {
		const variant = posthogStore.getVariant(GLOBAL_NODE_SEARCH_EXPERIMENT.name);
		return variant !== GLOBAL_NODE_SEARCH_EXPERIMENT.control;
	});

	const reset = () => {
		results.value = [];
		hasMore.value = false;
		isLoading.value = false;
	};

	function getProjectSubsectionLabel(hit: NodeSearchHit): string | undefined {
		if (hit.homeProject?.type === ProjectTypes.Personal) {
			return i18n.baseText('projects.menu.personal');
		}
		if (hit.homeProject?.name) {
			return hit.homeProject.name;
		}
		return undefined;
	}

	const fetchImpl = async (query: string) => {
		if (isWorkflowScoped.value) {
			reset();
			return;
		}

		const requestId = ++latestRequestId;

		try {
			const response = await searchWorkflowNodes(rootStore.restApiContext, query, {
				...(scopedProjectId.value ? { projectId: scopedProjectId.value } : {}),
			});

			// A newer query superseded this one while it was in flight.
			if (requestId !== latestRequestId) return;

			const currentWorkflowId = workflowDocumentStore.value?.workflowId;
			const localNodeIds = new Set(
				(workflowDocumentStore.value?.allNodes ?? []).map((node) => node.id),
			);

			// Prefer the canvas "Open node" section for the current workflow — but only
			// when those commands are actually available. If the document store has no
			// nodes (e.g. command bar resolved a fallback store), keep the API hits so
			// a query like "Get an event" is never empty for a real match.
			const projectId = scopedProjectId.value;
			const hits = (response.results ?? []).filter((hit) => {
				if (projectId && hit.homeProject?.id !== projectId) {
					return false;
				}
				if (hit.workflowId === currentWorkflowId && localNodeIds.has(hit.nodeId)) {
					return false;
				}
				return true;
			});

			results.value = hits;
			hasMore.value = response.hasMore;
		} catch {
			if (requestId !== latestRequestId) return;
			results.value = [];
			hasMore.value = false;
		} finally {
			if (requestId === latestRequestId) isLoading.value = false;
		}
	};

	const fetchDebounced = debounce(fetchImpl, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	function shortNodeType(nodeType: string): string {
		return nodeType.includes('.') ? nodeType.slice(nodeType.lastIndexOf('.') + 1) : nodeType;
	}

	function formatSnippetForSuffix(snippet: string): string {
		const collapsed = snippet.replace(/\s+/g, ' ').trim();
		if (collapsed.length <= SNIPPET_SUFFIX_MAX_LENGTH) return collapsed;
		return `${collapsed.slice(0, SNIPPET_SUFFIX_MAX_LENGTH)}…`;
	}

	function hitToCommandBarItem(hit: NodeSearchHit, subsection?: string): CommandBarItem {
		const nodeType = nodeTypesStore.getNodeType(hit.nodeType);
		const shortType = shortNodeType(hit.nodeType);
		const typeLabel = nodeType?.displayName || shortType;
		const nodesSection = i18n.baseText('commandBar.sections.nodes');

		// Nodes is the section; project is the subsection. Keep type + workflow on the row.
		const showSnippet =
			(hit.matchedField === 'notes' || hit.matchedField === 'parameters') && !!hit.snippet;
		const suffix = [showSnippet ? formatSnippetForSuffix(hit.snippet) : typeLabel, hit.workflowName]
			.filter(Boolean)
			.join(' · ');

		const nodeName = hit.nodeName || typeLabel;
		const openTitle = i18n.baseText('generic.openResource', {
			interpolate: { resource: nodeName },
		});
		const title = hit.disabled ? `${openTitle} (${i18n.baseText('node.disabled')})` : openTitle;

		// The command bar re-filters items client-side against title + keywords, so
		// the matched snippet and type labels must be keywords or hits get dropped.
		const keywords = [
			nodeName,
			hit.nodeName,
			hit.nodeType,
			shortType,
			shortType.replace(/([a-z\d])([A-Z])/g, '$1 $2'),
			typeLabel,
			hit.workflowName,
			hit.snippet,
			openTitle,
			nodesSection,
		];
		if (subsection) keywords.push(subsection);
		if (hit.homeProject?.name) keywords.push(hit.homeProject.name);
		if (hit.parentFolder?.name) keywords.push(hit.parentFolder.name);

		return {
			// Prefixed so telemetry can collapse every result to one `command_id`
			// instead of emitting an unbounded set of workflow/node id pairs.
			id: `${GLOBAL_NODE_SEARCH_COMMAND_ID}-${hit.workflowId}-${hit.nodeId}`,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix,
				},
			},
			section: nodesSection,
			...(subsection
				? {
						subsection,
						subsectionIcon: {
							component: ProjectIcon,
							props: {
								icon: getProjectIcon(hit),
								size: 'mini',
								borderLess: true,
							},
						},
					}
				: {}),
			keywords,
			icon: nodeType
				? { component: NodeIcon, props: { nodeType, size: 16 } }
				: { component: N8nIcon, props: { icon: 'search' } },
			handler: () => {
				navigateToHit(hit);
			},
		};
	}

	/**
	 * Sticky notes have no NDV, so passing their id as the `nodeId` route param
	 * would open an empty panel. Select them on the canvas instead.
	 */
	function navigateToHit(hit: NodeSearchHit) {
		const currentWorkflowId = workflowDocumentStore.value?.workflowId;
		const isCurrentWorkflow = hit.workflowId === currentWorkflowId;
		const isSticky = hit.isSticky || hit.nodeType === STICKY_NODE_TYPE;

		// Already on this workflow — open/select without a full reload.
		if (isCurrentWorkflow) {
			if (isSticky) {
				canvasEventBus.emit('nodes:select', { ids: [hit.nodeId], panIntoView: true });
				return;
			}
			setNodeActive(hit.nodeId, 'command_bar');
			return;
		}

		const targetRoute = router.resolve({
			name: VIEWS.WORKFLOW,
			params: {
				workflowId: hit.workflowId,
				...(isSticky ? {} : { nodeId: hit.nodeId }),
			},
			...(isSticky ? { query: { selectNode: hit.nodeId } } : {}),
		});

		// Full reload, matching how the workflow-name section opens workflows.
		window.location.href = targetRoute.fullPath;
	}

	const commands = computed<CommandBarItem[]>(() => {
		if (!isEnabled.value) return [];
		if (isWorkflowScoped.value) return [];
		if (activeNodeId.value !== null) return [];

		const trimmedQuery = lastQuery.value.trim();
		if (trimmedQuery.length < NODE_SEARCH_MIN_QUERY_LENGTH) return [];

		// Rank globally first, then bucket by project so subsections stay stable
		// while name matches still lead within each project.
		const sortedHits = [...results.value].sort(
			(a, b) => MATCHED_FIELD_RANK[a.matchedField] - MATCHED_FIELD_RANK[b.matchedField],
		);

		const hitsByProject = new Map<string | undefined, NodeSearchHit[]>();
		for (const hit of sortedHits) {
			const subsection = getProjectSubsectionLabel(hit);
			const bucket = hitsByProject.get(subsection) ?? [];
			bucket.push(hit);
			hitsByProject.set(subsection, bucket);
		}

		const items = [...hitsByProject.entries()].flatMap(([subsection, hits]) =>
			hits.map((hit) => hitToCommandBarItem(hit, subsection)),
		);

		// Make truncation visible — otherwise a capped result list reads as "that's
		// everything there is".
		if (hasMore.value && items.length > 0) {
			const lastItem = items[items.length - 1];
			items.push({
				id: `${GLOBAL_NODE_SEARCH_COMMAND_ID}-truncated`,
				title: i18n.baseText('commandBar.globalNodeSearch.truncated', {
					interpolate: { count: items.length },
				}),
				section: lastItem.section,
				subsection: lastItem.subsection,
				// The client-side filter matches on keywords, so the notice needs the
				// active query to survive alongside the results it describes.
				keywords: [trimmedQuery],
				icon: { component: N8nIcon, props: { icon: 'info' } },
			});
		}

		return items;
	});

	function onCommandBarChange(query: string) {
		if (!isEnabled.value) return;

		const trimmed = query.trim();

		if (
			isWorkflowScoped.value ||
			activeNodeId.value !== null ||
			trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH
		) {
			latestRequestId++; // invalidate anything in flight
			fetchDebounced.cancel();
			reset();
			return;
		}

		isLoading.value = true;
		void fetchDebounced(trimmed);
	}

	function refetchForCurrentQuery() {
		const trimmed = lastQuery.value.trim();
		if (activeNodeId.value !== null || trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
			return;
		}

		isLoading.value = true;
		void fetchDebounced(trimmed);
	}

	// Clearing the workflow context mid-query should immediately unlock global search.
	watch(isWorkflowScoped, (scoped, wasScoped) => {
		if (!isEnabled.value) return;
		if (scoped === wasScoped) return;

		if (scoped) {
			latestRequestId++;
			fetchDebounced.cancel();
			reset();
			return;
		}

		refetchForCurrentQuery();
	});

	// Clearing / applying project context should re-run search with the new scope.
	watch(scopedProjectId, (projectId, previousProjectId) => {
		if (!isEnabled.value) return;
		if (projectId === previousProjectId) return;
		if (isWorkflowScoped.value) return;

		latestRequestId++;
		fetchDebounced.cancel();
		refetchForCurrentQuery();
	});

	function onCommandBarNavigateTo(to: string | null) {
		if (to !== null) {
			latestRequestId++;
			fetchDebounced.cancel();
			reset();
		}
	}

	return {
		commands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
		isLoading,
	};
}
