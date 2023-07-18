<template>
	<Modal
		width="700px"
		:title="$locale.baseText('importCurlModal.title')"
		:eventBus="modalBus"
		:name="IMPORT_CURL_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-input-label :label="$locale.baseText('importCurlModal.input.label')" color="text-dark">
					<n8n-input
						type="textarea"
						:rows="5"
						:placeholder="$locale.baseText('importCurlModal.input.placeholder')"
						v-model="curlCommand"
						@focus="$event.target.select()"
						ref="input"
					/>
				</n8n-input-label>
			</div>
		</template>
		<template #footer>
			<div :class="$style.modalFooter">
				<n8n-notice
					:class="$style.notice"
					:content="$locale.baseText('ImportCurlModal.notice.content')"
				/>
				<div>
					<n8n-button
						@click="onSubmit"
						float="right"
						:label="$locale.baseText('importCurlModal.button.label')"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue';

import { onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system';
import { useImportCurl } from '@/composables';
import { IMPORT_CURL_MODAL_KEY } from '@/constants';
import { useTelemetry } from '@/composables';

const uiStore = useUIStore();
const { track } = useTelemetry();
const { importCurlCommand } = useImportCurl(track, IMPORT_CURL_MODAL_KEY);

const modalBus = createEventBus();
const curlCommand = ref('');
const input = ref();

function closeDialog() {
	modalBus.emit('close');
}

async function onSubmit() {
	if (await importCurlCommand(curlCommand.value)) {
		closeDialog();
	}
}

onMounted(() => {
	curlCommand.value = uiStore.getCurlCommand(IMPORT_CURL_MODAL_KEY) || '';
	setTimeout(() => {
		(input.value as HTMLTextAreaElement)?.focus();
	});
});
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
