<template>
	<span :class="['n8n-tag', $style.tag]" v-bind="$attrs">
		{{ text }}
	</span>
</template>

<script lang="ts" setup>
interface TagProps {
	text: string;
}
defineOptions({ name: 'N8nTag' });
defineProps<TagProps>();
</script>

<style lang="scss" module>
.tag {
	min-width: max-content;
	padding: 1px var(--spacing-4xs);
	color: var(--color-text-dark);
	background-color: var(--color-background-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
	transition: background-color 0.3s ease;

	&:hover {
		background-color: var(--color-background-medium);
	}
}
</style>
