<script setup lang="ts">
/**
 * One bot head per example: plain eyes, only the mouth changes; the fill and
 * ring carry the result. `waiting` looks around while its example runs.
 * Prototype-local; a candidate for @n8n/design-system once Checks ships.
 */
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		kind: 'pass' | 'needs_work' | 'failed' | 'idle' | 'strong' | 'waiting';
		size?: 'xs' | 'row' | 'sm' | 'md';
		/** Bob like a waiting head while keeping this face (the fixing step's worried head). */
		moving?: boolean;
		/** Keep the face but drop its colour, so only what needs attention stands out in a stack. */
		quiet?: boolean;
	}>(),
	{ size: 'row', moving: false, quiet: false },
);

const i18n = useI18n();

// Each waiting head gets its own timing, so a row of them never moves in step.
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const bob = rand(1.4, 2);
const look = rand(2.6, 4.2);
const motion = {
	'--bob-duration': `${bob.toFixed(2)}s`,
	'--bob-delay': `-${rand(0, bob).toFixed(2)}s`,
	'--look-duration': `${look.toFixed(2)}s`,
	'--look-delay': `-${rand(0, look).toFixed(2)}s`,
};

const label = computed(() => {
	switch (props.kind) {
		case 'pass':
		case 'strong':
			return i18n.baseText('agents.builder.agentChecks.reaction.pass');
		case 'needs_work':
			return i18n.baseText('agents.builder.agentChecks.reaction.needsWork');
		case 'failed':
			return i18n.baseText('agents.builder.agentChecks.reaction.failed');
		case 'waiting':
			return i18n.baseText('agents.builder.agentChecks.reaction.running');
		default:
			return i18n.baseText('agents.builder.agentChecks.reaction.notRun');
	}
});
</script>

<template>
	<span
		:class="[
			$style.head,
			quiet ? undefined : $style[kind],
			$style[size],
			{ [$style.moving]: moving },
		]"
		:style="kind === 'waiting' || moving ? motion : undefined"
		role="img"
		:aria-label="label"
		:title="label"
		data-testid="agent-reaction"
	>
		<svg
			viewBox="0 0 48 48"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="8" y="14" width="32" height="24" rx="9" fill="currentColor" fill-opacity=".1" />
			<path d="M24 14V8.6" />
			<circle cx="24" cy="6.6" r="1.8" fill="currentColor" stroke="none" />
			<path
				v-if="kind === 'failed'"
				d="M18.4 22.6l3.8 3.8M22.2 22.6l-3.8 3.8M25.8 22.6l3.8 3.8M29.6 22.6l-3.8 3.8"
			/>
			<g v-else :class="kind === 'waiting' ? $style.eyes : undefined">
				<circle cx="19" cy="24.4" r="2.1" fill="currentColor" stroke="none" />
				<circle cx="29" cy="24.4" r="2.1" fill="currentColor" stroke="none" />
			</g>
			<path v-if="kind === 'pass' || kind === 'strong'" d="M20.6 30.4q3.4 2.9 6.8 0" />
			<path v-else-if="kind === 'needs_work'" d="M20.8 32.1l6.4-1.5" />
			<path v-else-if="kind !== 'failed'" d="M21.2 31.4h5.6" />
		</svg>
		<i v-if="kind === 'strong'" :class="[$style.badge, $style.spark]">✦</i>
	</span>
</template>

<style lang="scss" module>
.head {
	position: relative;
	display: inline-grid;
	place-items: center;
	flex-shrink: 0;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: 30%;
	background: var(--background--subtle);
	color: var(--text-color--subtler);

	svg {
		width: 80%;
		height: 80%;
		overflow: visible;
	}
}

.xs {
	width: 18px;
	height: 18px;
}
.row {
	width: 20px;
	height: 20px;
}
.sm {
	width: 22px;
	height: 22px;
}
.md {
	width: 30px;
	height: 30px;
}

.pass,
.strong {
	background: var(--background--success);
	border-color: var(--border-color--success);
	color: var(--text-color--success);
}

// Needs work is a nudge, not an error: the purple n8n uses for waiting on you.
.needs_work {
	background: var(--callout--color--background--secondary);
	border-color: var(--callout--border-color--secondary);
	color: var(--callout--color--text--secondary);
}

.failed {
	background: var(--background--danger);
	border-color: var(--border-color--danger);
	color: var(--text-color--danger);
}

.badge {
	position: absolute;
	top: -3px;
	right: -3px;
	width: 9px;
	height: 9px;
	border-radius: var(--radius--full);
	background: var(--color--warning);
	color: var(--color--white);
	font-size: 7px;
	font-style: normal;
	font-weight: var(--font-weight--bold);
	line-height: 9px;
	text-align: center;
}

.spark {
	background: transparent;
	color: var(--icon-color--success);
	font-size: 9px;
	top: -6px;
	right: -5px;
}

.waiting svg,
.moving svg {
	animation: bob var(--bob-duration, 1.6s) cubic-bezier(0.45, 0, 0.55, 1) var(--bob-delay, 0s)
		infinite;
}

.eyes {
	transform-box: fill-box;
	transform-origin: center;
	animation: look var(--look-duration, 3.2s) ease-in-out var(--look-delay, 0s) infinite;
}

@keyframes bob {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-1.5px);
	}
}

@keyframes look {
	0%,
	18% {
		transform: translateX(0);
	}
	26%,
	40% {
		transform: translateX(-3px);
	}
	58%,
	72% {
		transform: translateX(3px);
	}
	80%,
	100% {
		transform: translateX(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.waiting svg,
	.eyes {
		animation: none;
	}
}
</style>
