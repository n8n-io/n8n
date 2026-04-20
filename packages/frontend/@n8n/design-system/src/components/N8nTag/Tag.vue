<script lang="ts" setup>
import N8nBadge from '../N8nBadge';

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
	<N8nBadge
		v-bind="$attrs"
		:class="['n8n-tag', $style.tag]"
		theme="neutral"
		:text="text"
		:clickable="clickable"
	>
		<slot />
	</N8nBadge>
</template>

<style lang="scss" module>
/* 
 * N8nTag is a deprecated wrapper around N8nBadge.
 * Use <N8nBadge theme="neutral"> instead.
 */
.tag {
	/* No additional styles needed - N8nBadge neutral theme handles all styling */
}
</style>
