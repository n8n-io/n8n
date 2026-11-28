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
	}>(),
	{
		revision: 0,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();
const input = useTemplateRef<{ blur?: () => void }>('input');
const draft = ref(props.modelValue);

watch([() => props.modelValue, () => props.revision], ([value]) => {
	draft.value = value;
});

function save() {
	const value = draft.value.trim();
	draft.value = value;
	if (value !== props.modelValue) emit('update:modelValue', value);
}

function cancel() {
	draft.value = props.modelValue;
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
			v-model="draft"
			type="textarea"
			:autosize="{ minRows: 3, maxRows: 10 }"
			:maxlength="MCP_SERVER_DESCRIPTION_MAX_LENGTH"
			:placeholder="i18n.baseText('mcpServers.server.description.placeholder')"
			:aria-label="i18n.baseText('mcpServers.server.description.title')"
			data-test-id="mcp-server-description-input"
			@blur="save"
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
