<script setup lang="ts">
import type { InstanceAiPrefillPayload } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { listToolCandidates } from '@n8n/frontend-module-mcp-servers';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

/**
 * Welcome state of a new Assistant thread started on a custom MCP server:
 * a positive intro and one suggestion (fix a missing trigger or add fitting workflows).
 */
const props = defineProps<{
	projectId: string;
	serverId: string;
}>();

const emit = defineEmits<{
	select: [prefill: InstanceAiPrefillPayload];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

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
	const isLatest = latestFetch.next();
	workflowWithoutTrigger.value = undefined;
	candidatesLoaded.value = false;
	try {
		const candidates = await listToolCandidates(
			rootStore.restApiContext,
			props.projectId,
			props.serverId,
		);
		if (!isLatest()) return;
		workflowWithoutTrigger.value = candidates.find(
			({ reason }) => reason === 'missing_trigger',
		)?.name;
	} catch {
		// The suggestion falls back to "Add the workflows that fit".
	} finally {
		if (isLatest()) candidatesLoaded.value = true;
	}
}

watch([() => props.projectId, () => props.serverId], loadCandidates, { immediate: true });

function onSuggestion() {
	emit('select', { text: suggestion.value, prefillType: 'mcp_server_suggestion' });
}
</script>

<template>
	<div :class="$style.intro" data-test-id="mcp-server-assistant-empty-state">
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

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

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
