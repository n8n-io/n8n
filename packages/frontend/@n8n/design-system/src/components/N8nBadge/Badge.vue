<script lang="ts" setup>
import { Primitive } from 'reka-ui';
import { computed } from 'vue';

import type { IconSize } from '../../types';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import type { BadgeProps } from './Badge.type';

defineOptions({ name: 'N8nBadge' });

const props = withDefaults(defineProps<BadgeProps>(), {
	variant: 'outline',
	size: 'xsmall',
	clickable: false,
});

const effectiveIconSize = computed(function getEffectiveIconSize(): IconSize {
	switch (props.size) {
		case 'large':
		case 'xlarge':
			return 'xlarge';
		default:
			return 'medium';
	}
});
const effectiveTextSize = computed(function getEffectiveTextSize() {
	switch (props.size) {
		case 'large':
		case 'xlarge':
			return 'sm';
		case 'xsmall':
			return '2xs';
		default:
			return 'xs';
	}
});
</script>

<template>
	<Primitive
		:as="props.clickable ? 'button' : 'span'"
		:type="props.clickable ? 'button' : undefined"
		:disabled="props.clickable ? props.disabled : undefined"
		:class="[$style.badge, $style[variant], $style[size], { [$style.clickable]: props.clickable }]"
	>
		<N8nIcon
			v-if="props.leadingIcon"
			:class="$style.leadingIcon"
			:icon="props.leadingIcon"
			:size="effectiveIconSize"
		/>
		<slot name="leading" />
		<N8nText :class="$style.label" :step="effectiveTextSize" bold>
			<slot></slot>
		</N8nText>
		<slot name="trailing" />
		<N8nIcon
			v-if="props.trailingIcon"
			:class="$style.trailingIcon"
			:icon="props.trailingIcon"
			:size="effectiveIconSize"
		/>
	</Primitive>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.badge {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
	border-radius: var(--radius--full);
	user-select: none;
	appearance: none;
	width: fit-content;

	--n8n-badge--background: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	--n8n-badge--border-color: var(--n8n-badge--background);
	--n8n-badge--text-color: var(--text-color--subtle);
	--n8n-badge--height: var(--height--sm);
	--n8n-badge--padding: var(--spacing--2xs);
	--n8n-badge--gap: var(--spacing--4xs);

	gap: var(--n8n-badge--gap);
	background-color: var(--n8n-badge--background);
	border: 1px solid var(--n8n-badge--border-color);
	height: var(--n8n-badge--height);
	padding-inline: var(--n8n-badge--padding);
	color: var(--n8n-badge--text-color);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.clickable {
	outline: none;
	cursor: pointer;

	&:not(:disabled):hover {
		background-color: color-mix(in srgb, var(--n8n-badge--background), black 5%);
		border-color: color-mix(in srgb, var(--n8n-badge--background), black 5%);
	}

	&:not(:disabled):active {
		background-color: color-mix(in srgb, var(--n8n-badge--background), black 10%);
		border-color: color-mix(in srgb, var(--n8n-badge--background), black 10%);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.xsmall {
	--n8n-badge--height: var(--height--xs);
	--n8n-badge--padding: var(--spacing--2xs);
}

.small {
	--n8n-badge--height: var(--height--sm);
	--n8n-badge--padding: var(--spacing--2xs);
}

.medium {
	--n8n-badge--height: var(--height--md);
	--n8n-badge--padding: var(--spacing--xs);
}

.large {
	--n8n-badge--height: var(--height--lg);
	--n8n-badge--padding: var(--spacing--sm);
}

.xlarge {
	--n8n-badge--height: var(--height--xl);
	--n8n-badge--padding: var(--spacing--sm);
}

.primary {
	--n8n-badge--background: var(--background--brand);
	--n8n-badge--text-color: var(--color--neutral-white);
}

.secondary {
	--n8n-badge--background: var(--color--purple-200);
	--n8n-badge--text-color: var(--color--purple-900);
}

.subtle {
	--n8n-badge--background: var(--background--surface);
	--n8n-badge--border-color: var(--border-color);
	--n8n-badge--text-color: var(--text-color--subtle);
	box-shadow: var(--shadow--xs);
}

.outline {
	--n8n-badge--background: transparent;
	--n8n-badge--border-color: var(--border-color);
	--n8n-badge--text-color: var(--text-color);
}

.ghost {
	--n8n-badge--background: transparent;
	--n8n-badge--border-color: transparent;
	--n8n-badge--text-color: var(--text-color);
}

.warning {
	--n8n-badge--background: var(--color--yellow-200);
	--n8n-badge--text-color: var(--color--yellow-900);
}

.danger {
	--n8n-badge--background: var(--color--red-200);
	--n8n-badge--text-color: var(--color--red-900);
}

.success {
	--n8n-badge--background: var(--color--green-200);
	--n8n-badge--text-color: var(--color--green-900);
}

.leadingIcon,
.trailingIcon {
	flex-shrink: 0;
	opacity: 0.9;
}
.leadingIcon + .label {
	margin-inline-end: calc(var(--n8n-badge--padding) * 0.2);
}

.label + .trailingIcon {
	margin-inline-start: calc(var(--n8n-badge--padding) * 0.2);
}
</style>
