<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

import type { AgentAssistantTestRunCall } from '@/features/agents/assistantTestRun.types';
import AgentToolCallRouteList from '@/features/agents/components/AgentToolCallRouteList.vue';
import WouldHaveHappenedPreview from '@/features/agents/components/testRun/WouldHaveHappenedPreview.vue';

/** Presentational only. The caller must confirm that this is a simulated test run. */
const props = defineProps<{
	agentName: string;
	calls: AgentAssistantTestRunCall[];
	/** Omit until the caller has a saved test chat to open. */
	testChatId?: string;
}>();

const emit = defineEmits<{
	openTestChat: [testChatId: string];
}>();

const i18n = useI18n();
const expanded = ref(false);
const detailsId = useId();
const nameId = useId();
const badgeId = useId();

/**
 * A preview may only show for a simulated call. Each preview travels on its own call
 * object, and the caller pairs them by tool call ID (TRUST-1196). The tool name check is
 * a backstop that hides a preview attached to a different tool.
 */
function showsPreview(call: AgentAssistantTestRunCall): call is AgentAssistantTestRunCall & {
	preview: NonNullable<AgentAssistantTestRunCall['preview']>;
} {
	const route = call.simulation?.route;
	// Also false for `preview: null`, which JSON payloads often carry.
	return (
		(route === 'simulated' || route === 'simulated_made_up') &&
		call.preview?.toolName === call.toolName
	);
}

/** Trimmed once, so the action's visibility and the emitted ID always agree. */
const openableTestChatId = computed(() => props.testChatId?.trim() ?? '');
</script>

<template>
	<section
		:class="$style.card"
		:aria-labelledby="`${nameId} ${badgeId}`"
		data-test-id="agent-assistant-test-run-card"
	>
		<div :class="$style.header">
			<N8nText :id="nameId" tag="strong" size="small" bold :class="$style.name">
				{{ agentName }}
			</N8nText>
			<N8nBadge :id="badgeId" theme="tertiary">
				{{ i18n.baseText('agents.assistantTestRun.badge') }}
			</N8nBadge>
		</div>
		<div :class="$style.actions">
			<N8nButton
				variant="ghost"
				size="small"
				:aria-expanded="expanded"
				:aria-controls="detailsId"
				data-test-id="agent-assistant-test-run-toggle"
				@click="expanded = !expanded"
			>
				<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
				{{ i18n.baseText('agents.assistantTestRun.details') }}
			</N8nButton>
			<N8nButton
				v-if="openableTestChatId"
				variant="ghost"
				size="small"
				data-test-id="agent-assistant-test-run-open-chat"
				data-attr="agent-assistant-test-run-open-chat"
				@click="emit('openTestChat', openableTestChatId)"
			>
				{{ i18n.baseText('agents.assistantTestRun.openChat') }}
			</N8nButton>
		</div>
		<div :id="detailsId" :hidden="!expanded" :class="$style.details">
			<N8nText v-if="calls.length === 0" size="small" color="text-light">
				{{ i18n.baseText('agents.assistantTestRun.noCalls') }}
			</N8nText>
			<AgentToolCallRouteList v-else :calls="calls">
				<template #after="{ call }">
					<WouldHaveHappenedPreview v-if="showsPreview(call)" :preview="call.preview" />
				</template>
			</AgentToolCallRouteList>
		</div>
	</section>
</template>

<style module>
.card {
	min-width: 0;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.name {
	min-width: 0;
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
}

.details:not([hidden]) {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}
</style>
