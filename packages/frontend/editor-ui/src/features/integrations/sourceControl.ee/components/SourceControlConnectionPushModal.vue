<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nBadge, N8nButton, N8nHeading, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';

import { useSourceControlConnectionsStore } from '../sourceControlConnections.store';
import type { ConnectionStatusFile } from '../sourceControlConnections.types';

const props = defineProps<{
	modalName: string;
	data: {
		connectionId: string;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const connectionsStore = useSourceControlConnectionsStore();

const isLoading = ref(true);
const isPushing = ref(false);
const files = ref<ConnectionStatusFile[]>([]);
const branchName = ref('');
const commitMessage = ref('');

const connection = computed(() =>
	connectionsStore.connections.find((c) => c.id === props.data.connectionId),
);

const statusTheme = (status: ConnectionStatusFile['status']) =>
	status === 'A' ? 'success' : status === 'D' ? 'danger' : 'warning';

onMounted(async () => {
	try {
		const status = await connectionsStore.getStatus(props.data.connectionId);
		files.value = status.files;
		branchName.value = status.branchName;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sourceControl.connections.modal.status.error'));
	} finally {
		isLoading.value = false;
	}
});

function close() {
	uiStore.closeModal(props.modalName);
}

async function onPush() {
	isPushing.value = true;
	try {
		await connectionsStore.push(props.data.connectionId, commitMessage.value);
		toast.showMessage({
			title: i18n.baseText('settings.sourceControl.connections.modal.push.success'),
			type: 'success',
		});
		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sourceControl.connections.modal.push.error'));
	}
	isPushing.value = false;
}
</script>

<template>
	<Modal :name="modalName" width="600px" @close="close">
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.connections.modal.push.title') }}
			</N8nHeading>
			<N8nText v-if="connection" size="small" color="text-light">
				{{ connection.repositoryUrl }} → {{ branchName || connection.branchName }}
			</N8nText>
		</template>
		<template #content>
			<div v-if="isLoading" :class="$style.loading">
				<N8nSpinner />
			</div>
			<div v-else>
				<N8nText v-if="files.length === 0" color="text-light">
					{{ i18n.baseText('settings.sourceControl.connections.modal.noChanges') }}
				</N8nText>
				<div v-else :class="$style.fileList" data-test-id="source-control-connection-push-files">
					<div v-for="file in files" :key="file.path" :class="$style.fileRow">
						<N8nBadge :theme="statusTheme(file.status)">{{ file.status }}</N8nBadge>
						<N8nText size="small">{{ file.path }}</N8nText>
					</div>
				</div>
				<div :class="$style.commitMessage">
					<N8nInput
						v-model="commitMessage"
						type="text"
						:placeholder="
							i18n.baseText('settings.sourceControl.connections.modal.commitMessage.placeholder')
						"
						data-test-id="source-control-connection-commit-message"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" :disabled="isPushing" @click="close">
					{{ i18n.baseText('settings.sourceControl.connections.button.cancel') }}
				</N8nButton>
				<N8nButton
					:disabled="isLoading || isPushing || files.length === 0 || !commitMessage"
					data-test-id="source-control-connection-push-button"
					@click="onPush"
				>
					{{ i18n.baseText('settings.sourceControl.button.push') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
}

.fileList {
	max-height: 40vh;
	overflow-y: auto;
	margin-bottom: var(--spacing--sm);
}

.fileRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;
}

.commitMessage {
	margin-top: var(--spacing--xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
