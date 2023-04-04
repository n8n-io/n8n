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
export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
	withActionsGetter?: (element: NodeCreateElement) => boolean;
	withDescriptionGetter?: (element: NodeCreateElement) => boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void;
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void;
	(event: 'dragend', element: INodeCreateElement, $e: Event): void;
}>();

const state = reactive({
	renderedItems: [] as INodeCreateElement[],
	renderAnimationRequest: 0,
});
const iteratorItems = ref<HTMLElement[]>([]);

function wrappedEmit(
	event: 'selected' | 'dragstart' | 'dragend',
	element: INodeCreateElement,
	$e?: Event,
) {
	if (props.disabled) return;

	emit((event as 'selected') || 'dragstart' || 'dragend', element, $e);
}

// Lazy render large items lists to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if (props.elements.length <= 20 || props.lazyRender === false) {
		state.renderedItems = props.elements;
		return;
	}

	if (state.renderedItems.length < props.elements.length) {
		state.renderedItems.push(
			...props.elements.slice(state.renderedItems.length, state.renderedItems.length + 10),
		);
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

// onMounted(() => {
// 	// renderItems();
// });

// onUnmounted(() => {
// 	window.cancelAnimationFrame(state.renderAnimationRequest);
// 	state.renderedItems = [];
// });

// Make sure the active item is always visible
// scroll if needed
watch(
	() => props.activeIndex,
	async () => {
		if (props.activeIndex === undefined) return;
		iteratorItems.value[props.activeIndex]?.scrollIntoView({ block: 'nearest' });
	},
);

// Trigger elements re-render when they change
// watch(
// 	() => props.elements,
// 	async () => {
// 		window.cancelAnimationFrame(state.renderAnimationRequest);
// 		state.renderedItems = [];
// 		renderItems();
// 	},
// );

// const { renderedItems } = toRefs(state);
</script>

<template>
	<div
		:class="$style.itemsRenderer"
		name="accordion"
		@before-enter="beforeEnter"
		@enter="enter"
		@before-leave="beforeLeave"
		@leave="leave"
	>
		<DynamicScroller :items="elements" keyField="key" :min-item-size="40" class="scroller">
			<template #default="{ item, index, active }">
				<DynamicScrollerItem
					:item="item"
					:active="active"
					@click="wrappedEmit('selected', item)"
					:data-index="index"
				>
					<div
						:key="`${item.key}-${index}`"
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
						<!-- <category-item
							v-if="item.type === 'category'"
							:item="item.properties"
							:active="activeIndex === index"
						/>
						<label-item v-if="item.type === 'label'" :item="item" /> -->

						<subcategory-item v-if="item.type === 'subcategory'" :item="item.properties" />

						<node-item
							v-if="item.type === 'node'"
							:nodeType="item.properties"
							:subcategory="item.subcategory"
							:allow-actions="withActionsGetter && withActionsGetter(item)"
							:allow-description="true"
						/>
						<!-- @dragstart="wrappedEmit('dragstart', item, $event)"
							@dragend="wrappedEmit('dragend', item, $event)"
							@nodeTypeSelected="$listeners.nodeTypeSelected"
							@actionsOpen="$listeners.actionsOpen" -->

						<!-- <action-item
							v-else-if="item.type === 'action'"
							:nodeType="item.properties"
							:action="item.properties"
							@dragstart="wrappedEmit('dragstart', item, $event)"
							@dragend="wrappedEmit('dragend', item, $event)"
						/> -->

						<view-item v-else-if="item.type === 'view'" :view="item.properties" />
					</div>
				</DynamicScrollerItem>
			</template>
		</DynamicScroller>
		<!-- <div
			v-for="(item, index) in elements"
			:key="`${item.key}-${index}`"
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
			 <category-item
				v-if="item.type === 'category'"
				:item="item.properties"
				:active="activeIndex === index"
			/>
			<label-item v-if="item.type === 'label'" :item="item" /> -->

		<!-- <subcategory-item v-if="item.type === 'subcategory'" :item="item.properties" />

			<node-item
				v-if="item.type === 'node'"
				:nodeType="item.properties"
				:allow-actions="withActionsGetter && withActionsGetter(item)"
				:allow-description="true"
			/> -->
		<!-- @dragstart="wrappedEmit('dragstart', item, $event)"
				@dragend="wrappedEmit('dragend', item, $event)"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
				@actionsOpen="$listeners.actionsOpen" -->

		<!-- <action-item
				v-else-if="item.type === 'action'"
				:nodeType="item.properties"
				:action="item.properties"
				@dragstart="wrappedEmit('dragstart', item, $event)"
				@dragend="wrappedEmit('dragend', item, $event)"
			/> -->

		<!-- <view-item v-else-if="item.type === 'view'" :view="item.properties" />
		</div> -->
		<!-- <aside
			v-for="item in elements.length"
			v-show="elements.length < item"
			:key="item"
			:class="$style.loadingItem"
		>
			<n8n-loading :loading="true" :rows="1" variant="p" />
		</aside> -->
	</div>
</template>

<style lang="scss" module>
// .loadingItem {
// 	height: 48px;
// 	margin: 0 var(--search-margin, var(--spacing-s));
// }
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
