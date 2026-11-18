<script lang="ts" setup>
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

defineProps<{ saving?: boolean }>();

const emit = defineEmits<{
	close: [];
	save: [value: { name: string; description: string; content: string }];
}>();

const i18n = useI18n();
const name = ref('');
const description = ref('');
const content = ref('');

const canSave = computed(() => name.value.trim().length > 0 && content.value.trim().length > 0);

function onSave() {
	if (!canSave.value) return;
	emit('save', {
		name: name.value.trim(),
		description: description.value.trim(),
		content: content.value,
	});
}
</script>

<template>
	<N8nDialog
		open
		size="large"
		:header="i18n.baseText('mcpServers.textResource.title')"
		data-testid="mcp-server-text-resource-dialog"
		@update:open="!$event && emit('close')"
	>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nInputLabel :label="i18n.baseText('mcpServers.textResource.name')" required>
					<N8nInput
						v-model="name"
						:placeholder="i18n.baseText('mcpServers.textResource.namePlaceholder')"
						autofocus
						data-testid="mcp-server-text-resource-name"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('mcpServers.textResource.description')">
					<N8nInput
						v-model="description"
						:placeholder="i18n.baseText('mcpServers.textResource.descriptionPlaceholder')"
						data-testid="mcp-server-text-resource-description"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('mcpServers.textResource.content')" required>
					<N8nInput
						v-model="content"
						type="textarea"
						:rows="12"
						:class="$style.mono"
						:placeholder="i18n.baseText('mcpServers.textResource.contentPlaceholder')"
						data-testid="mcp-server-text-resource-content"
					/>
				</N8nInputLabel>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="ghost" @click="emit('close')">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				variant="brand"
				:disabled="!canSave"
				:loading="saving"
				data-testid="mcp-server-text-resource-save"
				@click="onSave"
			>
				{{ i18n.baseText('mcpServers.textResource.save') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.mono :global(textarea) {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}
</style>
