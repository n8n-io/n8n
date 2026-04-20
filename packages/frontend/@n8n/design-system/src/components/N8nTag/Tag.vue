<script lang="ts" setup>
import N8nBadge from '../N8nBadge';

/*
 * N8nTag is a deprecated wrapper around N8nBadge.
 * Use <N8nBadge theme="neutral"> instead.
 */

interface TagProps {
	text: string;
	clickable?: boolean;
}
defineOptions({ name: 'N8nTag' });
withDefaults(defineProps<TagProps>(), {
	clickable: true,
});
</script>

<template>
	<N8nBadge v-bind="$attrs" theme="neutral" :text="text" :clickable="clickable">
		<slot />
	</N8nBadge>
</template>
