<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
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
		/**
		 * Only for the changes view: the heading of the group that holds a resource, such as its
		 * project. The list shows a heading where the group changes.
		 */
		headingOf?: (resource: PromotionResource) => string | undefined;
	}>(),
	{ selectable: true, headingOf: undefined },
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

/** The cards in order, each with the heading that starts its group. */
const entriesWithHeadings = computed(() => {
	let previous: string | undefined;
	return resources.value.map((resource) => {
		const heading = props.headingOf?.(resource);
		const starts = heading !== undefined && heading !== previous;
		previous = heading;
		return { resource, heading: starts ? heading : undefined };
	});
});

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
		<template v-for="{ resource, heading } in entriesWithHeadings" :key="resource.key">
			<N8nText
				v-if="heading"
				tag="h2"
				size="small"
				bold
				color="text-base"
				:class="$style.heading"
				data-test-id="promotion-preview-cards-heading"
			>
				<N8nIcon icon="layers" size="small" />
				{{ heading }}
			</N8nText>
			<PromotionChangeCard
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
		</template>
	</div>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;

	/* More room above a new group than between its cards. */
	&:not(:first-child) {
		margin-top: var(--spacing--xs);
	}
}
</style>
