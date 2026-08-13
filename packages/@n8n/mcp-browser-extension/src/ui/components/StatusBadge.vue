<script setup lang="ts">
import { computed } from 'vue';
import type { ConnectionStatus } from '../../types';

const props = defineProps<{
	status: ConnectionStatus;
	tabCount: number;
}>();

const theme = computed(() => {
	const map: Record<ConnectionStatus, string> = {
		connected: 'success',
		connecting: 'warning',
		disconnected: 'danger',
	};
	return map[props.status];
});

const label = computed(() => {
	const map: Record<ConnectionStatus, string> = {
		connected: 'Connected',
		connecting: 'Connecting...',
		disconnected: 'Disconnected',
	};
	return map[props.status];
});
</script>

<template>
	<div :class="['status', `status--${theme}`]">
		<span class="status-dot" />
		<span>{{ label }}</span>
		<span v-if="status === 'connected'" class="tab-count"
			>{{ tabCount }} {{ tabCount === 1 ? 'tab' : 'tabs' }}</span
		>
	</div>
</template>

<style scoped lang="scss">
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	margin-bottom: var(--spacing--md);
	font-size: var(--font-size--sm);
}

.status--success {
	background: var(--background--success);
	color: var(--text-color--success);
}

.status--warning {
	background: var(--background--warning);
	color: var(--text-color--warning);
}

.status--danger {
	background: var(--background--danger);
	color: var(--text-color--danger);
}

.status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: currentcolor;
}

.tab-count {
	margin-left: auto;
	font-size: var(--font-size--2xs);
}
</style>
