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
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: max-content;
	height: var(--tag-height);
	padding: var(--tag-padding);
	line-height: var(--tag-line-height);
	color: var(--tag-text-color);
	background-color: var(--tag-background-color);
	border: 1px solid var(--tag-border-color);
	border-radius: var(--tag-border-radius);
	font-size: var(--tag-font-size);
	transition: background-color 0.3s ease;

	&.clickable {
		cursor: pointer;

		&:hover {
			background-color: var(--tag-background-hover-color);
			border-color: var(--tag-border-hover-color);
		}
	}
}
</style>
