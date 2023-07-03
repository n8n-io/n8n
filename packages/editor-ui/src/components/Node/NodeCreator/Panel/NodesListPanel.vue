<script setup lang="ts">
import { getCurrentInstance, computed, onMounted, onUnmounted, watch } from 'vue';
import type { INodeCreateElement } from '@/Interface';
import { TRIGGER_NODE_CREATOR_VIEW } from '@/constants';

import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView } from '../viewsData';
import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import SearchBar from './SearchBar.vue';
import ActionsRenderer from '../Modes/ActionsMode.vue';
import NodesRenderer from '../Modes/NodesMode.vue';

const instance = getCurrentInstance();

const { mergedNodes } = useNodeCreatorStore();
const { pushViewStack, popViewStack, updateCurrentViewStack } = useViewStacks();
const { setActiveItemIndex, attachKeydownEvent, detachKeydownEvent } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);

const viewStacks = computed(() => useViewStacks().viewStacks);

const isActionsMode = computed(() => useViewStacks().activeViewStackMode === 'actions');
const searchPlaceholder = computed(() =>
	isActionsMode.value
		? instance?.proxy?.$locale.baseText('nodeCreator.actionsCategory.searchActions', {
				interpolate: { node: activeViewStack.value.title as string },
		  })
		: instance?.proxy?.$locale.baseText('nodeCreator.searchBar.searchNodes'),
);

const nodeCreatorView = computed(() => useNodeCreatorStore().selectedView);

function onSearch(value: string) {
	if (activeViewStack.value.uuid) {
		updateCurrentViewStack({ search: value });
		void setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
	}
}

function onTransitionEnd() {
	// For actions, set the active focus to the first action, not category
	const newStackIndex = activeViewStack.value.mode === 'actions' ? 1 : 0;
	void setActiveItemIndex(activeViewStack.value.activeIndex || 0 || newStackIndex);
}

onMounted(() => {
	attachKeydownEvent();
	void setActiveItemIndex(activeViewStack.value.activeIndex ?? 0);
});

onUnmounted(() => {
	detachKeydownEvent();
});

watch(
	() => nodeCreatorView.value,
	(selectedView) => {
		const view =
			selectedView === TRIGGER_NODE_CREATOR_VIEW
				? TriggerView(instance?.proxy?.$locale)
				: RegularView(instance?.proxy?.$locale);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			items: view.items as INodeCreateElement[],
			hasSearch: true,
			mode: 'nodes',
			rootView: selectedView,
			// Root search should include all nodes
			searchItems: mergedNodes,
		});
	},
	{ immediate: true },
);

function onBackButton() {
	popViewStack();
}
</script>

<template>
	<transition
		v-if="viewStacks.length > 0"
		:name="`panel-slide-${activeViewStack.transitionDirection}`"
		@afterLeave="onTransitionEnd"
	>
		<aside :class="$style.nodesListPanel" @keydown.capture.stop :key="`${activeViewStack.uuid}`">
			<header
				:class="{ [$style.header]: true, [$style.hasBg]: !activeViewStack.subtitle }"
				data-test-id="nodes-list-header"
			>
				<div :class="$style.top">
					<button :class="$style.backButton" @click="onBackButton" v-if="viewStacks.length > 1">
						<font-awesome-icon :class="$style.backButtonIcon" icon="arrow-left" size="2x" />
					</button>
					<n8n-node-icon
						v-if="activeViewStack.nodeIcon"
						:class="$style.nodeIcon"
						:type="activeViewStack.nodeIcon.iconType || 'unknown'"
						:src="activeViewStack.nodeIcon.icon"
						:name="activeViewStack.nodeIcon.icon"
						:color="activeViewStack.nodeIcon.color"
						:circle="false"
						:showTooltip="false"
						:size="16"
					/>
					<p :class="$style.title" v-text="activeViewStack.title" v-if="activeViewStack.title" />
				</div>
				<p
					v-if="activeViewStack.subtitle"
					:class="{ [$style.subtitle]: true, [$style.offsetSubtitle]: viewStacks.length > 1 }"
					v-text="activeViewStack.subtitle"
				/>
			</header>
			<search-bar
				v-if="activeViewStack.hasSearch"
				:class="$style.searchBar"
				:placeholder="
					searchPlaceholder
						? searchPlaceholder
						: $locale.baseText('nodeCreator.searchBar.searchNodes')
				"
				@input="onSearch"
				:value="activeViewStack.search"
			/>
			<div :class="$style.renderedItems">
				<!-- Actions mode -->
				<ActionsRenderer v-if="isActionsMode && activeViewStack.subcategory" v-on="$listeners" />

				<!-- Nodes Mode -->
				<NodesRenderer v-else :rootView="nodeCreatorView" v-on="$listeners" />
			</div>
		</aside>
	</transition>
</template>

<style lang="scss" module>
:global(.panel-slide-in-leave-active),
:global(.panel-slide-in-enter-active),
:global(.panel-slide-out-leave-active),
:global(.panel-slide-out-enter-active) {
	transition: transform 200ms ease;
	position: absolute;
	left: 0;
	right: 0;
}

:global(.panel-slide-out-enter),
:global(.panel-slide-in-leave-to) {
	transform: translateX(0);
	z-index: -1;
}

:global(.panel-slide-out-leave-to),
:global(.panel-slide-in-enter) {
	transform: translateX(100%);
	// Make sure the leaving panel stays on top
	// for the slide-out panel effect
	z-index: 1;
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0 var(--spacing-xs) 0 0;
}

.backButtonIcon {
	color: $node-creator-arrow-color;
	height: 16px;
	padding: 0;
}
.nodeIcon {
	--node-icon-size: 16px;
	margin-right: var(--spacing-s);
}
.renderedItems {
	overflow: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	scrollbar-width: none; /* Firefox 64 */
	padding-bottom: var(--spacing-xl);
	&::-webkit-scrollbar {
		display: none;
	}
}
.searchBar {
	flex-shrink: 0;
}
.nodesListPanel {
	background: var(--color-background-xlight);
	height: 100%;
	background-color: $node-creator-background-color;
	width: 385px;
	display: flex;
	flex-direction: column;

	&:before {
		box-sizing: border-box;
		content: '';
		border-left: 1px solid $node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}
.footer {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin: 0 var(--spacing-xs) 0;
	padding: var(--spacing-4xs) 0;
	line-height: var(--font-line-height-regular);
	border-top: 1px solid var(--color-foreground-base);
	z-index: 1;
	margin-top: -1px;
}
.top {
	display: flex;
	align-items: center;
}
.header {
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-compact);

	padding: var(--spacing-s) var(--spacing-s);

	&.hasBg {
		border-bottom: $node-creator-border-color solid 1px;
		background-color: $node-creator-subcategory-panel-header-bacground-color;
	}
}
.title {
	line-height: 24px;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-l);

	.hasBg & {
		font-size: var(--font-size-s-m);
		line-height: 22px;
	}
}
.subtitle {
	margin-top: var(--spacing-4xs);
	font-size: var(--font-size-s);
	line-height: 19px;
	color: var(--color-text-base);
	font-weight: var(--font-weight-regular);
}
.offsetSubtitle {
	margin-left: calc(var(--spacing-xl) + var(--spacing-4xs));
}
</style>
