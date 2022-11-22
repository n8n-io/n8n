<template>
	<div
		:is="transitionsEnabled ? 'transition-group' : 'div'"
		class="item-iterator"
		name="accordion"
		@before-enter="beforeEnter"
		@enter="enter"
		@before-leave="beforeLeave"
		@leave="leave"
	>
		<div
			v-for="(item, index) in renderedItems"
			:key="item.key"
			:class="item.type"
			:data-key="item.key"
		>
			<creator-item
				:item="item"
				:active="activeIndex === index && !disabled"
				:clickable="!disabled"
				:disabled="disabled"
				:allow-actions="withActionsGetter && withActionsGetter(item)"
				:simple-node-style="withActionsGetter && withActionsGetter(item)"
				:lastNode="
					index === renderedItems.length - 1 || renderedItems[index + 1].type !== 'node'
				"
				@click="wrappedEmit('selected', item)"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
				@dragstart="wrappedEmit('dragstart', item, $event)"
				@dragend="wrappedEmit('dragend', item, $event)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { INodeCreateElement } from '@/Interface';
import CreatorItem from './CreatorItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted } from 'vue';

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	transitionsEnabled?: boolean;
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

watch(() => props.elements, () => {
	window.cancelAnimationFrame(state.renderAnimationRequest);
	state.renderedItems = [];
	renderItems();
});
function wrappedEmit(event: 'selected' | 'dragstart' | 'dragend', element: INodeCreateElement, $e?: Event) {
	if (props.disabled) return;

	emit((event as 'selected' || 'dragstart' || 'dragend'), element, $e);
}
// Lazy render items to prevent the browser from freezing
// when loading many items.
function renderItems() {
	const elementsCopy = [...props.elements];
	if (state.renderedItems.length < elementsCopy.length) {
		state.renderedItems.push(...elementsCopy.splice(state.renderedItems.length, 3));
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

const { renderedItems } = toRefs(state);
</script>


<style lang="scss" scoped>
.item-iterator > *:last-child {
	margin-bottom: var(--spacing-2xl);
}
.accordion-enter {
	opacity: 0;
}

.accordion-leave-active {
	opacity: 1;
}

.accordion-leave-active {
	transition: all 0.25s ease, opacity 0.1s ease;
	margin-top: 0;
}

.accordion-enter-active {
	transition: all 0.25s ease, opacity 0.25s ease;
	margin-top: 0;
}

.accordion-leave-to {
	opacity: 0;
}

.accordion-enter-to {
	opacity: 1;
}

.node + .category {
	margin-top: 15px;
}
</style>
