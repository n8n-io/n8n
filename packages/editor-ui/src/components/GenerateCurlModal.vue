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
				<N8nInputLabel :label="i18n.baseText('importCurlModal.input.label')" color="text-dark">
					<N8nInput
						ref="serviceRef"
						:model-value="service"
						type="text"
						:placeholder="i18n.baseText('importCurlModal.input.servicePlaceholder')"
						@update:model-value="onServiceInput"
						@focus="$event.target.select()"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('importCurlModal.input.label')" color="text-dark">
					<N8nInput
						ref="requestRef"
						:model-value="request"
						type="text"
						:placeholder="i18n.baseText('importCurlModal.input.requestPlaceholder')"
						@update:model-value="onRequestInput"
						@focus="$event.target.select()"
					/>
				</N8nInputLabel>
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
						:label="i18n.baseText('importCurlModal.button.label')"
						@click="importCurlCommand"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import {
	GENERATE_CURL_MODAL_KEY,
	CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS,
	CURL_IMPORT_NODES_PROTOCOLS,
} from '@/constants';
import { useToast } from '@/composables/useToast';
import { onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';

const toast = useToast();
const telemetry = useTelemetry();
const i18n = useI18n();

const uiStore = useUIStore();

const modalBus = createEventBus();

const service = ref('');
const request = ref('');

const serviceRef = ref<HTMLInputElement | null>(null);
const requestRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
	setTimeout(() => {
		serviceRef.value?.focus();
	});
});

function onInput(value: string): void {
	curlCommand.value = value;
}

function closeDialog(): void {
	modalBus.emit('close');
}

async function importCurlCommand(): Promise<void> {
	const command = curlCommand.value;
	if (command === '') return;

	try {
		const parameters = await uiStore.getCurlToJson(command);
		const url = parameters['parameters.url'];

		const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) =>
			url.includes(`${p}://`),
		);

		if (!invalidProtocol) {
			uiStore.setHttpNodeParameters({
				name: IMPORT_CURL_MODAL_KEY,
				parameters: JSON.stringify(parameters),
			});

			closeDialog();
			sendTelemetry();

			return;
			// if we have a node that supports the invalid protocol
			// suggest that one
		} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
			const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];

			showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
			// we do not have a node that supports the use protocol
		} else {
			showProtocolError(invalidProtocol);
		}

		sendTelemetry({ success: false, invalidProtocol: true, protocol: invalidProtocol });
	} catch (e) {
		showInvalidcURLCommandError();

		sendTelemetry({ success: false, invalidProtocol: false });
	} finally {
		uiStore.setCurlCommand({ name: IMPORT_CURL_MODAL_KEY, command: this.curlCommand });
	}
}

function showProtocolErrorWithSupportedNode(protocol: string, node: string): void {
	toast.showToast({
		title: i18n.baseText('importCurlParameter.showError.invalidProtocol1.title', {
			interpolate: {
				node,
			},
		}),
		message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
			interpolate: {
				protocol: protocol.toUpperCase(),
			},
		}),
		type: 'error',
		duration: 0,
	});
}

function showProtocolError(protocol: string): void {
	toast.showToast({
		title: i18n.baseText('importCurlParameter.showError.invalidProtocol2.title'),
		message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
			interpolate: {
				protocol,
			},
		}),
		type: 'error',
		duration: 0,
	});
}

function showInvalidcURLCommandError(): void {
	toast.showToast({
		title: i18n.baseText('importCurlParameter.showError.invalidCurlCommand.title'),
		message: i18n.baseText('importCurlParameter.showError.invalidCurlCommand.message'),
		type: 'error',
		duration: 0,
	});
}

function sendTelemetry(
	data: { success: boolean; invalidProtocol: boolean; protocol?: string } = {
		success: true,
		invalidProtocol: false,
		protocol: '',
	},
): void {
	telemetry.track('User imported curl command', {
		success: data.success,
		invalidProtocol: data.invalidProtocol,
		protocol: data.protocol,
	});
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
