<script setup lang="ts">
import { INodeCreateElement, NodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';
import LabelItem from './LabelItem.vue';
import ActionItem from './ActionItem.vue';
import ViewItem from './ViewItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted, ref } from 'vue';
import { DynamicScroller, RecycleScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { v4 as uuid } from 'uuid';

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void;
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void;
	(event: 'dragend', element: INodeCreateElement, $e: Event): void;
}>();

const iteratorItems = ref<HTMLElement[]>([]);

function wrappedEmit(
	event: 'selected' | 'dragstart' | 'dragend',
	element: INodeCreateElement,
	$e?: Event,
) {
	if (props.disabled) return;

	emit((event as 'selected') || 'dragstart' || 'dragend', element, $e);
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

watch(
	() => props.activeIndex,
	async () => {
		if (props.activeIndex === undefined) return;
		iteratorItems.value[props.activeIndex]?.scrollIntoView({ block: 'nearest' });
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
		<DynamicScroller :items="elements" keyField="uuid" :min-item-size="40" class="scroller">
			<template #default="{ item, index, active }">
				<DynamicScrollerItem :item="item" :active="active" :data-index="index">
					<div
						data-test-id="item-iterator-item"
						:class="{
							clickable: !disabled,
							[$style[item.type]]: true,
							[$style.active]: activeIndex === index && !disabled,
							[$style.iteratorItem]: true,
						}"
						ref="iteratorItems"
						@click="wrappedEmit('selected', item)"
					>
						<label-item v-if="item.type === 'label'" :item="item" />
						<subcategory-item v-if="item.type === 'subcategory'" :item="item.properties" />

						<node-item
							v-if="item.type === 'node'"
							:nodeType="item.properties"
							:subcategory="item.subcategory"
						/>
						<!-- @dragstart="wrappedEmit('dragstart', item, $event)"
							@dragend="wrappedEmit('dragend', item, $event)"
							@nodeTypeSelected="$listeners.nodeTypeSelected"
							@actionsOpen="$listeners.actionsOpen" -->
						<action-item
							v-if="item.type === 'action'"
							:nodeType="item.properties"
							:action="item.properties"
						/>
						<!-- @dragstart="wrappedEmit('dragstart', item, $event)"
							@dragend="wrappedEmit('dragend', item, $event)" -->

						<view-item v-else-if="item.type === 'view'" :view="item.properties" />
					</div>
				</DynamicScrollerItem>
			</template>
		</DynamicScroller>
	</div>
	<div :class="$style.empty" v-else>
		<slot name="empty" />
	</div>
</template>

<style lang="scss" module>
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

	// &.active:not(.category)::before {
	// 	border-color: $color-primary !important;
	// }

	// &.category.singleCategory {
	// 	display: none;
	// }
}
.label {
	pointer-events: none;
}
.empty {
	:global([role='alert']) {
		margin: var(--spacing-s) var(--spacing-s) var(--spacing-3xs);
	}
}
.itemsRenderer {
	display: flex;
	flex-direction: column;
	overflow: auto;

	scrollbar-width: none; /* Firefox 64 */
	& > *::-webkit-scrollbar {
		display: none;
	}
	// > *:last-child {
	// 	margin-bottom: var(--spacing-2xl);
	// }
}
// .action {
// 	&:last-of-type {
// 		margin-bottom: var(--spacing-s);
// 	}
// }
// .node + .category {
// 	margin-top: var(--spacing-s);
// }
</style>
