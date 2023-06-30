<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PULL_MODAL_KEY } from '@/constants';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import type { SourceControlStatus } from '@/Interface';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; status: SourceControlStatus }>,
		default: () => ({}),
	},
});

const defaultStagedFileTypes = ['tags', 'variables', 'credential'];

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const sourceControlStore = useSourceControlStore();
const route = useRoute();

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		await sourceControlStore.pullWorkfolder(true);
		toast.showMessage({
			message: i18n.baseText('settings.sourceControl.pull.success.description'),
			title: i18n.baseText('settings.sourceControl.pull.success.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
}
</script>

<template>
	<Modal
		width="500px"
		:title="i18n.baseText('settings.sourceControl.modals.pull.title')"
		:eventBus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-text>
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
				</n8n-text>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</n8n-button>
				<n8n-button type="primary" @click="pullWorkfolder">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	overflow-wrap: break-word;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
