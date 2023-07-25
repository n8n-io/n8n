<template>
	<Modal
		width="700px"
		:title="$locale.baseText('aiImportCurlModal.title')"
		:eventBus="modalBus"
		:name="AI_CONNECT_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<n8n-notice :class="$style.notice" :content="$locale.baseText('aiImportCurlModal.notice')" />
			<div :class="$style.container">
				<n8n-input-label
					:label="$locale.baseText('aiImportCurlModal.input.service.label')"
					color="text-dark"
				>
					<n8n-input
						:placeholder="$locale.baseText('aiImportCurlModal.input.service.placeholder')"
						v-model="service"
						@focus="$event.target.select()"
						ref="input"
					/>
				</n8n-input-label>
				<n8n-input-label
					:label="$locale.baseText('aiImportCurlModal.input.prompt.label')"
					color="text-dark"
				>
					<n8n-input
						:placeholder="$locale.baseText('aiImportCurlModal.input.prompt.placeholder')"
						v-model="prompt"
						@focus="$event.target.select()"
					/>
				</n8n-input-label>
			</div>
		</template>
		<template #footer>
			<div :class="$style.modalFooter">
				<n8n-button
					@click="onSubmit"
					float="right"
					:disabled="service.length === 0 || prompt.length === 0"
					:loading="loading"
					:label="$locale.baseText('aiImportCurlModal.button.label')"
				/>
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue';

import { onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system';
import { useI18n, useImportCurl, useToast } from '@/composables';
import { AI_CONNECT_MODAL_KEY } from '@/constants';
import { useTelemetry } from '@/composables';
import { useRootStore } from '@/stores';
import { generateCurlCommand } from '@/api/ai';

const rootStore = useRootStore();
const uiStore = useUIStore();
const { i18n } = useI18n();
const { showError, showToast } = useToast();
const { track } = useTelemetry();
const { importCurlCommand } = useImportCurl(track, AI_CONNECT_MODAL_KEY);

const modalBus = createEventBus();
const loading = ref(false);
const service = ref('');
const prompt = ref('');

function closeDialog() {
	loading.value = false;
	modalBus.emit('close');

	uiStore.setModalData({
		name: AI_CONNECT_MODAL_KEY,
		data: {
			service: service.value,
			prompt: prompt.value,
		},
	});
}

async function onSubmit() {
	loading.value = true;

	try {
		const { curl } = await generateCurlCommand(rootStore.getRestApiContext, {
			service: service.value,
			prompt: prompt.value,
		});

		if ((await importCurlCommand(curl)) === true) {
			closeDialog();
			showToast({
				type: 'success',
				title: i18n.baseText('aiImportCurlModal.toast.success.title'),
				message: i18n.baseText('aiImportCurlModal.toast.success.message'),
			});
		}
	} catch (error) {
		showError(
			error,
			i18n.baseText('aiImportCurlModal.toast.error.title'),
			i18n.baseText('aiImportCurlModal.toast.error.message'),
		);
	}
}

onMounted(() => {
	service.value = (uiStore.getModalData(AI_CONNECT_MODAL_KEY)?.service as string) || '';
	prompt.value = (uiStore.getModalData(AI_CONNECT_MODAL_KEY)?.prompt as string) || '';
});
</script>

<style module lang="scss">
.modalFooter {
	justify-content: flex-end;
	display: flex;
	flex-direction: row;
}

.notice {
	margin-top: 0;
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
