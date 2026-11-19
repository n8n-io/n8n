<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

import type { AgentToolCallRouteItem } from '../toolCallSimulation.types';
import AgentToolCallRouteRow from './AgentToolCallRouteRow.vue';
import WouldHaveHappenedPreview from './testRun/WouldHaveHappenedPreview.vue';
import type { WouldHaveHappenedPreviewInput } from './testRun/wouldHaveHappened.types';

/** Presentational only. The caller must confirm that this is a simulated test run. */
const props = defineProps<{
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
const nameId = useId();
/** Trimmed once, so the action's visibility and the emitted ID always agree. */
const openableTestChatId = computed(() => props.testChatId?.trim() ?? '');
</script>

<template>
	<section
		:class="$style.card"
		:aria-labelledby="nameId"
		data-test-id="agent-assistant-test-run-card"
	>
		<div :class="$style.header">
			<N8nText :id="nameId" tag="strong" size="small" bold :class="$style.name">
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
				v-if="openableTestChatId"
				variant="ghost"
				size="small"
				@click="emit('openTestChat', openableTestChatId)"
			>
				{{ i18n.baseText('agents.assistantTestRun.openChat') }}
			</N8nButton>
		</div>
		<div :id="detailsId" :hidden="!expanded" :class="$style.details">
			<N8nText v-if="calls.length === 0" size="small" color="text-light">
				{{ i18n.baseText('agents.assistantTestRun.noCalls') }}
			</N8nText>
			<ul v-else :class="$style.calls" data-test-id="agent-assistant-test-run-calls">
				<li
					v-for="call in calls"
					:key="call.toolCallId"
					:class="$style.call"
					:data-tool-call-id="call.toolCallId"
				>
					<AgentToolCallRouteRow :call="call" />
					<WouldHaveHappenedPreview
						v-if="
							call.preview &&
							(call.simulation?.route === 'simulated' ||
								call.simulation?.route === 'simulated_made_up')
						"
						:preview="call.preview"
					/>
				</li>
			</ul>
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

.calls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
	min-width: 0;
}

.call {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
