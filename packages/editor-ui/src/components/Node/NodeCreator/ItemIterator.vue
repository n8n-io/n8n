<template>
	<div
		:class="$style.itemIterator"
		name="accordion"
		@before-enter="beforeEnter"
		@enter="enter"
		@before-leave="beforeLeave"
		@leave="leave"
	>
		<div
			v-for="(item, index) in renderedItems"
			:key="`${item.key}-${index}`"
			data-test-id="item-iterator-item"
			:class="{
				'clickable': !disabled,
				[$style[item.type]]: true,
				[$style.active]: activeIndex === index && !disabled,
				[$style.iteratorItem]: true
			}"
			ref="iteratorItems"
			@click="wrappedEmit('selected', item)"
		>
			<category-item
				v-if="item.type === 'category'"
				:item="item"
				:count="enableGlobalCategoriesCounter ? getCategoryCount(item) : undefined"
			/>

			<subcategory-item
				v-else-if="item.type === 'subcategory'"
				:item="item"
			/>

			<node-item
				v-else-if="item.type === 'node'"
				:nodeType="item.properties.nodeType"
				:allow-actions="withActionsGetter && withActionsGetter(item)"
				@dragstart="wrappedEmit('dragstart', item, $event)"
				@dragend="wrappedEmit('dragend', item, $event)"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
				@actionsOpen="$listeners.actionsOpen"
			/>

			<action-item
				v-else-if="item.type === 'action'"
				:nodeType="item.properties.nodeType"
				:action="item.properties.nodeType"
				@dragstart="wrappedEmit('dragstart', item, $event)"
				@dragend="wrappedEmit('dragend', item, $event)"
			/>
		</div>
		<aside
			v-for="item in elements.length"
			v-show="(renderedItems.length < item)"
			:key="item"
			:class="$style.loadingItem"
		>
			<n8n-loading :loading="true" :rows="1" variant="p" />
		</aside>
	</div>
</template>

<script setup lang="ts">
import { INodeCreateElement, CategoryCreateElement, NodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';
import ActionItem from './ActionItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted, ref } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { NODE_TYPE_COUNT_MAPPER } from '@/constants';

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
	withActionsGetter?: (element: NodeCreateElement) => boolean;
	enableGlobalCategoriesCounter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void,
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void,
	(event: 'dragend', element: INodeCreateElement, $e: Event): void,
}>();

const state = reactive({
	renderedItems: [] as INodeCreateElement[],
	renderAnimationRequest: 0,
});
const iteratorItems = ref<HTMLElement[]>([]);

function wrappedEmit(event: 'selected' | 'dragstart' | 'dragend', element: INodeCreateElement, $e?: Event) {
	if (props.disabled) return;

	emit((event as 'selected' || 'dragstart' || 'dragend'), element, $e);
}
function getCategoryCount(item: CategoryCreateElement) {
	const { categoriesWithNodes } = useNodeTypesStore();

	const currentCategory = categoriesWithNodes[item.category];
	const subcategories = Object.keys(currentCategory);

	// We need to sum subcategories count for the curent nodeType view
	// to get the total count of category
	const count = subcategories.reduce((accu: number, subcategory: string) => {
		const countKeys = NODE_TYPE_COUNT_MAPPER[useNodeCreatorStore().selectedType];

		for (const countKey of countKeys) {
			accu += currentCategory[subcategory][(countKey as "triggerCount" | "regularCount")];
		}

		return accu;
	}, 0);
	return count;
}

// Lazy render large items lists to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if(props.elements.length <= 20 || props.lazyRender === false) {
		state.renderedItems = props.elements;
		return;
	};

	if (state.renderedItems.length < props.elements.length) {
		state.renderedItems.push(...props.elements.slice(state.renderedItems.length, state.renderedItems.length + 10));
		state.renderAnimationRequest = window.requestAnimationFrame(renderItems);
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
	window.cancelAnimationFrame(state.renderAnimationRequest);
	state.renderedItems = [];
});

// Make sure the active item is always visible
// scroll if needed
watch(() => props.activeIndex, async () => {
	if(props.activeIndex === undefined) return;
	iteratorItems.value[props.activeIndex]?.scrollIntoView({ block: 'nearest' });
});

// Trigger elements re-render when they change
watch(() => props.elements, async () => {
	window.cancelAnimationFrame(state.renderAnimationRequest);
	state.renderedItems = [];
	renderItems();
});

const { renderedItems } = toRefs(state);
</script>

<style lang="scss" module>
.loadingItem {
	height: 48px;
	margin: 0 var(--search-margin, var(--spacing-s));
}
.iteratorItem {
	// Make sure border is fully visible
	margin-left: 1px;
	position: relative;
	&::before {
		content: "";
		position: absolute;
		left: -1px;
		top: 0;
		bottom: 0;
		border-left: 2px solid transparent;
	}
	&:hover::before {
		border-color: $node-creator-item-hover-border-color;
	}

	&.active::before  {
		border-color: $color-primary !important;
	}

	&.category.singleCategory {
		display: none;
	}

}
.itemIterator {
	> *:last-child {
		margin-bottom: var(--spacing-2xl);
	}
}
.action {
	&:last-of-type {
		margin-bottom: var(--spacing-s);
	}
}
.node + .category {
	margin-top: var(--spacing-s);
}
</style>
