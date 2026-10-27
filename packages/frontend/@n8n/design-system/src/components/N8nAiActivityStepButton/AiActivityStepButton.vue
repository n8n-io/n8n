<script lang="ts" setup>
import N8nButton from '../N8nButton';

const props = withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		loading?: boolean;
		interactive?: boolean;
		/** Stretch the header and keep prefix and suffix content at their intrinsic width. */
		fullWidth?: boolean;
	}>(),
	{
		size: 'small',
		loading: false,
		interactive: true,
		fullWidth: false,
	},
);

defineSlots<{
	prefix?: () => unknown;
	suffix?: () => unknown;
	icon?: () => unknown;
	default?: () => unknown;
}>();

function handleClick(event: MouseEvent) {
	if (!props.interactive) {
		event.preventDefault();
		event.stopPropagation();
	}
}
</script>

<template>
	<N8nButton
		variant="ghost"
		:size="props.size"
		:class="[
			$style.button,
			!props.interactive && $style.nonInteractive,
			props.fullWidth && $style.fullWidth,
		]"
		@click="handleClick"
	>
		<slot name="prefix" />
		<span :class="{ [$style.label]: true, [$style.shimmer]: props.loading }">
			<slot />
		</span>
		<slot name="icon" />
		<slot name="suffix" />
	</N8nButton>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.button {
	max-width: 90%;
	justify-content: flex-start;
	color: var(--n8n-ai-activity-step--color, var(--text-color--subtler));
	font-size: var(--font-size--sm);
	position: relative;
	// Inherit header styles through the group without selecting nested buttons.
	padding: var(--n8n-ai-activity-step--padding, 0);
	height: var(--n8n-ai-activity-step--height, var(--n8n-button--height));
	min-height: var(--n8n-ai-activity-step--min-height, 0);

	--n8n-button--padding: 0;
	--n8n-button--font-size: var(--font-size--sm);
	--n8n-button--color--background-active: transparent;
	--n8n-button--color--background-hover: transparent;

	&:hover {
		color: var(--n8n-ai-activity-step--color, var(--text-color--subtle));
	}

	&.nonInteractive {
		cursor: default;
		opacity: 1;

		&:hover {
			color: var(--text-color--subtler);
		}
	}

	> * {
		width: 100%;
		overflow: hidden;
	}

	:global(.n8n-icon) {
		flex-shrink: 0;
	}
}

.label {
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: normal;
}

.fullWidth {
	width: 100%;
	max-width: 100%;
	justify-content: stretch;

	> * {
		min-width: 0;
	}

	.label {
		flex: 1;
		min-width: 0;
		text-align: left;
	}
}

.shimmer {
	--n8n-animation--shimmer--duration: 1.5s;
	--n8n-animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--n8n-animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;
}
</style>
