import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import debounce from 'lodash/debounce';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useRootStore } from '@n8n/stores/useRootStore';
import { NODE_SEARCH_MIN_QUERY_LENGTH, type NodeSearchHit } from '@n8n/api-types';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { DEBOUNCE_TIME, VIEWS } from '@/app/constants';
import { GLOBAL_NODE_SEARCH_EXPERIMENT } from '@/app/constants/experiments';
import { searchWorkflowNodes } from '@/app/api/workflows';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import type { CommandBarItem, CommandGroup } from '../types';
import { useWorkflowLocationSuffix } from './useWorkflowLocationSuffix';

export const GLOBAL_NODE_SEARCH_COMMAND_ID = 'global-node-search-result';

export function useGlobalNodeSearchCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
}): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const rootStore = useRootStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const posthogStore = usePostHog();
	const { getSuffix, getProjectIcon, cacheParentFolders } = useWorkflowLocationSuffix();
	const { lastQuery, activeNodeId } = options;

	const results = ref<NodeSearchHit[]>([]);
	const hasMore = ref(false);
	const isLoading = ref(false);

	/**
	 * Monotonic token used to drop stale responses. `makeRestApiRequest` has no
	 * abort support, so without this a slow request for "sla" can land after a
	 * fast one for "slack" and overwrite the newer results.
	 */
	let latestRequestId = 0;

	const isEnabled = computed(() =>
		posthogStore.isVariantEnabled(
			GLOBAL_NODE_SEARCH_EXPERIMENT.name,
			GLOBAL_NODE_SEARCH_EXPERIMENT.variant,
		),
	);

	const reset = () => {
		results.value = [];
		hasMore.value = false;
		isLoading.value = false;
	};

	const fetchImpl = async (query: string) => {
		const requestId = ++latestRequestId;

		try {
			const response = await searchWorkflowNodes(rootStore.restApiContext, query);

			// A newer query superseded this one while it was in flight.
			if (requestId !== latestRequestId) return;

			// The current workflow is covered by the in-workflow "Open node" section,
			// which also sees unsaved changes the server cannot know about.
			const currentWorkflowId = workflowDocumentStore?.value?.workflowId;
			const hits = response.results.filter((hit) => hit.workflowId !== currentWorkflowId);

			cacheParentFolders(hits);
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

	function hitToCommandBarItem(hit: NodeSearchHit): CommandBarItem {
		const nodeType = nodeTypesStore.getNodeType(hit.nodeType);
		const suffixParts = [hit.workflowName, getSuffix(hit)].filter(Boolean);
		const suffix = suffixParts.join(' / ');

		const nodeName = hit.nodeName || hit.nodeType;
		const title = hit.disabled ? `${nodeName} (${i18n.baseText('node.disabled')})` : nodeName;

		// The command bar re-filters items client-side against title + keywords, so
		// the matched snippet must be a keyword or parameter matches get dropped here.
		const keywords = [hit.nodeName, hit.nodeType, hit.workflowName, hit.snippet];
		if (hit.homeProject?.name) keywords.push(hit.homeProject.name);

		return {
			// Prefixed so telemetry can collapse every result to one `command_id`
			// instead of emitting an unbounded set of workflow/node id pairs.
			id: `${GLOBAL_NODE_SEARCH_COMMAND_ID}-${hit.workflowId}-${hit.nodeId}`,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix,
					...(suffix ? { suffixIcon: getProjectIcon(hit) } : {}),
				},
			},
			section: i18n.baseText('commandBar.globalNodeSearch.section'),
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
		const isSticky = hit.isSticky || hit.nodeType === STICKY_NODE_TYPE;

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
		if (activeNodeId.value !== null) return [];

		const trimmedQuery = lastQuery.value.trim();
		if (trimmedQuery.length < NODE_SEARCH_MIN_QUERY_LENGTH) return [];

		const items = results.value.map(hitToCommandBarItem);

		// Make truncation visible — otherwise a capped result list reads as "that's
		// everything there is".
		if (hasMore.value && items.length > 0) {
			items.push({
				id: `${GLOBAL_NODE_SEARCH_COMMAND_ID}-truncated`,
				title: i18n.baseText('commandBar.globalNodeSearch.truncated', {
					interpolate: { count: items.length },
				}),
				section: i18n.baseText('commandBar.globalNodeSearch.section'),
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

		if (activeNodeId.value !== null || trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
			latestRequestId++; // invalidate anything in flight
			fetchDebounced.cancel();
			reset();
			return;
		}

		isLoading.value = true;
		void fetchDebounced(trimmed);
	}

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
