<script setup lang="ts">
/**
 * Lucide "sparkles" decomposed into three groups for staggered entrance.
 * Paths match lucide-static@0.468.0/icons/sparkles.svg (stroke icon).
 */
const SIZE_PX = 24;
const STROKE_WIDTH = 2;

/** Pause after flyout step is shown before any sparkle is visible. */
const INITIAL_DELAY_MS = 400;
/** Main star fade + scale. */
const MAIN_MS = 340;
/** Bottom-left starts near end of main (sequential read). */
const BL_DELAY_MS = INITIAL_DELAY_MS + 220;
const BL_MS = 350;
/** Top-right after bottom-left. */
const TR_DELAY_MS = BL_DELAY_MS + BL_MS + 50;
const TR_MS = 350;
</script>

<template>
	<span
		class="wrap"
		:style="{
			'--duration--sparkle-main-wait': `${INITIAL_DELAY_MS}ms`,
			'--duration--sparkle-main': `${MAIN_MS}ms`,
			'--duration--sparkle-bl-wait': `${BL_DELAY_MS}ms`,
			'--duration--sparkle-bl': `${BL_MS}ms`,
			'--duration--sparkle-tr-wait': `${TR_DELAY_MS}ms`,
			'--duration--sparkle-tr': `${TR_MS}ms`,
		}"
		data-test-id="instance-ai-discover-first-automation-sparkles"
		aria-hidden="true"
	>
		<svg
			class="svg"
			:width="SIZE_PX"
			:height="SIZE_PX"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g
				class="part partMain"
				stroke="currentColor"
				:stroke-width="STROKE_WIDTH"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
				/>
			</g>
			<g
				class="part partBl"
				stroke="currentColor"
				:stroke-width="STROKE_WIDTH"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4 17v2" />
				<path d="M5 18H3" />
			</g>
			<g
				class="part partTr"
				stroke="currentColor"
				:stroke-width="STROKE_WIDTH"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M20 3v4" />
				<path d="M22 5h-4" />
			</g>
		</svg>
	</span>
</template>

<style lang="scss" scoped>
.wrap {
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	color: inherit;
}

.svg {
	display: block;
}

.part {
	transform-origin: 12px 12px;
	opacity: 0;
	transform: scale(0.97);
	animation-name: sparklePartIn;
	animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
	animation-fill-mode: forwards;
}

.partMain {
	animation-duration: var(--duration--sparkle-main);
	animation-delay: var(--duration--sparkle-main-wait);
}

.partBl {
	animation-duration: var(--duration--sparkle-bl);
	animation-delay: var(--duration--sparkle-bl-wait);
}

.partTr {
	animation-duration: var(--duration--sparkle-tr);
	animation-delay: var(--duration--sparkle-tr-wait);
}

@keyframes sparklePartIn {
	from {
		opacity: 0;
		transform: scale(0.9);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
