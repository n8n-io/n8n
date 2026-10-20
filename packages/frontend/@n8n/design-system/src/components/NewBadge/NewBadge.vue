<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';

defineOptions({ name: 'N8nNewBadge' });

withDefaults(
	defineProps<{
		/** The badge size. */
		size?: BadgeSize;
		/** Optional text in place of the New label. */
		text?: string;
	}>(),
	{ size: 'xxsmall', text: undefined },
);

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="primary" :size="size" :class="$style.newBadge">
		<template #leading>
			<span :class="$style.shimmer" aria-hidden="true" />
		</template>
		{{ text ?? t('menuItem.new') }}
	</N8nBadge>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.newBadge {
	--n8n-badge--border-color: var(--background--brand);
	--n8n-badge--background: linear-gradient(
		to bottom,
		var(--background--brand),
		var(--color--pink-400)
	);

	/** Keep the shimmer and both gleams on the same cycle. */
	--new-badge--cycle: 5000ms;

	position: relative;

	/** Keep the fill inside the border and layer reflections over the brand edge. */
	border-color: transparent;
	background:
		var(--n8n-badge--background) padding-box,
		linear-gradient(
				135deg,
				var(--color--white-alpha-200) 0%,
				transparent 22%,
				var(--color--white-alpha-200) 42%,
				transparent 58%,
				transparent 72%,
				var(--color--white-alpha-200) 88%,
				transparent 100%
			)
			border-box,
		linear-gradient(var(--n8n-badge--border-color), var(--n8n-badge--border-color)) border-box;

	&::before,
	&::after {
		content: '';
		position: absolute;
		width: var(--height--4xs);
		height: var(--height--4xs);
		background: var(--color--white-alpha-800);
		clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
		pointer-events: none;
		opacity: 0;
		transform: scale(0.65);
		z-index: 2;
	}

	&::before {
		inset-block-start: calc(-1 * var(--spacing--5xs));
		inset-inline-end: calc(-1 * var(--spacing--5xs));
	}

	&::after {
		inset-block-end: calc(-1 * var(--spacing--5xs));
		inset-inline-start: calc(-1 * var(--spacing--5xs));
	}

	@media (hover: hover) {
		&:hover .shimmer::after,
		:global(:hover) > & .shimmer::after {
			animation: newBadgeShimmer var(--new-badge--cycle) var(--easing--ease-in-out) infinite;
			@include motion.reduced-motion;
		}

		&:hover::before,
		&:hover::after,
		:global(:hover) > &::before,
		:global(:hover) > &::after {
			animation: newBadgeGleam var(--new-badge--cycle) var(--easing--ease-out) infinite;
			@include motion.reduced-motion;
		}

		&:hover::after,
		:global(:hover) > &::after {
			/** Start the second gleam when the first one finishes. */
			animation-delay: calc(var(--new-badge--cycle) * 0.125);
		}
	}

	:global(.n8n-text) {
		position: relative;
		z-index: 1;
	}
}

.shimmer {
	position: absolute;
	inset: 0;
	overflow: hidden;
	border-radius: inherit;
	pointer-events: none;

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
}

/** Show the gleam after the second shimmer pass, then leave the cycle quiet. */
@keyframes newBadgeGleam {
	0%,
	21.875% {
		opacity: 0;
		transform: scale(0.65) rotate(-20deg);
	}
	25% {
		opacity: 1;
		transform: scale(1) rotate(-10deg);
	}
	28.125% {
		opacity: 1;
		transform: scale(1) rotate(0deg);
	}
	34.375%,
	100% {
		opacity: 0;
		transform: scale(0.65) rotate(20deg);
	}
}

@keyframes newBadgeShimmer {
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
