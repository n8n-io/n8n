<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, useId } from 'vue';

import type { AgentToolCallRouteItem } from '../toolCallSimulation.types';
import AgentToolCallRouteList from './AgentToolCallRouteList.vue';
import WouldHaveHappenedPreview from './testRun/WouldHaveHappenedPreview.vue';
import type { WouldHaveHappenedPreviewInput } from './testRun/wouldHaveHappened.types';

/** Presentational only. The caller must confirm that this is a simulated test run. */
defineProps<{
	agentName: string;
	calls: Array<AgentToolCallRouteItem & { preview?: WouldHaveHappenedPreviewInput }>;
	/** Omit until the caller has a saved test chat to open. */
	testChatId?: string;
}>();

const emit = defineEmits<{
	openTestChat: [testChatId: string];
}>();

const i18n = useI18n();
const expanded = ref(false);
const detailsId = useId();
</script>

<template>
	<section :class="$style.card" data-test-id="agent-assistant-test-run-card">
		<div :class="$style.header">
			<N8nText tag="strong" size="small" bold :class="$style.name">
				{{ agentName }}
			</N8nText>
			<N8nBadge theme="tertiary">
				{{ i18n.baseText('agents.assistantTestRun.badge') }}
			</N8nBadge>
		</div>
		<div :class="$style.actions">
			<N8nButton
				variant="ghost"
				size="small"
				:aria-expanded="expanded"
				:aria-controls="detailsId"
				@click="expanded = !expanded"
			>
				<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
				{{ i18n.baseText('agents.assistantTestRun.details') }}
			</N8nButton>
			<N8nButton
				v-if="testChatId?.trim()"
				variant="ghost"
				size="small"
				@click="emit('openTestChat', testChatId)"
			>
				{{ i18n.baseText('agents.assistantTestRun.openChat') }}
			</N8nButton>
		</div>
		<div :id="detailsId" :hidden="!expanded" :class="$style.details">
			<N8nText v-if="calls.length === 0" size="small" color="text-light">
				{{ i18n.baseText('agents.assistantTestRun.noCalls') }}
			</N8nText>
			<template v-else>
				<div v-for="call in calls" :key="call.toolCallId" :class="$style.call">
					<AgentToolCallRouteList :calls="[call]" />
					<WouldHaveHappenedPreview
						v-if="
							call.preview &&
							(call.simulation?.route === 'simulated' ||
								call.simulation?.route === 'simulated_made_up')
						"
						:preview="call.preview"
					/>
				</div>
			</template>
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

.call {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
