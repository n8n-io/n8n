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
			:key="item.key"
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
				@actionsClose="$listeners.actionsClose"
				:ref="(activeIndex === index && !disabled) ? 'activeNode' : undefined"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { INodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted, ref } from 'vue';

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	withActionsGetter?: Function;
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
const activeNode = ref<InstanceType<typeof Array<typeof NodeItem>>>([]);
const iteratorItems = ref<HTMLElement[]>([]);

watch(() => props.activeIndex, async () => {
	if(props.activeIndex === undefined) return;
	iteratorItems.value[props.activeIndex].scrollIntoView({ block: 'nearest' });
});

watch(() => props.elements, async () => {
	state.renderedItems = [];
	window.cancelAnimationFrame(state.renderAnimationRequest);
	renderItems();
});

function nodeSelected() {
	// Always
	activeNode.value[0].onClick();
}

function wrappedEmit(event: 'selected' | 'dragstart' | 'dragend', element: INodeCreateElement, $e?: Event) {
	if (props.disabled) return;

	emit((event as 'selected' || 'dragstart' || 'dragend'), element, $e);
}

// Lazy render items to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if (state.renderedItems.length < props.elements.length) {
		state.renderedItems.push(...props.elements.slice(state.renderedItems.length, state.renderedItems.length + 1));
		state.renderAnimationRequest = window.requestAnimationFrame(renderItems);
	}
}

onMounted(renderItems);
onUnmounted(() => {
	window.cancelAnimationFrame(state.renderAnimationRequest);
	state.renderedItems = [];
});

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

defineExpose({ nodeSelected });
const { renderedItems } = toRefs(state);
</script>

<style lang="scss" module>
.iteratorItem {
	border-left: 2px solid transparent;
	// Make sure border is fully visible
	margin-left: 1px;
	&:hover {
		border-color: $node-creator-item-hover-border-color;
	}

	&.active  {
		border-color: $color-primary !important;
	}

}
.itemIterator {
	> *:last-child {
		margin-bottom: var(--spacing-2xl);
	}
}

.node + .category {
	margin-top: var(--spacing-s);
}
</style>
