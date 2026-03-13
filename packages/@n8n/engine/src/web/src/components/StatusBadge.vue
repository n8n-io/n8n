<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

const props = withDefaults(
	defineProps<{
		status: string;
		size?: 'sm' | 'md';
	}>(),
	{
		size: 'md',
	},
);

const $style = useCssModule();

const statusConfig = computed(() => {
	const map: Record<string, { label: string; color: string }> = {
		// Execution statuses
		running: { label: 'Running', color: 'warning' },
		completed: { label: 'Completed', color: 'success' },
		failed: { label: 'Failed', color: 'danger' },
		cancelled: { label: 'Cancelled', color: 'muted' },
		waiting: { label: 'Waiting', color: 'info' },
		paused: { label: 'Paused', color: 'info' },
		// Step statuses
		pending: { label: 'Pending', color: 'muted' },
		queued: { label: 'Queued', color: 'muted' },
		retry_pending: { label: 'Retry Pending', color: 'warning' },
		waiting_approval: { label: 'Awaiting Approval', color: 'info' },
		skipped: { label: 'Skipped', color: 'muted' },
		cached: { label: 'Cached', color: 'success' },
	};
	return map[props.status] ?? { label: props.status, color: 'muted' };
});

const badgeClasses = computed(() => {
	return [$style.badge, $style[statusConfig.value.color], $style[props.size]];
});
</script>

<template>
	<span :class="badgeClasses">
		<span :class="$style.dot" />
		{{ statusConfig.label }}
	</span>
</template>

<style module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
	font-weight: var(--font-weight-medium);
	border-radius: var(--radius-xl);
	white-space: nowrap;
	line-height: 1;
}

.sm {
	font-size: var(--font-size-xs);
	padding: var(--spacing-3xs) var(--spacing-xs);
}

.md {
	font-size: var(--font-size-sm);
	padding: var(--spacing-2xs) var(--spacing-sm);
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}

/* Color variants */
.success {
	color: var(--color-success-shade);
	background: var(--color-success-tint);
}
.success .dot {
	background: var(--color-success);
}

.danger {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
}
.danger .dot {
	background: var(--color-danger);
}

.warning {
	color: var(--color-warning-shade);
	background: var(--color-warning-tint);
}
.warning .dot {
	background: var(--color-warning);
}

.info {
	color: var(--color-info-shade);
	background: var(--color-info-tint);
}
.info .dot {
	background: var(--color-info);
}

.muted {
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
}
.muted .dot {
	background: var(--color-text-placeholder);
}

/* Pulse animation for running status */
@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.4;
	}
}

.warning .dot {
	animation: pulse 1.5s ease-in-out infinite;
}
</style>
