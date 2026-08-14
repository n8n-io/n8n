<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { visualStyle, type VisualProps } from '../visualGrammar';

const props = defineProps<VisualProps>();
const styles = useCssModule();

const prefersReducedMotion = computed(
	() =>
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);

const rootClass = computed(() => {
	const classes: Array<string | false | undefined> = [styles.root];

	if (props.emphasis === 'hero') classes.push(styles.emphasisHero);
	if (props.emphasis === 'primary') classes.push(styles.emphasisPrimary);
	if (props.emphasis === 'secondary') classes.push(styles.emphasisSecondary);
	if (props.emphasis === 'muted') classes.push(styles.emphasisMuted);

	if (props.density === 'compact') classes.push(styles.densityCompact);
	if (props.density === 'comfortable') classes.push(styles.densityComfortable);
	if (props.density === 'immersive') classes.push(styles.densityImmersive);

	if (props.tone === 'neutral') classes.push(styles.toneNeutral);
	if (props.tone === 'positive') classes.push(styles.tonePositive);
	if (props.tone === 'attention') classes.push(styles.toneAttention);
	if (props.tone === 'active') classes.push(styles.toneActive);

	if (props.orientation === 'vertical') classes.push(styles.orientationVertical);
	if (props.orientation === 'horizontal') classes.push(styles.orientationHorizontal);

	if (props.disclosure === 'summary') classes.push(styles.disclosureSummary);
	if (props.disclosure === 'expandable') classes.push(styles.disclosureExpandable);
	if (props.disclosure === 'full') classes.push(styles.disclosureFull);

	if (props.variant === 'monitoring') classes.push(styles.variantMonitoring);
	if (props.variant === 'recovery') classes.push(styles.variantRecovery);
	if (props.variant === 'messaging') classes.push(styles.variantMessaging);

	if (!prefersReducedMotion.value) {
		if (props.motion === 'pulse') classes.push(styles.pulse, 'pulse');
		if (props.motion === 'flow') classes.push(styles.flow, 'flow');
		if (props.motion === 'transfer') classes.push(styles.transfer, 'transfer');
		if (props.motion === 'progress') classes.push(styles.progress, 'progress');
	}

	return classes;
});

const inlineStyle = computed(() => visualStyle(props));
</script>

<template>
	<div :class="rootClass" :style="inlineStyle">
		<slot />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.root {
	display: flex;
	flex-direction: column;
	gap: var(--generative-pad, var(--spacing--sm));
	padding: var(--generative-pad, 0);
	color: var(--generative-accent, var(--text-color));
	background: var(--generative-surface, transparent);
	border-radius: var(--generative-radius, 0);
	min-width: 0;
}

.emphasisHero {
	gap: var(--spacing--md);
}

.emphasisPrimary {
	gap: var(--spacing--sm);
}

.emphasisSecondary {
	gap: var(--spacing--xs);
	color: var(--text-color--subtle);
}

.emphasisMuted {
	gap: var(--spacing--2xs);
	color: var(--text-color--subtler);
	opacity: 0.9;
}

.densityCompact {
	gap: var(--spacing--2xs);
}

.densityComfortable {
	gap: var(--spacing--sm);
}

.densityImmersive {
	gap: var(--spacing--lg);
	padding: var(--generative-pad, var(--spacing--md));
}

.toneNeutral {
	--generative-tone: var(--text-color);
}

.tonePositive {
	--generative-tone: var(--color--success);
	color: var(--generative-accent, var(--generative-tone));
}

.toneAttention {
	--generative-tone: var(--color--warning);
	color: var(--generative-accent, var(--generative-tone));
}

.toneActive {
	--generative-tone: var(--color--primary);
	color: var(--generative-accent, var(--generative-tone));
}

.orientationVertical {
	flex-direction: column;
}

.orientationHorizontal {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: flex-start;
}

.disclosureSummary,
.disclosureExpandable,
.disclosureFull {
	min-width: 0;
}

.variantMonitoring {
	border-left: var(--focus--border-width) solid var(--color--info);
	padding-left: var(--spacing--sm);
}

.variantRecovery {
	border-left: var(--focus--border-width) solid var(--color--warning);
	padding-left: var(--spacing--sm);
}

.variantMessaging {
	border-left: var(--focus--border-width) solid var(--color--secondary);
	padding-left: var(--spacing--sm);
}

.pulse {
	@include motion.opacity-pulse;
}

.flow {
	animation: generativeFlow var(--duration--slow) var(--easing--ease-in-out) infinite alternate;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

.transfer {
	animation: generativeTransfer var(--duration--base) var(--easing--ease-in-out) infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

.progress {
	position: relative;
	overflow: hidden;

	&::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: var(--focus--border-width);
		background: var(--generative-accent, var(--color--primary));
		transform-origin: left center;
		animation: generativeProgress var(--duration--slow) var(--easing--ease-in-out) infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		&::after {
			animation: none;
			transform: scaleX(1);
		}
	}
}

@keyframes generativeFlow {
	from {
		opacity: 0.72;
		transform: translateX(calc(var(--spacing--2xs) * -1));
	}
	to {
		opacity: 1;
		transform: translateX(var(--spacing--2xs));
	}
}

@keyframes generativeTransfer {
	0% {
		opacity: 0.65;
		transform: translateY(0);
	}
	50% {
		opacity: 1;
		transform: translateY(calc(var(--spacing--2xs) * -1));
	}
	100% {
		opacity: 0.65;
		transform: translateY(0);
	}
}

@keyframes generativeProgress {
	0% {
		transform: scaleX(0.15);
	}
	50% {
		transform: scaleX(0.85);
	}
	100% {
		transform: scaleX(0.15);
	}
}
</style>
