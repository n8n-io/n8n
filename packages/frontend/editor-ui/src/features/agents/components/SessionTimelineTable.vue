<script lang="ts" setup>
import { computed } from 'vue';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { TimelineItem } from '../session-timeline.types';
import { itemFilterKey } from '../session-timeline.utils';

const props = defineProps<{
	items: TimelineItem[];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const rows = computed(() =>
	props.items
		.map((item, index) => ({ item, index }))
		.filter(
			({ item }) => props.visibleKinds.size === 0 || props.visibleKinds.has(itemFilterKey(item)),
		),
);
</script>

<template>
	<div :class="$style.table">
		<div
			v-for="{ item, index } in rows"
			:key="index"
			data-test-id="timeline-row"
			@click="emit('select', index)"
		>
			<SessionTimelineRow :item="item" :selected="props.selectedIndex === index" />
		</div>
	</div>
</template>

<style module lang="scss">
.table {
	display: flex;
	flex-direction: column;
}
</style>
