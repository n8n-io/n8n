<script lang="ts" setup>
import type { TimelineItem } from '../../session-timeline.types';

defineProps<{
	item: TimelineItem;
	selected: boolean;
}>();
</script>

<template>
	<p>Background job timeline item</p>
</template>
