<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { nodeViewEventBus } from '@/event-bus';
import { VALID_WORKFLOW_IMPORT_URL_REGEX, IMPORT_WORKFLOW_URL_MODAL_KEY } from '@/constants';

const i18n = useI18n();
const uiStore = useUIStore();

const url = ref('');
const isValid = computed(() => {
	return url.value ? VALID_WORKFLOW_IMPORT_URL_REGEX.test(url.value) : true;
});

const closeModal = () => {
	uiStore.closeModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
};

const confirm = () => {
	if (!url.value.match(VALID_WORKFLOW_IMPORT_URL_REGEX)) {
		isValid.value = false;
		return;
	}
	nodeViewEventBus.emit('importWorkflowUrl', { url: url.value });
	closeModal();
};

watch(url, (newValue) => {
	if (!newValue) {
		isValid.value = true;
	} else {
		isValid.value = VALID_WORKFLOW_IMPORT_URL_REGEX.test(newValue);
	}
});
</script>

<template>
	<Modal
		:name="IMPORT_WORKFLOW_URL_MODAL_KEY"
		:title="i18n.baseText('mainSidebar.prompt.importWorkflowFromUrl')"
		:show-close="true"
		:center="true"
		width="420px"
	>
		<template #content>
			<div>
				<n8n-input
					v-model="url"
					:placeholder="i18n.baseText('mainSidebar.prompt.workflowUrl')"
					:state="isValid ? 'default' : 'error'"
					@keyup.enter="confirm"
				/>
				<p v-if="!isValid" :class="$style['error-text']">
					{{ i18n.baseText('mainSidebar.prompt.invalidUrl') }}
				</p>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="secondary" float="right" @click="closeModal">
					{{ i18n.baseText('mainSidebar.prompt.cancel') }}
				</n8n-button>
				<n8n-button type="primary" float="right" :disabled="!url.value || !isValid.value" @click="confirm">
					{{ i18n.baseText('mainSidebar.prompt.import') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.error-text {
	> * {
		color: var(--color-danger);
		font-size: var(--font-size-s);
		margin-top: var(--spacing-2xs);
	}
}
.footer {
	> * {
		margin-left: var(--spacing-3xs);
	}
}
</style>
