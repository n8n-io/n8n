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
			v-for="(item, index) in elements"
			:key="item.key"
			:class="item.type"
			:data-key="item.key"
		>
			<creator-item
				:allow-actions="allowActions"
				:item="item"
				:active="activeIndex === index && !disabled"
				:clickable="!disabled"
				:disabled="disabled"
				:simple-node-style="simpleNodeStyle"
				:lastNode="
					index === elements.length - 1 || elements[index + 1].type !== 'node'
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

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	simpleNodeStyle?: boolean;
	transitionsEnabled?: boolean;
	allowActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void,
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void,
	(event: 'dragend', element: INodeCreateElement, $e: Event): void,
}>();

function wrappedEmit(event: 'selected' | 'dragstart' | 'dragend', element: INodeCreateElement, $e?: Event) {
	if (props.disabled) return;

	emit((event as 'selected' || 'dragstart' || 'dragend'), element, $e);
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
