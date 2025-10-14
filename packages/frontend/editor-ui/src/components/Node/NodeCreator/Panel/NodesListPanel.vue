<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import type { INodeCreateElement } from '@/Interface';
import {
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
	AI_UNCATEGORIZED_CATEGORY,
	AI_EVALUATION,
} from '@/constants';

import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView, AIView, AINodesView } from '../viewsData';
import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import SearchBar from './SearchBar.vue';
import ActionsRenderer from '../Modes/ActionsMode.vue';
import NodesRenderer from '../Modes/NodesMode.vue';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/composables/useDebounce';
import NodeIcon from '@/components/NodeIcon.vue';

import CommunityNodeDetails from './CommunityNodeDetails.vue';
import CommunityNodeInfo from './CommunityNodeInfo.vue';
import CommunityNodeDocsLink from './CommunityNodeDocsLink.vue';
import CommunityNodeFooter from './CommunityNodeFooter.vue';
import { useUsersStore } from '@/stores/users.store';

import { N8nIcon, N8nNotice } from '@n8n/design-system';
const i18n = useI18n();
const { callDebounced } = useDebounce();

const { mergedNodes } = useNodeCreatorStore();
const { pushViewStack, popViewStack, updateCurrentViewStack } = useViewStacks();
const { setActiveItemIndex, attachKeydownEvent, detachKeydownEvent } = useKeyboardNavigation();
const nodeCreatorStore = useNodeCreatorStore();

const { isInstanceOwner } = useUsersStore();

const activeViewStack = computed(() => useViewStacks().activeViewStack);

const communityNodeDetails = computed(() => activeViewStack.value.communityNodeDetails);

const viewStacks = computed(() => useViewStacks().viewStacks);

const isActionsMode = computed(() => useViewStacks().activeViewStackMode === 'actions');

const searchPlaceholder = computed(() => {
	let node = activeViewStack.value?.title as string;

	if (communityNodeDetails.value) {
		node = communityNodeDetails.value.title;
	}

	if (isActionsMode.value) {
		return i18n.baseText('nodeCreator.actionsCategory.searchActions', {
			interpolate: { node },
		});
	}

	return i18n.baseText('nodeCreator.searchBar.searchNodes');
});

const showSearchBar = computed(() => {
	if (activeViewStack.value.communityNodeDetails) return false;
	return activeViewStack.value.hasSearch;
});

const nodeCreatorView = computed(() => useNodeCreatorStore().selectedView);

const isCommunityNodeActionsMode = computed(() => {
	return communityNodeDetails.value && isActionsMode.value && activeViewStack.value.subcategory;
});

function getDefaultActiveIndex(search: string = ''): number {
	if (activeViewStack.value.mode === 'actions') {
		// For actions, set the active focus to the first action, not category
		return 1;
	} else if (activeViewStack.value.sections) {
		// For sections, set the active focus to the first node, not section (unless searching)
		return search ? 0 : 1;
	}

	return 0;
}

function onSearch(value: string) {
	if (activeViewStack.value.uuid) {
		updateCurrentViewStack({ search: value });
		void setActiveItemIndex(getDefaultActiveIndex(value));
		if (value.length) {
			callDebounced(
				nodeCreatorStore.onNodeFilterChanged,
				{ trailing: true, debounceTime: 2000 },
				{
					newValue: value,
					filteredNodes: activeViewStack.value.items ?? [],
					filterMode: activeViewStack.value.rootView ?? 'Regular',
					subcategory: activeViewStack.value.subcategory,
					title: activeViewStack.value.title,
				},
			);
		}
	}
}

function onTransitionEnd() {
	void setActiveItemIndex(getDefaultActiveIndex());
}

onMounted(() => {
	attachKeydownEvent();
	void setActiveItemIndex(getDefaultActiveIndex());
});

onUnmounted(() => {
	detachKeydownEvent();
});

