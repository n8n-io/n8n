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
	position: relative;
	padding: var(--n8n-ai-activity-step--padding, 0);
	height: var(--n8n-ai-activity-step--height, var(--button--height));
	min-height: var(--n8n-ai-activity-step--min-height, 0);

	/**
	 * Matches the text size of the chat markdown around the step. N8nChatMessage
	 * sets the markdown size, and it changes on large screens.
	 */
	--n8n-ai-activity-step--font-size--resolved: var(
		--n8n-ai-activity-step--font-size,
		var(--n8n-markdown--font-size--base, var(--font-size--sm))
	);

	/** Overrides for N8nButton **/
	--button--font-size: var(--n8n-ai-activity-step--font-size--resolved);
	--button--color--background-active: transparent;
	--button--color--background-hover: transparent;

	&:hover {
		color: var(--n8n-ai-activity-step--color, var(--text-color--subtle));
	}

	&.nonInteractive {
		cursor: default;

		&:hover {
			color: var(--text-color--subtler);
		}
	}

	/** The size classes of N8nButton set its font size with a stronger selector. */
	> * {
		width: 100%;
		overflow: hidden;
		font-size: var(--n8n-ai-activity-step--font-size--resolved);
	}

	:global(.n8n-icon) {
		flex-shrink: 0;
	}
}

.label {
	min-width: 0;
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
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--foreground: color-mix(
		in oklch,
		var(--n8n-ai-activity-step--color, var(--text-color--subtler)),
		transparent 50%
	);
	--animation--shimmer--background: var(--n8n-ai-activity-step--color, var(--text-color--subtler));
	@include motion.shimmer;
}
</style>
