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
}

const { popViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
const expanded = ref(true);
function onClick() {
	setExpanded(!expanded.value);
}

function setExpanded(isExpanded: boolean) {
	expanded.value = isExpanded;
}

watch(
	() => props.elements,
	(elements) => {
		setExpanded(elements.length > 0);
	},
);

registerKeyHook(`CategoryRight_${props.category}`, {
	keyboardKey: 'ArrowRight',
	condition: ({ type, activeItemId }) => type === 'category' && props.category === activeItemId,
	handler: arrowRight,
});

registerKeyHook(`CategoryLeft_${props.category}`, {
	keyboardKey: 'ArrowLeft',
	condition: ({ type, activeItemId }) => type === 'category' && props.category === activeItemId,
	handler: arrowLeft,
});

function arrowRight() {
	console.log('ArrowRight');
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
			@click="onClick"
		/>
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
.contentSlot {
	padding: var(--spacing-xs) var(--spacing-s) var(--spacing-3xs);
}
</style>
