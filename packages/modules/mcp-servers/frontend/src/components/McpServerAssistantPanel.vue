<script setup lang="ts">
import type {
	InstanceAiMcpServerSubject,
	InstanceAiPrefillPayload,
	McpServerResponse,
} from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

import { listToolCandidates } from '../mcp-servers.api';

// The n8n Assistant beside the server page. The shell owns the chat. This component names the
// server and gives the welcome state of a new chat: an intro and one suggestion.
const props = defineProps<{
	server: McpServerResponse;
	/** The prompt that the page puts in the message input, for example from "Build with Assistant". */
	prefill?: InstanceAiPrefillPayload;
}>();

const emit = defineEmits<{
	close: [];
	/** A tool call of the Assistant changed the server. */
	changed: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const AssistantPanel = computed(() => componentRegistry.get('assistant-panel'));

const subject = computed<InstanceAiMcpServerSubject>(() => ({
	type: 'mcpServer',
	id: props.server.id,
	projectId: props.server.projectId,
	name: props.server.name,
}));

/** The latest text for the message input: the prompt of the page, or the suggestion. */
const composerPrefill = ref<InstanceAiPrefillPayload>();
watch(
	() => props.prefill,
	(value) => {
		if (value) composerPrefill.value = value;
	},
	{ immediate: true },
);

/** A workflow of the project that needs the trigger before it can be a tool. */
const workflowWithoutTrigger = ref<string>();
const candidatesLoaded = ref(false);

// One suggestion, with a positive action. Delete and block have no suggestion.
const suggestion = computed(() =>
	workflowWithoutTrigger.value
		? i18n.baseText('mcpServers.assistant.suggestion.addTrigger', {
				interpolate: { name: workflowWithoutTrigger.value },
			})
		: i18n.baseText('mcpServers.assistant.suggestion.addWorkflows'),
);

async function loadCandidates() {
	try {
		const candidates = await listToolCandidates(
			rootStore.restApiContext,
			props.server.projectId,
			props.server.id,
		);
		workflowWithoutTrigger.value = candidates.find(
			({ reason }) => reason === 'missing_trigger',
		)?.name;
	} catch {
		// The suggestion falls back to "Add the workflows that fit".
	} finally {
		candidatesLoaded.value = true;
	}
}

/** A change from the Assistant can add the trigger that the suggestion names. */
async function onSubjectChanged() {
	emit('changed');
	await loadCandidates();
}

function onSuggestion() {
	composerPrefill.value = { text: suggestion.value, prefillType: 'mcp_server_suggestion' };
}

onMounted(loadCandidates);
</script>

<template>
	<component
		:is="AssistantPanel"
		v-if="AssistantPanel"
		:subject="subject"
		:prefill="composerPrefill"
		data-test-id="mcp-assistant-panel"
		@subject-changed="onSubjectChanged"
		@close="emit('close')"
	>
		<template #subject>
			<div :class="$style.server" data-test-id="mcp-assistant-server">
				<N8nIcon icon="mcp" size="large" :class="$style.serverIcon" />
				<div :class="$style.serverText">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('mcpServers.assistant.server') }}
					</N8nText>
					<N8nText size="small" bold data-test-id="mcp-assistant-server-name">
						{{ server.name }}
					</N8nText>
				</div>
			</div>
		</template>
		<template #empty>
			<div :class="$style.intro">
				<N8nText size="small" color="text-light" data-test-id="mcp-assistant-intro">
					{{ i18n.baseText('mcpServers.assistant.intro') }}
				</N8nText>
				<button
					v-if="candidatesLoaded"
					type="button"
					:class="$style.suggestion"
					data-test-id="mcp-assistant-suggestion"
					data-attr="mcp-assistant-suggestion"
					@click="onSuggestion"
				>
					<N8nIcon icon="sparkles" size="small" :class="$style.suggestionIcon" />
					<N8nText size="small">{{ suggestion }}</N8nText>
				</button>
			</div>
		</template>
	</component>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.server {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.serverIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.serverText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}

.suggestion {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	@include focus.focus-visible-ring;
}

.suggestionIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--text-color--subtle);
}
</style>
