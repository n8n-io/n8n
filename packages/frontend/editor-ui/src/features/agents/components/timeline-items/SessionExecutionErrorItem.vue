<script lang="ts" setup>
import type { TimelineItem } from '../../session-timeline.types';

defineProps<{
	item: TimelineItem;
	selected: boolean;
}>();
</script>

<template>
	<p>Execution error timeline item</p>
</template>
