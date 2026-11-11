<script lang="ts" setup>
import type { TagProps } from './Tag.type';

defineOptions({ name: 'N8nTag' });
withDefaults(defineProps<TagProps>(), {
	text: '',
	clickable: true,
	size: 'sm',
	round: false,
});
</script>

<template>
	<span
		:class="[
			'n8n-tag',
			$style.tag,
			$style[size],
			type ? $style[type] : undefined,
			{ [$style.clickable]: clickable, [$style.round]: round },
		]"
		v-bind="$attrs"
	>
		<slot v-if="$slots.tag" name="tag" />
		<slot v-else-if="$slots.default" />
		<span v-else :class="$style.text">{{ text }}</span>
	</span>
</template>

<style lang="scss" module>
.tag {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: var(--tag--min-width, max-content);
	height: var(--tag--height);
	padding: var(--tag--padding);
	max-width: var(--tag--max-width);
	line-height: var(--tag--line-height);
	color: var(--tag--color--text);
	background-color: var(--tag--color--background);
	border: 1px solid var(--tag--border-color);
	border-radius: var(--tag--radius);
	font-size: var(--tag--font-size);
	transition: background-color 0.3s ease;
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover {
			background-color: var(--tag--color--background--hover);
			border-color: var(--tag--border-color--hover);
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

.round {
	--tag--radius: var(--radius--full);
}

.success {
	--tag--color--text: var(--callout--color--text--success);
	--tag--color--background: var(--callout--color--background--success);
	--tag--border-color: var(--callout--border-color--success);
	--tag--color--background--hover: var(--callout--color--background--success);
	--tag--border-color--hover: var(--callout--color--text--success);
}

.info {
	--tag--color--text: var(--callout--color--text--info);
	--tag--color--background: var(--callout--color--background--info);
	--tag--border-color: var(--callout--border-color--info);
	--tag--color--background--hover: var(--callout--color--background--info);
	--tag--border-color--hover: var(--callout--color--text--info);
}

.warning {
	--tag--color--text: var(--callout--color--text--warning);
	--tag--color--background: var(--callout--color--background--warning);
	--tag--border-color: var(--callout--border-color--warning);
	--tag--color--background--hover: var(--callout--color--background--warning);
	--tag--border-color--hover: var(--callout--color--text--warning);
}

.danger {
	--tag--color--text: var(--callout--color--text--danger);
	--tag--color--background: var(--callout--color--background--danger);
	--tag--border-color: var(--callout--border-color--danger);
	--tag--color--background--hover: var(--callout--color--background--danger);
	--tag--border-color--hover: var(--callout--color--text--danger);
}
</style>
