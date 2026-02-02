<script lang="ts" setup>
/**
 * Worker Mode Test View
 *
 * This view tests the CRDT Worker Mode which uses the Database Coordinator
 * SharedWorker instead of a server connection.
 *
 * In Worker Mode:
 * - The Coordinator SharedWorker holds CRDT documents in memory (source of truth)
 * - Documents are seeded from the REST API
 * - Handle computation happens in the SharedWorker
 * - Cross-tab sync happens via the SharedWorker
 * - No WebSocket connection to the server
 */
import CrdtTestContent from '../components/CrdtTestContent.vue';
import CrdtWorkflowProvider from '../components/CrdtWorkflowProvider.vue';

const props = defineProps<{
	name: string;
}>();

console.log('[Worker Mode] Loading workflow:', props.name);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<span :class="$style.badge">Worker Mode</span>
			<span :class="$style.title">CRDT Test - Local Only (No Server Sync)</span>
		</div>
		<CrdtWorkflowProvider :doc-id="props.name" transport="coordinator">
			<CrdtTestContent />
		</CrdtWorkflowProvider>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	overflow: auto;
	background-color: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--color--warning--tint-2);
	border-bottom: 1px solid var(--color--warning);
}

.badge {
	background-color: var(--color--warning);
	color: var(--color--text--shade-1);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
}

.title {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}
</style>
