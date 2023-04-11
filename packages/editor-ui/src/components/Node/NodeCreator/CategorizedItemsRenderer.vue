<script setup lang="ts">
import { INodeCreateElement } from '@/Interface';
import CategoryItem from './CategoryItem.vue';
import { reactive, computed, onMounted, watch, onUnmounted, ref } from 'vue';
import ItemsRenderer from './ItemsRenderer.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { useViewStacks } from './composables/useViewStacks';

export interface Props {
	elements: INodeCreateElement[];
	category: string;
	disabled?: boolean;
	activeIndex?: number;
	isTriggerCategory?: boolean;
	mouseOverTooltip?: string;
}

const { popViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
const expanded = ref(true);

function toggleExpanded() {
	setExpanded(!expanded.value);
}

function setExpanded(isExpanded: boolean) {
	expanded.value = isExpanded;
}

watch(
	() => props.elements,
	(elements) => {
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

function arrowRight() {
	if (expanded.value) return;

	expanded.value = true;
}
function arrowLeft() {
	if (!expanded.value) {
		popViewStack();
		return;
	}

	expanded.value = false;
}
</script>

<template>
	<div :class="$style.categorizedItemsRenderer" :data-category-collapsed="!expanded">
		<CategoryItem
			:name="category"
			:disabled="disabled"
			:active="activeItemId === category"
			:count="elements.length"
			:expanded="expanded"
			:isTrigger="isTriggerCategory"
			data-keyboard-nav-type="category"
			:data-keyboard-nav-id="category"
			@click="toggleExpanded"
		>
			<span :class="$style.mouseOverTooltip">
				<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
					<n8n-icon icon="question-circle" size="small" />
					<template #content>
						<div v-html="mouseOverTooltip" />
					</template>
				</n8n-tooltip>
			</span>
		</CategoryItem>
		<div :class="$style.contentSlot" v-if="expanded && elements.length > 0 && $slots.default">
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
:root .tooltipPopper {
	max-width: 260px;
}
.contentSlot {
	padding: var(--spacing-xs) var(--spacing-s) var(--spacing-3xs);
}
.categorizedItemsRenderer {
	padding-bottom: var(--spacing-m);
}
</style>
