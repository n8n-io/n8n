<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { computed, nextTick, ref, watch } from 'vue';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import {
	selectionCheck,
	type DisabledKeys,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
} from '../../promotionPreview.selection';
import { isContainer } from '../../promotionPreview.tree';
import PromotionChangeCard from './PromotionChangeCard.vue';

const props = withDefaults(
	defineProps<{
		order: ResourceKey[];
		graph: SelectionGraph;
		direction: PromotionDirection;
		selected: ReadonlySet<ResourceKey>;
		inclusion: Inclusion;
		/** Blocked workflows, which users cannot add. */
		disabled: DisabledKeys;
		locked: boolean;
		entries: ReadonlyMap<ResourceKey, DetailEntry>;
		inspectedKey?: ResourceKey;
		blockers: BlockerIndex;
		/** False for a list that users only read. */
		selectable?: boolean;
	}>(),
	{ selectable: true },
);

const activeWorkflow = defineModel<ResourceKey | undefined>('activeWorkflow');

const emit = defineEmits<{
	retry: [key: ResourceKey];
	refresh: [];
	inspect: [key: ResourceKey];
	toggle: [key: ResourceKey];
	toggleContainer: [key: ResourceKey];
}>();

const check = (resource: PromotionResource) =>
	selectionCheck(props.graph, resource, {
		selected: props.selected,
		inclusion: props.inclusion,
		disabled: props.disabled,
		locked: props.locked,
	});

function onToggle(resource: PromotionResource) {
	if (isContainer(resource)) emit('toggleContainer', resource.key);
	else emit('toggle', resource.key);
}

const list = ref<HTMLElement | null>(null);
const resources = computed(() =>
	props.order.flatMap((key) => {
		const resource = props.graph.resources.get(key);
		return resource ? [resource] : [];
	}),
);

// Tree navigation scrolls to the requested card. Card toggles keep their position.
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
			:selection="check(resource)"
			:entry="entries.get(resource.key)"
			:inspected="inspectedKey === resource.key"
			:blockers="blockersOf(blockers, resource)"
			:diff-active="activeWorkflow === resource.key"
			:selectable="selectable"
			@activate-diff="activeWorkflow = resource.key"
			@deactivate-diff="activeWorkflow = undefined"
			@inspect="emit('inspect', $event)"
			@toggle="onToggle(resource)"
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
