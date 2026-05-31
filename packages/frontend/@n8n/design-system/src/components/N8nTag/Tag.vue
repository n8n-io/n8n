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
		<span v-else>{{ text }}</span>
	</span>
</template>

<style lang="scss" module>
.tag {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: max-content;
	height: var(--tag--height);
	padding: var(--tag--padding);
	line-height: var(--tag--line-height);
	color: var(--tag--color--text);
	background-color: var(--tag--color--background);
	border: 1px solid var(--tag--border-color);
	border-radius: var(--tag--radius);
	font-size: var(--tag--font-size);
	transition: background-color 0.3s ease;

	&.clickable {
		cursor: pointer;

		&:hover {
			background-color: var(--tag--color--background--hover);
			border-color: var(--tag--border-color--hover);
		}
	}
}

.sm {
	--tag--height: var(--height--2xs);
	--tag--padding: 0 var(--spacing--4xs);
	--tag--font-size: var(--font-size--2xs);
}

.md {
	--tag--height: var(--height--xs);
	--tag--padding: var(--spacing--4xs) var(--spacing--2xs);
	--tag--font-size: var(--font-size--xs);
}

.lg {
	--tag--height: var(--height--sm);
	--tag--padding: var(--spacing--4xs) var(--spacing--2xs);
	--tag--font-size: var(--font-size--xs);
}
</style>