watch(
	() => nodeCreatorView.value,
	(selectedView) => {
		const views = {
			[TRIGGER_NODE_CREATOR_VIEW]: TriggerView,
			[REGULAR_NODE_CREATOR_VIEW]: RegularView,
			[AI_NODE_CREATOR_VIEW]: AIView,
			[AI_OTHERS_NODE_CREATOR_VIEW]: AINodesView,
			[AI_UNCATEGORIZED_CATEGORY]: AINodesView,
			[AI_EVALUATION]: AINodesView,
		};

		const itemKey = selectedView;
		const matchedView = views[itemKey];

		if (!matchedView) {
			console.warn(`No view found for ${itemKey}`);
			return;
		}
		const view = matchedView(mergedNodes);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			items: view.items as INodeCreateElement[],
			info: view.info,
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
	<Transition
		v-if="viewStacks.length > 0"
		:name="`panel-slide-${activeViewStack.transitionDirection}`"
		@after-leave="onTransitionEnd"
	>
		<aside
			:key="`${activeViewStack.uuid}`"
			:class="[$style.nodesListPanel, activeViewStack.panelClass]"
			@keydown.capture.stop
		>
			<header
				:class="{
					[$style.header]: true,
					[$style.hasBg]: !activeViewStack.subtitle,
					'nodes-list-panel-header': true,
				}"
				data-test-id="nodes-list-header"
			>
				<div :class="$style.top">
					<button
						v-if="viewStacks.length > 1 && !activeViewStack.preventBack"
						:class="$style.backButton"
						@click="onBackButton"
					>
						<N8nIcon :class="$style.backButtonIcon" icon="arrow-left" :size="22" />
					</button>
					<NodeIcon
						v-if="activeViewStack.nodeIcon"
						:class="$style.nodeIcon"
						:icon-source="activeViewStack.nodeIcon"
						:circle="false"
						:show-tooltip="false"
						:size="20"
					/>
					<p v-if="activeViewStack.title" :class="$style.title" v-text="activeViewStack.title" />

					<CommunityNodeDocsLink
						v-if="communityNodeDetails"
						:package-name="communityNodeDetails.packageName"
					/>
				</div>
				<p
					v-if="activeViewStack.subtitle"
					:class="{ [$style.subtitle]: true, [$style.offsetSubtitle]: viewStacks.length > 1 }"
					v-text="activeViewStack.subtitle"
				/>
			</header>

			<SearchBar
				v-if="showSearchBar"
				:class="$style.searchBar"
				:placeholder="
					searchPlaceholder ? searchPlaceholder : i18n.baseText('nodeCreator.searchBar.searchNodes')
				"
				:model-value="activeViewStack.search"
				@update:model-value="onSearch"
			/>

			<CommunityNodeDetails v-if="communityNodeDetails" />
			<CommunityNodeInfo v-if="communityNodeDetails && !isActionsMode" />

			<div :class="$style.renderedItems">
				<N8nNotice
					v-if="activeViewStack.info && !activeViewStack.search"
					:class="$style.info"
					:content="activeViewStack.info"
					theme="warning"
				/>
				<!-- Actions mode -->
				<ActionsRenderer v-if="isActionsMode && activeViewStack.subcategory" v-bind="$attrs" />

				<!-- Nodes Mode -->
				<NodesRenderer v-else :root-view="nodeCreatorView" v-bind="$attrs" />
			</div>

			<CommunityNodeFooter
				v-if="communityNodeDetails && !isCommunityNodeActionsMode"
				:package-name="communityNodeDetails.packageName"
				:show-manage="communityNodeDetails.installed && isInstanceOwner"
			/>
		</aside>
	</Transition>
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

:global(.panel-slide-out-enter-from),
:global(.panel-slide-in-leave-to) {
	transform: translateX(0);
	z-index: -1;
}

:global(.panel-slide-out-leave-to),
:global(.panel-slide-in-enter-from) {
	transform: translateX(100%);
	// Make sure the leaving panel stays on top
	// for the slide-out panel effect
	z-index: 1;
}
.info {
	margin: var(--spacing--2xs) var(--spacing--sm);
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: var(--spacing--2xs) var(--spacing--xs) 0 0;
}

.backButtonIcon {
	color: $node-creator-arrow-color;
	padding: 0;
}
.nodeIcon {
	--node-icon-size: 20px;
	--node-icon-color: var(--color--text);
	margin-right: var(--spacing--sm);
}
.renderedItems {
	overflow: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	scrollbar-width: none; /* Firefox 64 */
	padding-bottom: var(--spacing--xl);
	&::-webkit-scrollbar {
		display: none;
	}
}
.searchBar {
	flex-shrink: 0;
}
.nodesListPanel {
	background: var(--color--background--light-3);
	height: 100%;
	background-color: $node-creator-background-color;
	--color-background-node-icon-badge: var(--color--background--light-3);
	width: var(--node-creator-width);
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
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin: 0 var(--spacing--xs) 0;
	padding: var(--spacing--4xs) 0;
	line-height: var(--line-height--md);
	border-top: 1px solid var(--color--foreground);
	z-index: 1;
	margin-top: -1px;
}
.top {
	display: flex;
	align-items: center;
}
.header {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);

	padding: var(--spacing--sm) var(--spacing--sm);

	&.hasBg {
		border-bottom: $node-creator-border-color solid 1px;
		background-color: $node-creator-subcategory-panel-header-bacground-color;
	}
}
.title {
	line-height: 24px;
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--lg);
	margin: 0;

	.hasBg & {
		font-size: var(--font-size--sm-m);
		line-height: 22px;
	}
}
.subtitle {
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--sm);
	line-height: 19px;

	color: var(--color--text);
	font-weight: var(--font-weight--regular);
}
.offsetSubtitle {
	margin-left: calc(var(--spacing--xl) + var(--spacing--4xs));
}
</style>

<style lang="scss">
@each $node-type in $supplemental-node-types {
	.nodes-list-panel-#{$node-type} .nodes-list-panel-header {
		.n8n-node-icon svg {
			color: var(--node-type-#{$node-type}-color);
		}
	}
}
</style>
