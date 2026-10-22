<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { computed, nextTick, ref, watch } from 'vue';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import type { Inclusion, ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import PromotionChangeCard from './PromotionChangeCard.vue';

const props = defineProps<{
	order: ResourceKey[];
	graph: SelectionGraph;
	direction: PromotionDirection;
	inclusion: Inclusion;
	entries: ReadonlyMap<ResourceKey, DetailEntry>;
	inspectedKey?: ResourceKey;
	blockers: BlockerIndex;
}>();

const emit = defineEmits<{
	retry: [key: ResourceKey];
	refresh: [];
	inspect: [key: ResourceKey];
}>();

const list = ref<HTMLElement | null>(null);
const resources = computed(() =>
	props.order.flatMap((key) => {
		const resource = props.graph.resources.get(key);
		return resource ? [resource] : [];
	}),
);

// Scrolls the card to the top. An instant jump keeps loading cards from pushing it away.
async function scrollToCard(key: ResourceKey | undefined) {
	if (!key) return;
	await nextTick();
	list.value
		?.querySelector(`[data-resource-key="${CSS.escape(key)}"]`)
		?.scrollIntoView({ block: 'start' });
}

watch(() => props.inspectedKey, scrollToCard, { immediate: true });

defineExpose({ scrollToCard });
</script>

<template>
	<div ref="list" :class="$style.list" data-test-id="promotion-preview-cards">
		<PromotionChangeCard
			v-for="resource in resources"
			:key="resource.key"
			:resource="resource"
			:graph="graph"
			:direction="direction"
			:included="inclusion.included.has(resource.key)"
			:entry="entries.get(resource.key)"
			:inspected="inspectedKey === resource.key"
			:blockers="blockersOf(blockers, resource)"
			@inspect="emit('inspect', $event)"
			@retry="emit('retry', resource.key)"
			@refresh="emit('refresh')"
		/>
	</div>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
