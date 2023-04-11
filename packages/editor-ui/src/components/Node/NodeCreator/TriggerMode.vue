<script setup lang="ts">
import { getCurrentInstance, computed, onMounted, onUnmounted, watch } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import { TriggerView, RegularView } from './RootViews';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { INodeCreateElement } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import ActionsRenderer from './ActionsRenderer.vue';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import NodesRenderer from './NodesRenderer.vue';
import { ACTIONS_NODE_CREATOR_MODE, TRIGGER_NODE_CREATOR_MODE } from '@/constants';

const instance = getCurrentInstance();
const { mergedNodes } = useNodeCreatorStore();

const { pushViewStack, popViewStack, updateCurrentViewStack } = useViewStacks();

const { setActiveItemIndex, attachKeydownEvent, detachKeydownEvent, registerKeyHook } =
	useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);

const activeViewStackMode = computed(() => useViewStacks().activeViewStackMode);

const viewStacks = computed(() => useViewStacks().viewStacks);

const isActionsMode = computed(() => activeViewStackMode.value === 'actions');
const searchPlaceholder = computed(() =>
	isActionsMode.value
		? instance?.proxy?.$locale.baseText('nodeCreator.actionsCategory.searchActions', {
				interpolate: { node: activeViewStack.value.title },
		  })
		: instance?.proxy?.$locale.baseText('nodeCreator.searchBar.searchNodes'),
);

const nodeCreatorView = computed(() => useNodeCreatorStore().selectedView);
function onSearchInput(value: string) {
	if (activeViewStack.value.uuid) {
		updateCurrentViewStack({ search: value });
		setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
	}
}

function onTransitionEnd() {
	setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
}

onMounted(() => {
	attachKeydownEvent();
	setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
});

onUnmounted(() => {
	detachKeydownEvent();
});

watch(
	() => nodeCreatorView.value,
	(selectedView) => {
		const view =
			selectedView === TRIGGER_NODE_CREATOR_MODE
				? TriggerView(instance?.proxy?.$locale)
				: RegularView(instance?.proxy?.$locale);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			items: view.items as INodeCreateElement[],
			hasHeaderBg: false,
			hasSearch: true,
			mode: 'nodes',
			rootView: selectedView,
			// Root search should include all nodes
			searchItems: mergedNodes,
		});
	},
	{ immediate: true },
);
</script>

<template>
	<NodesListPanel
		v-if="viewStacks.length > 0"
		:hasBackButton="viewStacks.length > 1"
		v-bind="activeViewStack"
		:key="activeViewStack.uuid"
		:search-placeholder="searchPlaceholder"
		@back="popViewStack"
		@searchInput="onSearchInput"
		@transitionEnd="onTransitionEnd"
	>
		<ActionsRenderer v-if="isActionsMode && activeViewStack.subcategory" v-on="$listeners" />

		<!-- Nodes Mode -->
		<NodesRenderer v-else :rootView="nodeCreatorView" v-on="$listeners" />
	</NodesListPanel>
</template>
