<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { computed, nextTick, ref, watch } from 'vue';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import type { Inclusion, ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import { hasWorkflowDiff } from '../../promotionPreview.workflow';
import PromotionChangeCard from './PromotionChangeCard.vue';

const props = defineProps<{
	order: ResourceKey[];
	graph: SelectionGraph;
	direction: PromotionDirection;
	inclusion: Inclusion;
	entries: ReadonlyMap<ResourceKey, DetailEntry>;
	inspectedKey?: ResourceKey;
	blockers: BlockerIndex;
	branchName?: string;
}>();

const openWorkflow = defineModel<ResourceKey | undefined>('openWorkflow');

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
	// A card above that closes removes its content a few ticks later. Wait for the next frame.
	await new Promise((resolve) => requestAnimationFrame(resolve));
	list.value
		?.querySelector(`[data-resource-key="${CSS.escape(key)}"]`)
		?.scrollIntoView({ block: 'start' });
}

watch(() => props.inspectedKey, scrollToCard, { immediate: true });

// Workflow cards share one open state, so opening a diff closes the other. The other cards
// keep their own open state.
function openBinding(resource: PromotionResource) {
	if (!hasWorkflowDiff(resource)) return {};
	return {
		open: openWorkflow.value === resource.key,
		'onUpdate:open': async (open: boolean) => {
			if (!open) {
				openWorkflow.value = undefined;
				return;
			}
			openWorkflow.value = resource.key;
			// Closing a diff above can move this card out of view.
			await scrollToCard(resource.key);
		},
	};
}

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
			:branch-name="branchName"
			v-bind="openBinding(resource)"
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
