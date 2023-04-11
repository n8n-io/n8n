<script setup lang="ts">
import { getCurrentInstance, ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import { TriggerView } from './RootViews';
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { INodeCreateElement, LabelCreateElement } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { sortNodeCreateElements, transformNodeType } from './utils';
import NoResults from './NoResults.vue';
import ActionsRenderer from './ActionsRenderer.vue';
import { useActions } from './composables/useActions';
import { useRootStore } from '@/stores/n8nRootStore';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import NodesRenderer from './NodesRenderer.vue';

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const instance = getCurrentInstance();
const { mergedNodes, actions, getNodeTypesWithManualTrigger, setAddedNodeActionParameters } =
	useNodeCreatorStore();

const { pushViewStack, popViewStack, updateViewStack } = useViewStacks();

const { setFirstItemActive, attachKeydownEvent, detachKeydownEvent, registerKeyHook } =
	useKeyboardNavigation();
const view = TriggerView();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const activeViewStackMode = computed(() => useViewStacks().activeViewStackMode);
const viewStacks = computed(() => useViewStacks().viewStacks);

function onSearchInput(value: string) {
	if (activeViewStack.value.uuid) {
		updateViewStack(activeViewStack.value.uuid, { search: value });
		setFirstItemActive();
	}
}

function onTransitionEnd() {
	setFirstItemActive();
}

// Initial view stack
pushViewStack({
	title: view.title,
	subtitle: view.subtitle,
	items: view.items as INodeCreateElement[],
	hasHeaderBg: false,
	hasSearch: true,
	mode: 'trigger',
	// Root search should include all nodes
	searchItems: mergedNodes,
});

onMounted(() => {
	attachKeydownEvent();
	setFirstItemActive();
}),
	onUnmounted(() => {
		detachKeydownEvent();
	});
</script>

<template>
	<NodesListPanel
		:hasBackButton="viewStacks.length > 1"
		v-bind="activeViewStack"
		:key="activeViewStack.uuid"
		@back="popViewStack"
		@searchInput="onSearchInput"
		@transitionEnd="onTransitionEnd"
		v-if="viewStacks.length > 0"
	>
		<ActionsRenderer
			v-if="
				activeViewStackMode === 'action' && activeViewStack.items && activeViewStack.subcategory
			"
			:rootView="'trigger'"
			:actions="activeViewStack.items"
			:search="activeViewStack.search"
			:subcategory="activeViewStack.subcategory"
			v-on="$listeners"
		/>

		<!-- Nodes Mode -->
		<NodesRenderer v-else :rootView="'trigger'" v-on="$listeners" />
	</NodesListPanel>
</template>
