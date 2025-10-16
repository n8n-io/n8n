<script setup lang="ts">
import type { INodeCreateElement } from '@/Interface';
import { onMounted, watch, onUnmounted, ref, computed } from 'vue';

import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import NodeItem from '../ItemTypes/NodeItem.vue';
import SubcategoryItem from '../ItemTypes/SubcategoryItem.vue';
import LabelItem from '../ItemTypes/LabelItem.vue';
import ActionItem from '../ItemTypes/ActionItem.vue';
import ViewItem from '../ItemTypes/ViewItem.vue';
import LinkItem from '../ItemTypes/LinkItem.vue';
import CommunityNodeItem from '../ItemTypes/CommunityNodeItem.vue';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';

import { useViewStacks } from '../composables/useViewStacks';
import OpenTemplateItem from '../ItemTypes/OpenTemplateItem.vue';

import { N8nLoading } from '@n8n/design-system';
export interface Props {
	elements?: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
}

const LAZY_LOAD_THRESHOLD = 20;
const LAZY_LOAD_ITEMS_PER_TICK = 5;
const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
	lazyRender: true,
});

const emit = defineEmits<{
	selected: [element: INodeCreateElement, $e?: Event];
	dragstart: [element: INodeCreateElement, $e: Event];
	dragend: [element: INodeCreateElement, $e: Event];
}>();

const renderedItems = ref<INodeCreateElement[]>([]);
const renderAnimationRequest = ref<number>(0);
const { activeViewStack } = useViewStacks();

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);

const communityNode = computed(() => activeViewStack.mode === 'community-node');

const isPreview = computed(() => {
	return communityNode.value && !activeViewStack.communityNodeDetails?.installed;
});

const highlightActiveItem = computed(() => {
	if (activeViewStack.communityNodeDetails && !activeViewStack.communityNodeDetails.installed) {
		return false;
	}

	return true;
});

// Lazy render large items lists to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if (props.elements.length <= LAZY_LOAD_THRESHOLD || !props.lazyRender) {
		renderedItems.value = props.elements;
		return;
	}

	if (renderedItems.value.length < props.elements.length) {
		renderedItems.value.push(
			...props.elements.slice(
				renderedItems.value.length,
				renderedItems.value.length + LAZY_LOAD_ITEMS_PER_TICK,
			),
		);
		renderAnimationRequest.value = window.requestAnimationFrame(renderItems);
	}
}

function wrappedEmit(
	event: 'selected' | 'dragstart' | 'dragend',
	element: INodeCreateElement,
	$e?: Event,
) {
	if (props.disabled) return;

	switch (event) {
		case 'dragstart':
			if ($e) {
				emit('dragstart', element, $e);
				break;
			}
		case 'dragend':
			if ($e) {
				emit('dragend', element, $e);
				break;
			}
		case 'selected':
			emit('selected', element, $e);
			break;
		default:
			emit(event, element, $e);
	}
}

function beforeEnter(el: HTMLElement) {
	el.style.height = '0';
}

function enter(el: HTMLElement) {
	el.style.height = `${el.scrollHeight}px`;
}

function beforeLeave(el: HTMLElement) {
	el.style.height = `${el.scrollHeight}px`;
}

function leave(el: HTMLElement) {
	el.style.height = '0';
}

onMounted(() => {
	renderItems();
});

onUnmounted(() => {
	window.cancelAnimationFrame(renderAnimationRequest.value);
	renderedItems.value = [];
});

// Make sure the active item is always visible
// scroll if needed
watch(
	() => props.elements,
	() => {
		window.cancelAnimationFrame(renderAnimationRequest.value);
		renderedItems.value = [];
		renderItems();
	},
);
</script>

