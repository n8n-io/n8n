<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { MCP_SERVER_NAME_MAX_LENGTH } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';

// Rename changes only the name. The slug never changes, so the URL stays the same.
const props = defineProps<{
	name: string;
	url: string;
	saving?: boolean;
}>();

const emit = defineEmits<{
	rename: [name: string];
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const value = ref('');
const nameInput = useTemplateRef<{ focus: () => void; select: () => void }>('nameInput');

const canRename = computed(() => {
	const trimmed = value.value.trim();
	return trimmed !== '' && trimmed !== props.name && !props.saving;
});

watch(
	open,
	(isOpen) => {
		if (isOpen) value.value = props.name;
	},
	{ immediate: true },
);

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	nameInput.value?.focus();
	nameInput.value?.select();
}

function onRename() {
	if (canRename.value) emit('rename', value.value.trim());
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('mcpServers.rename.title')"
		:aria-description="i18n.baseText('mcpServers.rename.ariaDescription')"
		size="small"
		data-test-id="rename-mcp-server-dialog"
		@update:open="(value: boolean) => !saving && (open = value)"
		@open-auto-focus="onOpenAutoFocus"
	>
		<N8nDialogBody>
			<N8nInputLabel
				:label="i18n.baseText('mcpServers.rename.name')"
				:bold="false"
				size="small"
				input-name="rename-mcp-server-name"
			>
				<N8nInput
					id="rename-mcp-server-name"
					ref="nameInput"
					v-model="value"
					:maxlength="MCP_SERVER_NAME_MAX_LENGTH"
					data-test-id="rename-mcp-server-name"
					@keydown.enter="onRename"
				/>
			</N8nInputLabel>
			<N8nText size="small" color="text-light" tag="p" :class="$style.helper">
				{{ i18n.baseText('mcpServers.rename.urlHint', { interpolate: { url } }) }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="ghost"
				:label="i18n.baseText('generic.cancel')"
				:disabled="saving"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('mcpServers.rename.submit')"
				:disabled="!canRename"
				:loading="saving"
				data-test-id="rename-mcp-server-submit"
				@click="onRename"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.helper {
	margin-top: var(--spacing--2xs);
	word-break: break-all;
}
</style>
