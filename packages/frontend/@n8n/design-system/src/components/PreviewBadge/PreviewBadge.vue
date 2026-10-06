<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';

defineOptions({ name: 'N8nPreviewBadge' });

const props = withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		text?: string;
	}>(),
	{ size: 'small', text: undefined },
);

const sizeMapping = computed(() => {
	return props.size === 'small' ? 'xxsmall' : 'xsmall';
});

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="secondary" :size="sizeMapping" :class="$style.preview">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>

<style lang="scss" module>
.preview {
	--n8n-badge--border-color: transparent;
	--n8n-badge--height: auto;

	position: relative;
	overflow: hidden;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		filter: blur(2px);
		pointer-events: none;
		background: linear-gradient(
			110deg,
			transparent 25%,
			color-mix(in srgb, var(--color--neutral-white), transparent 25%) 40%,
			var(--color--neutral-white) 47%,
			var(--color--neutral-white) 53%,
			color-mix(in srgb, var(--color--neutral-white), transparent 25%) 60%,
			transparent 75%
		);
		background-size: 250% 100%;
		mix-blend-mode: lighten;
		opacity: 1;
		transform: translateX(-100%);
	}

	@media (hover: hover) {
		&:hover::after,
		:global(:hover) > &::after {
			animation: previewBadgeShimmer 6400ms var(--easing--ease-in-out) infinite;
		}
	}

	:global(.n8n-text) {
		position: relative;
		z-index: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		&:hover::after,
		:global(:hover) > &::after {
			animation: none;
		}
	}
}

@keyframes previewBadgeShimmer {
	0% {
		transform: translateX(-100%);
	}
	10.9375% {
		transform: translateX(100%);
	}
	10.938% {
		transform: translateX(-100%);
	}
	21.875%,
	100% {
		transform: translateX(100%);
	}
}
</style>