<template>
	<div
		v-if="elements.length > 0"
		:class="$style.itemsRenderer"
		name="accordion"
		@before-enter="beforeEnter"
		@enter="enter"
		@before-leave="beforeLeave"
		@leave="leave"
	>
		<slot />
		<div v-for="item in elements" :key="item.uuid">
			<div v-if="renderedItems.includes(item)">
				<CategorizedItemsRenderer
					v-if="item.type === 'section'"
					:elements="item.children"
					expanded
					:category="item.title"
					@selected="(child: INodeCreateElement) => wrappedEmit('selected', child)"
				>
				</CategorizedItemsRenderer>

				<div
					v-else
					ref="iteratorItems"
					:class="{
						clickable: !disabled,
						[$style.active]: activeItemId === item.uuid && highlightActiveItem,
						[$style.iteratorItem]: !communityNode,
						[$style[item.type]]: true,
						[$style.preview]: isPreview,
						// Borderless is only applied to views
						[$style.borderless]: item.type === 'view' && item.properties.borderless === true,
					}"
					data-test-id="item-iterator-item"
					:data-keyboard-nav-type="item.type !== 'label' ? item.type : undefined"
					:data-keyboard-nav-id="item.uuid"
					@click="wrappedEmit('selected', item)"
				>
					<LabelItem v-if="item.type === 'label'" :item="item" />

					<SubcategoryItem v-if="item.type === 'subcategory'" :item="item.properties" />

					<CommunityNodeItem v-if="communityNode" :is-preview="isPreview" />

					<NodeItem
						v-if="item.type === 'node' && !communityNode"
						:node-type="item.properties"
						:active="true"
						:subcategory="item.subcategory"
					/>

					<ActionItem
						v-if="item.type === 'action'"
						:node-type="item.properties"
						:action="item.properties"
						:active="true"
					/>

					<ViewItem
						v-else-if="item.type === 'view'"
						:view="item.properties"
						:class="$style.viewItem"
					/>

					<LinkItem
						v-else-if="item.type === 'link'"
						:link="item.properties"
						:class="$style.linkItem"
					/>

					<OpenTemplateItem
						v-else-if="item.type === 'openTemplate'"
						:open-template="item.properties"
						:class="$style.linkItem"
					/>
				</div>
			</div>
			<N8nLoading v-else :loading="true" :rows="1" variant="p" :class="$style.itemSkeleton" />
		</div>
	</div>
	<div v-else :class="$style.empty">
		<slot name="empty" />
	</div>
</template>

<style lang="scss" module>
.itemSkeleton {
	height: 50px;
}
.iteratorItem {
	// Make sure border is fully visible
	margin-left: 1px;
	position: relative;
	&::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 0;
		bottom: 0;
		border-left: 2px solid transparent;
	}
	&:not(.label):not(.category):hover::before {
		border-color: $node-creator-item-hover-border-color;
	}

	&.active:not(.category)::before {
		border-color: $color-primary;
	}
}
.empty {
	:global([role='alert']) {
		margin: var(--spacing--xs) var(--spacing--sm);
	}
}
.itemsRenderer {
	display: flex;
	flex-direction: column;

	scrollbar-width: none; /* Firefox 64 */
	& > *::-webkit-scrollbar {
		display: none;
	}
}

.view {
	position: relative;

	&:last-child {
		margin-top: var(--spacing--sm);
		padding-top: var(--spacing--xs);

		&:after {
			content: '';
			position: absolute;
			left: var(--spacing--sm);
			right: var(--spacing--sm);
			top: 0;
			margin: auto;
			bottom: 0;
			border-top: 1px solid var(--color--foreground);
		}
	}
}
.link {
	position: relative;

	&:last-child {
		margin-bottom: var(--spacing--sm);
		padding-bottom: var(--spacing--xs);

		&:after {
			content: '';
			position: absolute;
			left: var(--spacing--sm);
			right: var(--spacing--sm);
			top: 0;
			margin: auto;
			bottom: 0;
			border-bottom: 1px solid var(--color--foreground);
		}
	}
}

.borderless {
	&:last-child {
		margin-top: 0;
		padding-top: 0;
		margin-bottom: 0;
		padding-bottom: 0;

		&:after {
			content: none;
		}
	}
}

.preview {
	pointer-events: none;
	cursor: default;
}
</style>
