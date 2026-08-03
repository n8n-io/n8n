<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	state: string;
}>();

const i18n = useI18n();

const KNOWN_STATES = ['in_review', 'waiting_on_destination', 'approved', 'promoted', 'closed'];

const label = computed(() => {
	if (KNOWN_STATES.includes(props.state)) {
		return i18n.baseText(`promotions.state.${props.state}` as never);
	}
	// State vocabularies are model-owned, so unknown values render as-is
	return props.state.replace(/_/g, ' ');
});

const variant = computed(() => (KNOWN_STATES.includes(props.state) ? props.state : 'unknown'));
</script>

<template>
	<span :class="[$style.badge, $style[variant]]" data-test-id="promotion-state-badge">
		<span :class="$style.dot" />
		{{ label }}
	</span>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--2xs);
	height: var(--spacing--md);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
	color: var(--color--text);
	background-color: var(--color--background--light-3);
}

.dot {
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
	background-color: var(--color--neutral-500);
}

.in_review .dot,
.badge.in_review .dot {
	background-color: var(--color--yellow-500);
}

.waiting_on_destination .dot {
	background-color: var(--color--blue-500);
}

.approved .dot {
	background-color: var(--color--purple-500);
}

.promoted .dot {
	background-color: var(--color--green-500);
}

.closed .dot,
.unknown .dot {
	background-color: var(--color--neutral-500);
}
</style>
