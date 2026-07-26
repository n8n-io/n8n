<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type {
	AgentCreateElement,
	INodeCreateElement,
	LabelCreateElement,
	NodeTypeSelectedPayload,
} from '@/Interface';
import { CHAT_TRIGGER_NODE_TYPE, DEBOUNCE_TIME, MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useAgentProjectNameResolver } from '@/features/agents/composables/useAgentProjectNameResolver';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { useAgentResourcesLocator } from '@/features/ndv/parameters/composables/useAgentResourcesLocator';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';

import { useActions } from '../../composables/useActions';
import { useKeyboardNavigation } from '../../composables/useKeyboardNavigation';
import { useViewStacks } from '../../composables/useViewStacks';

import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nLoading, N8nText } from '@n8n/design-system';

const emit = defineEmits<{
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();

const i18n = useI18n();
const { debounce } = useDebounce();
const { popViewStack, updateCurrentViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const { setAddedNodeActionParameters, shouldPrependChatTrigger } = useActions();
const nodeCreatorStore = useNodeCreatorStore();
const uiStore = useUIStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const projectId = useAgentScopeProjectId();
const { resolveProjectName } = useAgentProjectNameResolver();
const {
	agentsResources,
	isLoadingResources,
	loadError,
	hasMoreAgentsToLoad,
	onSearchFilter,
	loadMore,
	setAgentsResources,
} = useAgentResourcesLocator(projectId, resolveProjectName);

const search = computed(() => useViewStacks().activeViewStack.search ?? '');

// The panel search bar writes into the view stack; forward it to the remote
// agent catalog instead of the node creator's local fuzzy search.
const debouncedSearchFilter = debounce((term: string) => void onSearchFilter(term), {
	debounceTime: getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
	trailing: true,
});
watch(search, (term) => debouncedSearchFilter(term));

// Static entries above the agent list. Stable uuids keep the active keyboard
// item intact when load-more appends agents.
const staticElements = computed<INodeCreateElement[]>(() => {
	const createNew: AgentCreateElement = {
		key: 'agent-create-new',
		uuid: 'agent-create-new',
		type: 'agent',
		properties: {
			name: i18n.baseText('nodeCreator.agentsPanel.createNewAgent'),
			description: i18n.baseText('nodeCreator.agentsPanel.createNewAgentDescription'),
			variant: 'create',
		},
	};
	const divider: LabelCreateElement = {
		key: i18n.baseText('nodeCreator.agentsPanel.existingAgentsLabel'),
		uuid: 'agents-divider',
		type: 'label',
		subcategory: '',
		properties: { key: i18n.baseText('nodeCreator.agentsPanel.existingAgentsLabel') },
	};
	return [createNew, divider];
});

const agentElements = computed<INodeCreateElement[]>(() =>
	agentsResources.value.map((agent) => ({
		key: agent.value,
		uuid: `agent-${agent.value}`,
		type: 'agent',
		properties: {
			name: agent.name,
			variant: 'existing',
			agentId: agent.value,
			personalisation: agent.personalisation,
		},
	})),
);

const showEmptyState = computed(
	() => !isLoadingResources.value && !loadError.value && agentElements.value.length === 0,
);

// Only skeleton when there is nothing to show yet; while a search refresh is
// in flight the previous results stay rendered so the list doesn't blink.
const showLoadingSkeleton = computed(
	() => isLoadingResources.value && agentElements.value.length === 0,
);

// Load-more sentinel; the viewport root still respects clipping by the
// panel's scrollable ancestor, so intersection fires when the sentinel
// scrolls into the visible list area.
const loadMoreSentinel = ref<HTMLElement | null>(null);
const observerRoot = ref<Element | null>(null);
const { observe: observeForLoadMore } = useIntersectionObserver({
	root: observerRoot,
	onIntersect: () => void loadMore(),
});

watch(
	[loadMoreSentinel, hasMoreAgentsToLoad, () => agentElements.value.length],
	([sentinel, canLoadMore]) => {
		if (sentinel && canLoadMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true },
);

// When the added node will receive input from a chat trigger — either one
// auto-prepended alongside it, or the existing one the node creator was
// opened from (every non-auto-added node gets connected to
// `lastInteractedWithNodeId`) — default the message to the chat input.
function chatInputMessagePreset(): { message?: string } {
	const willAutoAddChatTrigger = shouldPrependChatTrigger([{ type: MESSAGE_AN_AGENT_NODE_TYPE }]);
	const lastInteractedWithNode = uiStore.lastInteractedWithNodeId
		? workflowDocumentStore.value.getNodeById(uiStore.lastInteractedWithNodeId)
		: undefined;
	const connectsToChatTrigger = lastInteractedWithNode?.type === CHAT_TRIGGER_NODE_TYPE;

	return willAutoAddChatTrigger || connectsToChatTrigger
		? { message: '={{ $json.chatInput }}' }
		: {};
}

function onSelected(element: INodeCreateElement) {
	if (element.type !== 'agent') return;

	const messagePreset = chatInputMessagePreset();

	emit('nodeTypeSelected', [{ type: MESSAGE_AN_AGENT_NODE_TYPE }]);

	if (element.properties.variant === 'create') {
		setAddedNodeActionParameters({
			name: element.properties.name,
			key: MESSAGE_AN_AGENT_NODE_TYPE,
			value: { agentSource: 'inline', ...messagePreset },
		});
		nodeCreatorStore.onAgentPanelOptionSelected({ choice: 'create_new' });
		return;
	}

	setAddedNodeActionParameters({
		name: element.properties.name,
		key: MESSAGE_AN_AGENT_NODE_TYPE,
		value: {
			agentSource: 'referenced',
			agentId: {
				__rl: true,
				mode: 'list',
				value: element.properties.agentId ?? '',
				cachedResultName: element.properties.name,
			},
			...messagePreset,
		},
	});
	nodeCreatorStore.onAgentPanelOptionSelected({ choice: 'existing_agent' });
}

function onKeySelect(activeItemId: string) {
	const element = [...staticElements.value, ...agentElements.value].find(
		(item) => item.uuid === activeItemId,
	);
	if (element) onSelected(element);
}

registerKeyHook('AgentsModeSelect', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => type === 'agent',
	handler: onKeySelect,
});

registerKeyHook('AgentsModeLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => type === 'agent',
	handler: () => popViewStack(),
});

function resetSearch() {
	updateCurrentViewStack({ search: '' });
}

onMounted(() => {
	void setAgentsResources();
});
</script>

<template>
	<div :class="$style.container" data-test-id="node-creator-agents-panel">
		<ItemsRenderer :elements="staticElements" @selected="onSelected" />

		<N8nLoading
			v-if="showLoadingSkeleton"
			:class="$style.state"
			:loading="true"
			:rows="3"
			variant="p"
		/>

		<div
			v-else-if="loadError && agentElements.length === 0"
			:class="$style.state"
			data-test-id="agents-panel-load-error"
		>
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('nodeCreator.agentsPanel.loadError') }}
			</N8nText>
			<N8nLink size="small" @click="setAgentsResources">
				{{ i18n.baseText('generic.retry') }}
			</N8nLink>
		</div>

		<div v-else-if="showEmptyState" :class="$style.state" data-test-id="agents-panel-empty">
			<N8nText size="small" color="text-base">
				{{
					search
						? i18n.baseText('nodeCreator.agentsPanel.noMatchingAgents')
						: i18n.baseText('nodeCreator.agentsPanel.empty')
				}}
			</N8nText>
			<N8nLink v-if="search" size="small" @click="resetSearch">
				{{ i18n.baseText('generic.clear') }}
			</N8nLink>
		</div>

		<template v-else>
			<ItemsRenderer :elements="agentElements" @selected="onSelected" />
			<!-- A load-more (or search-refresh) failure keeps the loaded list on
			screen; only the sentinel area swaps to an inline retry. Retrying does a
			full reload because a failed search reset leaves the locator's claimed
			page number unusable for a plain load-more. -->
			<div v-if="loadError" :class="$style.state" data-test-id="agents-panel-load-more-error">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('nodeCreator.agentsPanel.loadError') }}
				</N8nText>
				<N8nLink size="small" @click="setAgentsResources">
					{{ i18n.baseText('generic.retry') }}
				</N8nLink>
			</div>
			<div
				v-else-if="hasMoreAgentsToLoad && !isLoadingResources"
				ref="loadMoreSentinel"
				:class="$style.sentinel"
				data-test-id="agents-panel-load-more"
			>
				<N8nLoading :loading="true" :rows="1" variant="p" />
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--xl);
}

.state {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
}

.sentinel {
	padding: 0 var(--spacing--sm);
}
</style>
