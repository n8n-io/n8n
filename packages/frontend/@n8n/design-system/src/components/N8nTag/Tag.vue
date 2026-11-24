<script lang="ts" setup>
interface TagProps {
	text: string;
	clickable?: boolean;
	size?: 'sm' | 'md' | 'lg';
}
defineOptions({ name: 'N8nTag' });
withDefaults(defineProps<TagProps>(), {
	clickable: true,
	size: 'sm',
});
</script>

<template>
	<span
		:class="['n8n-tag', $style.tag, $style[size], { [$style.clickable]: clickable }]"
		v-bind="$attrs"
	>
		<slot v-if="$slots['tag']" name="tag" />
		<span v-else :class="$style.text">{{ text }}</span>
	</span>
</template>

<style lang="scss" module>
.tag {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: var(--n8n-tag--min-width, max-content);
	height: var(--n8n-tag--height);
	padding: var(--n8n-tag--padding);
	max-width: var(--n8n-tag--max-width);
	line-height: var(--n8n-tag--line-height);
	color: var(--n8n-tag--color--text);
	background-color: var(--n8n-tag--color--background);
	border: 1px solid var(--n8n-tag--border-color);
	border-radius: var(--n8n-tag--radius);
	font-size: var(--tag--font-size);
	transition: background-color 0.3s ease;
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover {
			background-color: var(--n8n-tag--color--background--hover);
			border-color: var(--n8n-tag--border-color--hover);
		}
	}
}

.text {
	min-width: 0;
	line-height: normal;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sm {
	--n8n-tag--height: var(--height--2xs);
	--n8n-tag--padding: 0 var(--spacing--4xs);
	--tag--font-size: var(--font-size--2xs);
}

.md {
	--n8n-tag--height: var(--height--xs);
	--n8n-tag--padding: var(--spacing--4xs) var(--spacing--2xs);
	--tag--font-size: var(--font-size--xs);
}

.lg {
	--n8n-tag--height: var(--height--sm);
	--n8n-tag--padding: var(--spacing--4xs) var(--spacing--2xs);
	--tag--font-size: var(--font-size--xs);
}
</style>
