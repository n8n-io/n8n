<script setup lang="ts">
import { ref, computed } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useAIAssistantStore } from '@/stores/aiAssistant.store';
import { useToast } from '@/composables/useToast';

const emit = defineEmits<{
	close: [];
}>();

const modalBus = createEventBus();
const aiAssistantStore = useAIAssistantStore();
const toast = useToast();

const baseUrl = ref(aiAssistantStore.ollamaConfig.baseUrl);
const model = ref(aiAssistantStore.ollamaConfig.model);
const isTesting = ref(false);
const testResult = ref<'success' | 'error' | null>(null);

const hasChanges = computed(() => {
	return (
		baseUrl.value !== aiAssistantStore.ollamaConfig.baseUrl ||
		model.value !== aiAssistantStore.ollamaConfig.model
	);
});

const isValidUrl = computed(() => {
	try {
		const url = new URL(baseUrl.value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
});

const isValidModel = computed(() => {
	return model.value.length >= 2 && model.value.length <= 50;
});

const canSave = computed(() => {
	return hasChanges.value && isValidUrl.value && isValidModel.value && testResult.value === 'success';
});

async function testConnection() {
	if (!isValidUrl.value) {
		toast.showError({
			title: 'Invalid URL',
			message: 'Please enter a valid HTTP or HTTPS URL',
		});
		return;
	}

	isTesting.value = true;
	testResult.value = null;

	try {
		// Test connection to Ollama server
		const response = await fetch(`${baseUrl.value}/api/tags`, {
			method: 'GET',
		});

		if (response.ok) {
			testResult.value = 'success';
			toast.showMessage({
				title: 'Connection Successful',
				message: 'Successfully connected to Ollama server',
				type: 'success',
			});
		} else {
			throw new Error(`Server returned ${response.status}`);
		}
	} catch (error) {
		testResult.value = 'error';
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		toast.showError({
			title: 'Connection Failed',
			message: `Cannot connect to Ollama server: ${errorMessage}`,
		});
	} finally {
		isTesting.value = false;
	}
}

function handleSave() {
	if (!canSave.value) return;

	aiAssistantStore.updateOllamaConfig({
		baseUrl: baseUrl.value,
		model: model.value,
	});

	toast.showMessage({
		title: 'Settings Saved',
		message: 'Ollama settings have been saved',
		type: 'success',
	});

	closeDialog();
}

function handleCancel() {
	closeDialog();
}

function closeDialog() {
	modalBus.emit('close');
	emit('close');
}
</script>

<template>
	<Modal
		:name="'aiAssistantSettings'"
		:title="'AI Assistant Settings'"
		:event-bus="modalBus"
		width="500px"
		@enter="handleSave"
	>
		<template #content>
			<div :class="$style.container">
				<div :class="$style.section">
					<N8nText :class="$style.sectionTitle" bold size="medium">
						Ollama Configuration
					</N8nText>
					<N8nText :class="$style.sectionDescription" color="text-light" size="small">
						Configure your local Ollama server connection
					</N8nText>
				</div>

				<div :class="$style.formGroup">
					<label :class="$style.label">
						<N8nText bold size="small">Ollama Server URL</N8nText>
					</label>
					<N8nInput
						v-model="baseUrl"
						:class="$style.input"
						placeholder="http://localhost:11434"
						type="text"
					/>
					<N8nText :class="$style.helpText" color="text-light" size="xsmall">
						URL of your local Ollama server
					</N8nText>
					<N8nText
						v-if="baseUrl && !isValidUrl"
						:class="$style.errorText"
						color="danger"
						size="xsmall"
					>
						Please enter a valid HTTP or HTTPS URL
					</N8nText>
				</div>

				<div :class="$style.formGroup">
					<label :class="$style.label">
						<N8nText bold size="small">Model</N8nText>
					</label>
					<N8nInput
						v-model="model"
						:class="$style.input"
						placeholder="codellama"
						type="text"
					/>
					<N8nText :class="$style.helpText" color="text-light" size="xsmall">
						Name of the Ollama model to use (e.g., codellama, llama2)
					</N8nText>
					<N8nText
						v-if="model && !isValidModel"
						:class="$style.errorText"
						color="danger"
						size="xsmall"
					>
						Model name must be between 2 and 50 characters
					</N8nText>
				</div>

				<div :class="$style.testSection">
					<N8nButton
						:disabled="!isValidUrl || isTesting"
						:loading="isTesting"
						type="secondary"
						@click="testConnection"
					>
						{{ isTesting ? 'Testing...' : 'Test Connection' }}
					</N8nButton>

					<div v-if="testResult === 'success'" :class="$style.testSuccess">
						<N8nText color="success" size="small">✓ Connection successful</N8nText>
					</div>
					<div v-if="testResult === 'error'" :class="$style.testError">
						<N8nText color="danger" size="small">✗ Connection failed</N8nText>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nButton type="tertiary" @click="handleCancel">Cancel</N8nButton>
			<N8nButton
				:disabled="!canSave"
				type="primary"
				@click="handleSave"
			>
				Save
			</N8nButton>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.sectionTitle {
	font-size: 13px;
}

.sectionDescription {
	font-size: 12px;
}

.formGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.label {
	display: block;
	margin-bottom: var(--spacing-3xs);
}

.input {
	width: 100%;
}

.helpText {
	font-size: 11px;
	margin-top: -2px;
}

.errorText {
	font-size: 11px;
	margin-top: -2px;
}

.testSection {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	padding-top: var(--spacing-xs);
}

.testSuccess {
	display: flex;
	align-items: center;
}

.testError {
	display: flex;
	align-items: center;
}
</style>
