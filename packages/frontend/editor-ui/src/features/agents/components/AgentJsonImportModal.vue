<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { AgentJsonConfigSchema } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentJsonConfig } from '../types';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	modalName: string;
	data: { onConfirm: (config: AgentJsonConfig) => void | Promise<void> };
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const parsedConfig = ref<AgentJsonConfig | null>(null);
const errorMessage = ref('');
const importing = ref(false);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

function resetImportState() {
	parsedConfig.value = null;
	errorMessage.value = '';
	if (fileInput.value) {
		fileInput.value.value = '';
	}
}

function closeModal() {
	resetImportState();
	uiStore.closeModal(props.modalName);
}

async function onFileChange(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;

	const file = input.files?.[0];
	parsedConfig.value = null;
	errorMessage.value = '';
	if (!file) return;

	try {
		const parsed = JSON.parse(await file.text()) as unknown;
		const result = AgentJsonConfigSchema.safeParse(parsed);
		if (!result.success) {
			throw new Error('Invalid agent JSON');
		}
		parsedConfig.value = result.data;
	} catch {
		errorMessage.value = i18n.baseText('agents.builder.importJsonModal.invalidJson' as BaseTextKey);
	}
}

async function onConfirm() {
	if (!parsedConfig.value || importing.value) return;

	importing.value = true;
	try {
		await props.data.onConfirm(parsedConfig.value);
		closeModal();
	} finally {
		importing.value = false;
	}
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.builder.importJsonModal.title' as BaseTextKey)"
		:busy="importing"
		size="large"
		data-testid="agent-json-import-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.importJsonModal.description' as BaseTextKey) }}
			</N8nText>

			<label :class="$style.fileField">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.builder.importJsonModal.fileLabel' as BaseTextKey) }}
				</N8nText>
				<input
					ref="fileInput"
					type="file"
					accept="application/json,.json"
					data-testid="agent-json-import-file-input"
					@change="onFileChange"
				/>
			</label>

			<N8nCallout v-if="errorMessage" theme="danger" data-testid="agent-json-import-error">
				{{ errorMessage }}
			</N8nCallout>
		</div>

		<template #footerActions>
			<N8nButton
				:label="i18n.baseText('agents.builder.importJsonModal.import' as BaseTextKey)"
				:disabled="!parsedConfig || importing"
				:loading="importing"
				data-testid="agent-json-import-confirm"
				@click="onConfirm"
			/>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.fileField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
