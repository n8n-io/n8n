<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	AiqKnowledgeApiError,
	getAiqHealth,
	normalizeAiqBaseUrl,
} from '../composables/useAiqKnowledgeApi';

const props = defineProps<{
	modalName: string;
	data: {
		baseUrl?: string;
		onConfirm: (payload: { baseUrl: string }) => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const connecting = ref(false);
const baseUrl = ref(props.data.baseUrl ?? '');
const error = ref('');
const showForm = ref(false);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function openForm() {
	showForm.value = true;
	error.value = '';
}

async function connect() {
	const normalizedBaseUrl = normalizeAiqBaseUrl(baseUrl.value);
	if (!normalizedBaseUrl) {
		error.value = i18n.baseText('agents.builder.aiqConnection.baseUrlRequired');
		return;
	}

	connecting.value = true;
	error.value = '';
	try {
		await getAiqHealth(normalizedBaseUrl);
		props.data.onConfirm({ baseUrl: normalizedBaseUrl });
		closeModal();
	} catch (connectError) {
		if (connectError instanceof AiqKnowledgeApiError && connectError.status === 503) {
			error.value = i18n.baseText('agents.builder.aiqConnection.unavailable');
		} else {
			error.value = i18n.baseText('agents.builder.aiqConnection.connectionFailed');
		}
	} finally {
		connecting.value = false;
	}
}
</script>

<template>
	<Modal
		:name="props.modalName"
		width="880px"
		:custom-class="$style.modal"
		data-testid="agent-knowledge-connections-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.builder.aiqConnection.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div v-if="!showForm" :class="$style.list">
				<div :class="$style.row" data-testid="agent-aiq-connection-row">
					<div :class="$style.iconWrapper">
						<N8nIcon icon="brain" :size="32" :class="$style.icon" />
					</div>
					<div :class="$style.content">
						<N8nText size="small" color="text-dark" :class="$style.name">
							{{ i18n.baseText('agents.builder.aiqConnection.providerName') }}
						</N8nText>
						<N8nText size="small" color="text-light" :class="$style.description">
							{{ i18n.baseText('agents.builder.aiqConnection.providerDescription') }}
						</N8nText>
					</div>
					<N8nButton
						variant="subtle"
						size="small"
						data-testid="agent-aiq-connect"
						@click="openForm"
					>
						{{ i18n.baseText('agents.tools.connect') }}
					</N8nButton>
				</div>
			</div>

			<div v-else :class="$style.form">
				<N8nInput
					v-model="baseUrl"
					:placeholder="i18n.baseText('agents.builder.aiqConnection.baseUrlPlaceholder')"
					data-testid="agent-aiq-base-url-input"
					@keyup.enter="connect"
				/>
				<N8nText v-if="error" size="small" color="danger" data-testid="agent-aiq-connect-error">
					{{ error }}
				</N8nText>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					v-if="showForm"
					variant="solid"
					:loading="connecting"
					data-testid="agent-aiq-confirm-connect"
					@click="connect"
				>
					{{ i18n.baseText('agents.tools.connect') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.list,
.form {
	min-height: 240px;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon {
	color: var(--color--primary);
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.name,
.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.modal {
	:global(.modal-content) {
		overflow: hidden;
	}
}
</style>
