<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';

defineOptions({ name: 'N8nPreviewBadge' });

withDefaults(
	defineProps<{
		size?: BadgeSize;
		text?: string;
	}>(),
	{ size: 'xxsmall', text: undefined },
);

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="secondary" :size="size" :class="$style.preview">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>

<style lang="scss" module>
.preview {
	--n8n-badge--border-color: transparent;

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
		/** Keep the full highlight inside the moving layer. */
		background-size: 100% 100%;
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
