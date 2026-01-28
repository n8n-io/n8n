<script lang="ts" setup>
/**
 * Server Mode Test View
 *
 * This view tests the CRDT Server Mode which uses the Database Coordinator
 * SharedWorker as a proxy to a WebSocket server.
 *
 * In Server Mode:
 * - The Coordinator SharedWorker proxies messages to/from the WebSocket server
 * - The server holds CRDT documents in memory (source of truth)
 * - Handle computation happens on the server
 * - Cross-browser sync happens via the server
 * - Cross-tab sync still works via the coordinator's message broadcast
 */
import CrdtTestContent from '../components/CrdtTestContent.vue';
import CrdtWorkflowProvider from '../components/CrdtWorkflowProvider.vue';

const props = defineProps<{
	name: string;
}>();

console.log('[Server Mode] Loading workflow:', props.name);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<span :class="$style.badge">Server Mode</span>
			<span :class="$style.title">CRDT Test - WebSocket Server Sync</span>
		</div>
		<CrdtWorkflowProvider :doc-id="props.name" transport="coordinator-server">
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
	background-color: var(--color--success--tint-2);
	border-bottom: 1px solid var(--color--success);
}

.badge {
	background-color: var(--color--success);
	color: white;
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
