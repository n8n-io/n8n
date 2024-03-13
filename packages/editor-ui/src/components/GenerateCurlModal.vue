<template>
	<Modal
		width="700px"
		:title="i18n.baseText('importCurlModal.title')"
		:event-bus="modalBus"
		:name="GENERATE_CURL_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<N8nFormInputs
					:inputs="formInputs"
					:event-bus="formBus"
					column-view
					@update="onUpdate"
					@submit="onSubmit"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.modalFooter">
				<N8nNotice
					:class="$style.notice"
					:content="i18n.baseText('ImportCurlModal.notice.content')"
				/>
				<div>
					<N8nButton
						float="right"
						:loading="loading"
						:label="i18n.baseText('importCurlModal.button.label')"
						@click="onGenerate"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { GENERATE_CURL_MODAL_KEY } from '@/constants';
import { ref } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import { useAIStore } from '@/stores/ai.store';
import type { IFormInput } from 'n8n-design-system';
import { useToast } from '@/composables/useToast';
import { useImportCurlCommand } from '@/composables/useImportCurlCommand';
import { useUIStore } from '@/stores/ui.store';

const telemetry = useTelemetry();
const i18n = useI18n();
const toast = useToast();

const uiStore = useUIStore();
const aiStore = useAIStore();

const modalBus = createEventBus();
const formBus = createEventBus();

const formInputs: IFormInput[] = [
	{
		name: 'service',
		initialValue: uiStore.getModalData(GENERATE_CURL_MODAL_KEY)?.service,
		properties: {
			label: i18n.baseText('generateCurlModal.service.label'),
			placeholder: i18n.baseText('generateCurlModal.service.placeholder'),
			type: 'text',
			required: true,
			capitalize: true,
		},
	},
	{
		name: 'request',
		initialValue: uiStore.getModalData(GENERATE_CURL_MODAL_KEY)?.request,
		properties: {
			label: i18n.baseText('generateCurlModal.request.label'),
			placeholder: i18n.baseText('generateCurlModal.request.placeholder'),
			type: 'text',
			required: true,
			capitalize: true,
		},
	},
];

const formValues = ref({
	service: uiStore.getModalData(GENERATE_CURL_MODAL_KEY)?.service ?? '',
	request: uiStore.getModalData(GENERATE_CURL_MODAL_KEY)?.request ?? '',
});

const loading = ref(false);

const { importCurlCommand } = useImportCurlCommand({
	onImportSuccess,
	onImportFailure,
	onAfterImport,
});

function closeDialog(): void {
	modalBus.emit('close');
}

function onImportSuccess() {
	sendTelemetry();
	closeDialog();
}

function onImportFailure(data: { invalidProtocol: boolean; protocol?: string }) {
	sendTelemetry({ success: false, ...data });
}

function onAfterImport() {
	uiStore.setModalData({
		name: GENERATE_CURL_MODAL_KEY,
		data: {
			service: formValues.value.service,
			request: formValues.value.request,
		},
	});
}

function sendTelemetry(
	data: { success: boolean; invalidProtocol: boolean; protocol?: string } = {
		success: true,
		invalidProtocol: false,
		protocol: '',
	},
): void {
	telemetry.track('User generated curl command using AI', {
		success: data.success,
		invalidProtocol: data.invalidProtocol,
		protocol: data.protocol,
	});
}

async function onUpdate(field: { name: string; value: string }) {
	formValues.value = {
		...formValues.value,
		[field.name]: field.value,
	};
}

async function onGenerate() {
	formBus.emit('submit');
}

async function onSubmit() {
	try {
		loading.value = true;
		const data = await aiStore.generateCurl({
			service: formValues.value.service,
			request: formValues.value.request,
		});

		await importCurlCommand(data.curl);
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loading.value = false;
	}
}
</script>

<style module lang="scss">
.modalFooter {
	justify-content: space-between;
	display: flex;
	flex-direction: row;
}

.notice {
	margin: 0;
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
