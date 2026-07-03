<script lang="ts" setup>
import N8nButton from '../N8nButton';

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		loading?: boolean;
	}>(),
	{
		size: 'small',
		loading: false,
	},
);

defineSlots<{
	prefix?: () => unknown;
	suffix?: () => unknown;
	icon?: () => unknown;
	default?: () => unknown;
}>();
</script>

<template>
	<N8nButton variant="ghost" :size="size" :class="$style.button">
		<slot name="prefix" />
		<span :class="{ [$style.label]: true, [$style.shimmer]: loading }">
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
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	position: relative;
	padding-inline: 0;

	--button--padding: 0;
	--button--font-size: var(--font-size--sm);
	--button--color--background-active: transparent;
	--button--color--background-hover: transparent;

	&:hover {
		color: var(--text-color--subtle);
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

.shimmer {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;
}
</style>
