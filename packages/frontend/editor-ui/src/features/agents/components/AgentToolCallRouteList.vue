<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

import type { AgentToolCallRouteItem } from '../toolCallSimulation.types';
import AgentToolCallBlockedNote from './AgentToolCallBlockedNote.vue';
import AgentToolCallRouteLabel from './AgentToolCallRouteLabel.vue';

/**
 * The tool calls of one turn in a test run, each with how it ran.
 * Blocked calls also get a note on why and what to do next.
 */
defineProps<{
	calls: AgentToolCallRouteItem[];
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
			<div :class="$style.row">
				<N8nText
					size="small"
					:class="$style.toolName"
					:title="call.toolName"
					data-test-id="agent-tool-call-route-tool-name"
				>
					{{ call.toolName }}
				</N8nText>
				<AgentToolCallRouteLabel
					v-if="call.simulation"
					:class="$style.label"
					:simulation="call.simulation"
				/>
			</div>
			<AgentToolCallBlockedNote v-if="call.simulation" :simulation="call.simulation" />
		</li>
	</ul>
</template>

<style module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.toolName {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
}

.label {
	flex-shrink: 0;
}
</style>
