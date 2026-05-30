import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { VIEWS, DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
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
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const { lastQuery, activeNodeId } = options;

	const results = ref<NodeSearchHit[]>([]);
	const isLoading = ref(false);

	const fetchImpl = async (query: string) => {
		try {
			const trimmed = query.trim();
			if (trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
				results.value = [];
				return;
			}

			const response = await searchWorkflowNodes(rootStore.restApiContext, trimmed);
			const currentWorkflowId = workflowsStore.workflowId;
			// Exclude current workflow — its nodes are already covered by useNodeCommands.
			results.value = response.results.filter((hit) => hit.workflowId !== currentWorkflowId);
		} catch {
			results.value = [];
		} finally {
			isLoading.value = false;
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
				const targetRoute = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: hit.workflowId, nodeId: hit.nodeId },
				});
				window.location.href = targetRoute.fullPath;
			},
		};
	}

	const commands = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.trim().length < NODE_SEARCH_MIN_QUERY_LENGTH) return [];
		if (activeNodeId.value !== null) return [];
		return results.value.map(hitToCommandBarItem);
	});

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
		if (activeNodeId.value !== null) return;
		if (trimmed.length < NODE_SEARCH_MIN_QUERY_LENGTH) {
			results.value = [];
			isLoading.value = false;
			fetchDebounced.cancel();
			return;
		}
		isLoading.value = true;
		void fetchDebounced(trimmed);
	}

	function onCommandBarNavigateTo(to: string | null) {
		if (to !== null) {
			results.value = [];
			isLoading.value = false;
			fetchDebounced.cancel();
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
