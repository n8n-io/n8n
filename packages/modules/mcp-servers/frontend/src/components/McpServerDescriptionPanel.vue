<script setup lang="ts">
import { MCP_SERVER_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, useTemplateRef, watch } from 'vue';

import McpServerPanel from './McpServerPanel.vue';

// Multi-line description editor in the Build tab. AI clients receive this text as MCP instructions.
const props = withDefaults(
	defineProps<{
		modelValue: string;
		canUpdate: boolean;
		/** Incremented by the parent when a save fails, to restore the saved text. */
		revision?: number;
		/** True while the latest description save is in flight. */
		saving?: boolean;
	}>(),
	{
		revision: 0,
		saving: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();
const input = useTemplateRef<{ blur?: () => void }>('input');
const draft = ref(props.modelValue);
/** True only after user input until the edit is saved or cancelled; focus alone stays synced. */
const editing = ref(false);
/** The latest value submitted to the parent; reset when the parent updates or reports a failure. */
let lastSubmitted = props.modelValue;
/** Latest external `modelValue` that arrived while the builder had unsaved edits. */
let pendingExternalValue: string | null = null;

watch([() => props.modelValue, () => props.saving], ([value, saving], [previousValue]) => {
	if (editing.value) {
		if (value !== previousValue) pendingExternalValue = value;
		return;
	}
	if (saving) return;
	draft.value = value;
	lastSubmitted = value;
	pendingExternalValue = null;
});

watch(
	() => props.revision,
	() => {
		lastSubmitted = props.modelValue;
		pendingExternalValue = null;
		if (!editing.value) draft.value = props.modelValue;
	},
);

function onInput(value: string | number) {
	draft.value = String(value);
	editing.value = true;
}

function save() {
	editing.value = false;
	const value = draft.value.trim();
	draft.value = value;
	if (value === lastSubmitted) {
		if (pendingExternalValue !== null) {
			draft.value = pendingExternalValue;
			lastSubmitted = pendingExternalValue;
			pendingExternalValue = null;
		}
		return;
	}
	if (pendingExternalValue !== null && value === pendingExternalValue) {
		lastSubmitted = pendingExternalValue;
		pendingExternalValue = null;
		return;
	}
	pendingExternalValue = null;
	lastSubmitted = value;
	emit('update:modelValue', value);
}

function onBlur() {
	if (!editing.value) return;
	save();
}

function cancel() {
	editing.value = false;
	pendingExternalValue = null;
	draft.value = props.modelValue;
	lastSubmitted = props.modelValue;
	input.value?.blur?.();
}
</script>

<template>
	<McpServerPanel
		:header="i18n.baseText('mcpServers.server.description.title')"
		:description="i18n.baseText('mcpServers.server.description.hint')"
		data-test-id="mcp-server-description-panel"
	>
		<N8nInput
			v-if="canUpdate"
			ref="input"
			:model-value="draft"
			type="textarea"
			:autosize="{ minRows: 3, maxRows: 10 }"
			:maxlength="MCP_SERVER_DESCRIPTION_MAX_LENGTH"
			:placeholder="i18n.baseText('mcpServers.server.description.placeholder')"
			:aria-label="i18n.baseText('mcpServers.server.description.title')"
			data-test-id="mcp-server-description-input"
			@update:model-value="onInput"
			@blur="onBlur"
			@keydown.esc.stop="cancel"
			@keydown.enter.meta.prevent="save"
			@keydown.enter.ctrl.prevent="save"
		/>
		<N8nText
			v-else
			size="small"
			:color="modelValue ? 'text-dark' : 'text-light'"
			:class="$style.readonly"
			data-test-id="mcp-server-description-readonly"
		>
			{{ modelValue || i18n.baseText('mcpServers.card.noDescription') }}
		</N8nText>
	</McpServerPanel>
</template>

<style lang="scss" module>
.readonly {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
