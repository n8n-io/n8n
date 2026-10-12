<script setup lang="ts">
import {
	hostEventIdentity,
	type AgentsChatHostEventItem,
} from '@/features/ai/shared/agentsChat/interactionRegistry';

defineProps<{ items: AgentsChatHostEventItem[] }>();
</script>

<template>
	<div v-if="items.length" :class="$style.hostEvents">
		<div
			v-for="item in items"
			:key="hostEventIdentity(item.event)"
			:class="$style.hostEvent"
			data-testid="agent-chat-host-event"
			:data-placement="item.placement"
		>
			<component :is="item.component" :event="item.event" :message="item.message" />
		</div>
	</div>
</template>

<style lang="scss" module>
.hostEvents {
	display: flex;
	flex-direction: column;
}

.hostEvent {
	margin-top: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}
</style>
