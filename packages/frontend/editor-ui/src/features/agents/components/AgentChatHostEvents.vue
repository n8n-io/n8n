<script setup lang="ts">
import {
	hostEventIdentity,
	type AgentsChatHostEventItem,
} from '@/features/ai/shared/agentsChat/interactionRegistry';

defineProps<{ items: AgentsChatHostEventItem[] }>();
</script>

<template>
	<div v-if="items.length">
		<div
			v-for="item in items"
			:key="hostEventIdentity(item.event)"
			data-testid="agent-chat-host-event"
			:data-placement="item.placement"
		>
			<component :is="item.component" :event="item.event" :message="item.message" />
		</div>
	</div>
</template>
