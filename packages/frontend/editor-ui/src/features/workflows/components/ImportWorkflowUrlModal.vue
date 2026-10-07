<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { nodeViewEventBus } from '@/app/event-bus';
import { VALID_WORKFLOW_IMPORT_URL_REGEX, IMPORT_WORKFLOW_URL_MODAL_KEY } from '@/app/constants';

import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter, N8nInput } from '@n8n/design-system';
const i18n = useI18n();
const uiStore = useUIStore();

const url = ref('');

const isValid = computed(() => {
	return url.value ? VALID_WORKFLOW_IMPORT_URL_REGEX.test(url.value) : true;
});

const modalOpen = computed(() => uiStore.modalsById[IMPORT_WORKFLOW_URL_MODAL_KEY]?.open === true);

const closeModal = () => {
	if (uiStore.modalsById[IMPORT_WORKFLOW_URL_MODAL_KEY]?.open !== true) return;
	uiStore.closeModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
};

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeModal();
}

const confirm = () => {
	nodeViewEventBus.emit('importWorkflowUrl', { url: url.value });
	closeModal();
};
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('mainSidebar.prompt.importWorkflowFromUrl')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div :class="$style.noScrollbar" data-test-id="importWorkflowUrl-modal">
				<N8nInput
					v-model="url"
					:placeholder="i18n.baseText('mainSidebar.prompt.workflowUrl')"
					:state="isValid ? 'default' : 'error'"
					data-test-id="workflow-url-import-input"
					@keyup.enter="confirm"
				/>
				<p :class="$style['error-text']" :style="{ visibility: isValid ? 'hidden' : 'visible' }">
					{{ i18n.baseText('mainSidebar.prompt.invalidUrl') }}
				</p>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				float="right"
				data-test-id="cancel-workflow-import-url-button"
				@click="closeModal"
			>
				{{ i18n.baseText('mainSidebar.prompt.cancel') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				float="right"
				:disabled="!url || !isValid"
				data-test-id="confirm-workflow-import-url-button"
				@click="confirm"
			>
				{{ i18n.baseText('mainSidebar.prompt.import') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.error-text {
	color: var(--color--danger);
	font-size: var(--font-size--2xs);
	margin-top: var(--spacing--2xs);
	height: var(--spacing--sm);
	visibility: hidden;
}

.noScrollbar {
	overflow: hidden;
}
</style>
