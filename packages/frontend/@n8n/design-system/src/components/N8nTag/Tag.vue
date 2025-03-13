<script lang="ts" setup>
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
	<span :class="['n8n-tag', $style.tag, { [$style.clickable]: clickable }]" v-bind="$attrs">
		<slot v-if="$slots['tag']" name="tag" />
		<span v-else>{{ text }}</span>
	</span>
</template>

<style lang="scss" module>
.tag {
	min-width: max-content;
	padding: 1px var(--spacing-4xs);
	color: var(--color-text-dark);
	background-color: var(--color-background-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);

	transition: background-color 0.3s ease;

	&.clickable {
		cursor: pointer;

		&:hover {
			background-color: var(--color-background-medium);
		}
	}
}
</style>
