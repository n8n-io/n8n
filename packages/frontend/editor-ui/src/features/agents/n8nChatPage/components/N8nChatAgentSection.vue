<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { AGENT_N8N_CHAT_LIBRARY_VIEW } from '../../constants';
import { useN8nChatAgents } from '../composables/useN8nChatAgents';
import N8nChatAgentGrid from './N8nChatAgentGrid.vue';

// Only the top agents by usage, enough for one two-column row of 6 — "View all"
// below links to the full, searchable library for the rest.
const PAGE_SIZE = 6;

const i18n = useI18n();

const { agents, count, isLoading, loadFailed } = useN8nChatAgents({
	query: '',
	page: 1,
	pageSize: PAGE_SIZE,
});

const showViewAll = computed(() => count.value > PAGE_SIZE);
// Stays mounted through loading (skeletons), hides once loading ends with
// nothing to show — no agents at all, or the request failed.
const showSection = computed(
	() => !loadFailed.value && (isLoading.value || agents.value.length > 0),
);
</script>

<template>
	<div v-if="showSection" :class="$style.section" data-test-id="n8n-chat-agent-section">
		<div :class="$style.header">
			<N8nText tag="h2" size="large" bold>
				{{ i18n.baseText('agents.n8nChatPage.chooseAgent') }}
			</N8nText>
			<RouterLink
				v-if="showViewAll"
				:to="{ name: AGENT_N8N_CHAT_LIBRARY_VIEW }"
				:class="$style.viewAll"
				data-test-id="n8n-chat-agent-section-view-all"
			>
				{{ i18n.baseText('agents.n8nChatPage.viewAllAgents') }}
				<N8nIcon icon="chevron-right" size="small" />
			</RouterLink>
		</div>

		<N8nChatAgentGrid :agents="agents" :loading="isLoading" source="card" />
	</div>
</template>

<style lang="scss" module>
.section {
	width: 100%;
	max-width: 680px;
	margin-top: var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.viewAll {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtle);
	text-decoration: none;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
