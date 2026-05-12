import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { VIEWS, DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { searchWorkflowNodes } from '@/app/api/workflows';
import debounce from 'lodash/debounce';
import type { CommandBarItem, CommandGroup } from '../types';
import type { NodeSearchHit } from '@n8n/api-types';
import { NODE_SEARCH_MIN_QUERY_LENGTH } from '@n8n/api-types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';

export function useGlobalNodeSearchCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
}): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const rootStore = useRootStore();
	const currentWorkflowIdRef = useWorkflowId();
	const nodeTypesStore = useNodeTypesStore();
	const { lastQuery, activeNodeId } = options;

	const results = ref<NodeSearchHit[]>([]);
	const isLoading = ref(false);
	// Responses can land out of order; only the newest request may write results.
	let latestRequestId = 0;

	const fetchImpl = async (query: string) => {
		const requestId = ++latestRequestId;
		try {
			const trimmed = query.trim();
			if (trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
				results.value = [];
				return;
			}

			const response = await searchWorkflowNodes(rootStore.restApiContext, trimmed);
			if (requestId !== latestRequestId) return;

			const currentWorkflowId = currentWorkflowIdRef.value;
			// Exclude current workflow — its nodes are already covered by useNodeCommands.
			results.value = response.results.filter((hit) => hit.workflowId !== currentWorkflowId);
		} catch {
			if (requestId === latestRequestId) results.value = [];
		} finally {
			if (requestId === latestRequestId) isLoading.value = false;
		}
	};

	const fetchDebounced = debounce(fetchImpl, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	function hitToCommandBarItem(hit: NodeSearchHit): CommandBarItem {
		const nodeType = nodeTypesStore.getNodeType(hit.nodeType);

		const suffixParts: string[] = [hit.workflowName];
		if (hit.projectName) suffixParts.push(hit.projectName);
		if (hit.isArchived) {
			suffixParts.push(i18n.baseText('commandBar.globalNodeSearch.archivedMarker'));
		}
		if (hit.disabled) {
			suffixParts.push(i18n.baseText('commandBar.globalNodeSearch.disabledMarker'));
		}
		const suffix = suffixParts.join(' / ');

		const title = hit.nodeName || hit.nodeType;
		const keywords = [hit.nodeName, hit.nodeType, hit.workflowName];
		if (hit.projectName) keywords.push(hit.projectName);
		if (hit.stickyPreview) keywords.push(hit.stickyPreview);

		return {
			id: `global-node-${hit.workflowId}-${hit.nodeId}`,
			matchAnySearchTerm: true,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix,
				},
			},
			section: i18n.baseText('commandBar.globalNodeSearch.section'),
			keywords,
			...(nodeType
				? {
						icon: {
							component: NodeIcon,
							props: {
								nodeType,
								size: 16,
							},
						},
					}
				: {
						icon: {
							component: N8nIcon,
							props: { icon: 'search' },
						},
					}),
			handler: () => {
				void router.push({
					name: VIEWS.WORKFLOW,
					params: { workflowId: hit.workflowId, nodeId: hit.nodeId },
				});
			},
		};
	}

	const commands = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.trim().length < NODE_SEARCH_MIN_QUERY_LENGTH) return [];
		if (activeNodeId.value !== null) return [];
		return results.value.map(hitToCommandBarItem);
	});

	// Bumps the request id so an already in-flight response cannot repopulate
	// results after they were cleared.
	function reset() {
		latestRequestId++;
		results.value = [];
		isLoading.value = false;
		fetchDebounced.cancel();
	}

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
		if (activeNodeId.value !== null) return;
		if (trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
			reset();
			return;
		}
		isLoading.value = true;
		void fetchDebounced(trimmed);
	}

	function onCommandBarNavigateTo(to: string | null) {
		if (to !== null) reset();
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
