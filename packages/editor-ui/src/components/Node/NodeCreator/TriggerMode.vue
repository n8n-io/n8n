<script setup lang="ts">
import { getCurrentInstance, computed, onMounted, onUnmounted } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import { TriggerView } from './RootViews';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { INodeCreateElement } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import ActionsRenderer from './ActionsRenderer.vue';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import NodesRenderer from './NodesRenderer.vue';

const instance = getCurrentInstance();
const { mergedNodes } = useNodeCreatorStore();

const { pushViewStack, popViewStack, updateViewStack } = useViewStacks();

const { setActiveItemIndex, attachKeydownEvent, detachKeydownEvent, registerKeyHook } =
	useKeyboardNavigation();

const view = TriggerView();

const activeViewStack = computed(() => useViewStacks().activeViewStack);

const activeViewStackMode = computed(() => useViewStacks().activeViewStackMode);

const viewStacks = computed(() => useViewStacks().viewStacks);

const searchPlaceholder = computed(() => activeViewStackMode.value === 'action'
	? instance?.proxy?.$locale.baseText('nodeCreator.actionsCategory.searchActions',
		{ interpolate: { node: activeViewStack.value.title } })
	: instance?.proxy?.$locale.baseText('nodeCreator.searchBar.searchNodes'));

function onSearchInput(value: string) {
	if (activeViewStack.value.uuid) {
		updateViewStack(activeViewStack.value.uuid, { search: value });
		setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
	}
}

function onTransitionEnd() {
	setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
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
	setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
});

onUnmounted(() => {
	detachKeydownEvent();
});
</script>

<template>
	<NodesListPanel
		:hasBackButton="viewStacks.length > 1"
		v-bind="activeViewStack"
		:key="activeViewStack.uuid"
		:search-placeholder="searchPlaceholder"
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
