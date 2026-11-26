<script setup lang="ts" generic="T extends AgentToolCallRouteItem">
import type { AgentToolCallRouteItem } from '../toolCallSimulation.types';
import AgentToolCallRouteRow from './AgentToolCallRouteRow.vue';

/**
 * The tool calls of one turn in a test run. Each row shows how the call ran as an icon
 * and expands to explain why.
 */
defineProps<{
	calls: T[];
}>();

defineSlots<{
	/** Extra content under a call's row, such as what it would have done. */
	after?: (props: { call: T }) => unknown;
}>();
</script>

<template>
	<ul :class="$style.list" data-test-id="agent-tool-call-route-list">
		<li
			v-for="call in calls"
			:key="call.toolCallId"
			:class="$style.item"
			:data-tool-call-id="call.toolCallId"
			data-test-id="agent-tool-call-route-item"
		>
			<AgentToolCallRouteRow :call="call" />
			<slot name="after" :call="call" />
		</li>
	</ul>
</template>

<style module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
	min-width: 0;
}

.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
