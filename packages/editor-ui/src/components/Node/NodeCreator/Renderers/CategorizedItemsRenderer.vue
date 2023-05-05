<script setup lang="ts">
import { computed, watch, ref, getCurrentInstance } from 'vue';
import type { INodeCreateElement } from '@/Interface';

import { useWorkflowsStore } from '@/stores/workflows.store';

import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { useViewStacks } from '../composables/useViewStacks';
import ItemsRenderer from './ItemsRenderer.vue';
import CategoryItem from '../ItemTypes/CategoryItem.vue';

export interface Props {
	elements: INodeCreateElement[];
	category: string;
	disabled?: boolean;
	activeIndex?: number;
	isTriggerCategory?: boolean;
	mouseOverTooltip?: string;
	expanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const instance = getCurrentInstance();

const { popViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const { workflowId } = useWorkflowsStore();

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
const actionCount = computed(() => props.elements.filter(({ type }) => type === 'action').length);
const expanded = ref(props.expanded ?? false);

function toggleExpanded() {
	setExpanded(!expanded.value);
}

function setExpanded(isExpanded: boolean) {
	expanded.value = isExpanded;

	if (expanded.value) {
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', {
			category_name: props.category,
			workflow_id: workflowId,
		});
	}
}

function arrowRight() {
	if (expanded.value) return;

	setExpanded(true);
}

function arrowLeft() {
	if (!expanded.value) {
		popViewStack();
		return;
	}

	setExpanded(false);
}

watch(
	() => props.elements,
	() => {
		setExpanded(true);
	},
);

registerKeyHook(`CategoryRight_${props.category}`, {
	keyboardKeys: ['ArrowRight'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: arrowRight,
});
registerKeyHook(`CategoryToggle_${props.category}`, {
	keyboardKeys: ['Enter'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: toggleExpanded,
});

registerKeyHook(`CategoryLeft_${props.category}`, {
	keyboardKeys: ['ArrowLeft'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: arrowLeft,
});
</script>

<template>
	<div :class="$style.categorizedItemsRenderer" :data-category-collapsed="!expanded">
		<CategoryItem
			:class="$style.categoryItem"
			:name="category"
			:disabled="disabled"
			:active="activeItemId === category"
			:count="actionCount"
			:expanded="expanded"
			:isTrigger="isTriggerCategory"
			data-keyboard-nav-type="category"
			:data-keyboard-nav-id="category"
			@click="toggleExpanded"
		>
			<span :class="$style.mouseOverTooltip" v-if="mouseOverTooltip">
				<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
					<n8n-icon icon="question-circle" size="small" />
					<template #content>
						<div v-html="mouseOverTooltip" />
					</template>
				</n8n-tooltip>
			</span>
		</CategoryItem>
		<div :class="$style.contentSlot" v-if="expanded && actionCount > 0 && $slots.default">
			<slot />
		</div>
		<!-- Pass through listeners & empty slot to ItemsRenderer -->
		<ItemsRenderer
			v-if="expanded"
			:elements="elements"
			v-on="$listeners"
			:isTrigger="isTriggerCategory"
		>
			<template #default> </template>
			<template #empty>
				<slot name="empty" v-bind="{ elements }" />
			</template>
		</ItemsRenderer>
	</div>
</template>

<style lang="scss" module>
.mouseOverTooltip {
	opacity: 0;
	margin-left: var(--spacing-3xs);
	&:hover {
		color: var(--color-primary);
	}

	.categorizedItemsRenderer:hover & {
		opacity: 1;
	}
}
.tooltipPopper {
	max-width: 260px;
}
.contentSlot {
	padding: 0 var(--spacing-s) var(--spacing-3xs);
	margin-top: var(--spacing-xs);
}
.categorizedItemsRenderer {
	padding-bottom: var(--spacing-s);
}
</style>
