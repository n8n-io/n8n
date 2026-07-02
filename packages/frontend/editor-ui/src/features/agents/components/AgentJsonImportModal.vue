<script setup lang="ts">
import { ref } from 'vue';
import { AgentJsonConfigSchema } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentJsonConfig } from '../types';

export type AgentJsonImportModalData = {
	onConfirm: (config: AgentJsonConfig) => void | Promise<void>;
};

const props = defineProps<{
	modalName: string;
	data: AgentJsonImportModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const selectedFileName = ref('');
const parsedConfig = ref<AgentJsonConfig | null>(null);
const errorMessage = ref('');
const importing = ref(false);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function readFileText(file: File): Promise<string> {
	if (typeof file.text === 'function') {
		return await file.text();
	}

	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(typeof reader.result === 'string' ? reader.result : '');
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

async function onFileChange(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;

	const file = input.files?.[0];
	selectedFileName.value = file?.name ?? '';
	parsedConfig.value = null;
	errorMessage.value = '';
	if (!file) return;

	try {
		const parsed = JSON.parse(await readFileText(file)) as unknown;
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
	<Modal
		:name="props.modalName"
		width="520px"
		:custom-class="$style.modal"
		data-testid="agent-json-import-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.builder.importJsonModal.title' as BaseTextKey) }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.importJsonModal.description' as BaseTextKey) }}
				</N8nText>

				<label :class="$style.fileField">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.importJsonModal.fileLabel' as BaseTextKey) }}
					</N8nText>
					<input
						type="file"
						accept="application/json,.json"
						data-testid="agent-json-import-file-input"
						@change="onFileChange"
					/>
				</label>

				<N8nText v-if="selectedFileName && !errorMessage" size="small" color="text-light">
					{{ selectedFileName }}
				</N8nText>

				<N8nCallout v-if="errorMessage" theme="danger" data-testid="agent-json-import-error">
					{{ errorMessage }}
				</N8nCallout>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!parsedConfig || importing"
					data-testid="agent-json-import-confirm"
					@click="onConfirm"
				>
					{{ i18n.baseText('agents.builder.importJsonModal.import' as BaseTextKey) }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.modal {
	:global(.modal-content) {
		display: flex;
		flex-direction: column;
	}
}

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

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
