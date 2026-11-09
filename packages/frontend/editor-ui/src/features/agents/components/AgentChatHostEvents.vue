<script setup lang="ts">
import { HOST_EVENT_PLACEMENT } from '@/features/ai/shared/agentsChat/constants';
import {
	hostEventIdentity,
	type AgentsChatHostEventItem,
} from '@/features/ai/shared/agentsChat/interactionRegistry';

defineProps<{ items: AgentsChatHostEventItem[] }>();
</script>

<template>
	<div v-if="items.length" :class="$style.events">
		<div
			v-for="item in items"
			:key="hostEventIdentity(item.event)"
			data-testid="agent-chat-host-event"
			:data-placement="item.placement"
			:class="{ [$style.start]: item.placement === HOST_EVENT_PLACEMENT.START }"
		>
			<component :is="item.component" :event="item.event" :message="item.message" />
		</div>
	</div>
</template>

<style module>
/* Each event is a child of the parent layout, such as the gap of the thinking block. */
.events {
	display: contents;
}

/* The same gap as below the tool steps, so a start event does not touch the text. */
.start {
	margin-bottom: var(--spacing--sm);
}
</style>
