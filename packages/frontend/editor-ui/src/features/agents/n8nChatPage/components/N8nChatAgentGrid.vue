<script setup lang="ts">
import { ref } from 'vue';
import type { AgentChatListItem } from '@n8n/api-types';

import type { N8nChatAgentSource } from '../../composables/useAgentTelemetry';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
import N8nChatAgentCard from './N8nChatAgentCard.vue';
import N8nChatMakeAvailableModal from './N8nChatMakeAvailableModal.vue';

withDefaults(
	defineProps<{
		agents: AgentChatListItem[];
		loading?: boolean;
		source: N8nChatAgentSource;
		/** Puts an n8n Assistant card before the agents. */
		includeAssistant?: boolean;
	}>(),
	{ loading: false, includeAssistant: false },
);

const emit = defineEmits<{
	'agent-made-available': [];
}>();

const SKELETON_CARD_COUNT = 6;

const agentToMakeAvailable = ref<AgentChatListItem | null>(null);

function onAvailable(): void {
	agentToMakeAvailable.value = null;
	emit('agent-made-available');
}
</script>

<template>
	<div :class="$style.grid" data-test-id="n8n-chat-agent-grid">
		<template v-if="loading">
			<SkeletonAgentCard
				v-for="i in SKELETON_CARD_COUNT"
				:key="i"
				:show-action-button="false"
				:class="$style.skeletonCard"
			/>
		</template>
		<template v-else>
			<N8nChatAgentCard v-if="includeAssistant" :agent="null" :source="source" />
			<N8nChatAgentCard
				v-for="agent in agents"
				:key="agent.id"
				:agent="agent"
				:source="source"
				@make-available="agentToMakeAvailable = $event"
			/>
		</template>
		<N8nChatMakeAvailableModal
			v-if="agentToMakeAvailable"
			:agent="agentToMakeAvailable"
			@close="agentToMakeAvailable = null"
			@available="onAvailable"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--sm);
}

@include breakpoints.breakpoint('sm-and-down') {
	.grid {
		grid-template-columns: 1fr;
	}
}

// Matches `N8nChatAgentCard`'s 40px `AgentPersonalisationIcon`, bigger than
// chatHub's own 24px skeleton avatar.
.skeletonCard {
	--skeleton-agent-card-avatar-size: 40px;
}
</style>
