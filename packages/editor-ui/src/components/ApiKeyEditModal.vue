<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { API_KEY_EDIT_MODAL_KEY, DOCS_DOMAIN } from '@/constants';
import { onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import { useSettingsStore } from '@/stores/settings.store';
import type { ApiKey } from '@/Interface';
import { useRootStore } from '@/stores/root.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useApiKeysStore } from '@/stores/apiKeys.store';
import { useToast } from '@/composables/useToast';

const telemetry = useTelemetry();
const i18n = useI18n();
const { showError, showMessage } = useToast();

const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
const { createApiKey, updateApiKey, apiKeysById } = useApiKeysStore();
const { baseUrl } = useRootStore();
const documentTitle = useDocumentTitle();

const label = ref('');
const modalBus = createEventBus();
const newApiKey = ref<ApiKey | null>(null);
const apiDocsURL = ref('');
const loading = ref(false);

const inputRef = ref<HTMLTextAreaElement | null>(null);

const props = withDefaults(
	defineProps<{
		mode?: 'new' | 'edit';
		activeId?: string;
	}>(),
	{
		mode: 'new',
		activeId: '',
	},
);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.api'));

	setTimeout(() => {
		inputRef.value?.focus();
	});

	if (props.mode === 'edit') {
		label.value = apiKeysById[props.activeId]?.label ?? '';
	}

	apiDocsURL.value = isSwaggerUIEnabled
		? `${baseUrl}${publicApiPath}/v${publicApiLatestVersion}/docs`
		: `https://${DOCS_DOMAIN}/api/api-reference/`;
});

function onInput(value: string): void {
	label.value = value;
}

async function onEdit() {
	try {
		loading.value = true;
		await updateApiKey(props.activeId, { label: label.value });
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.update.toast'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.api.edit.error'));
	} finally {
		loading.value = false;
		closeModal();
	}
}

function closeModal() {
	uiStore.closeModal(API_KEY_EDIT_MODAL_KEY);
}

const onSave = async () => {
	if (!label.value) {
		return;
	}

	try {
		loading.value = true;
		newApiKey.value = await createApiKey(label.value);
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.create.toast'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.api.create.error'));
	} finally {
		telemetry.track('User clicked create API key button');
		loading.value = false;
	}
};
</script>

<template>
	<Modal
		:title="mode === 'new' ? 'Create API Key' : 'Edit API Key'"
		:event-bus="modalBus"
		:name="API_KEY_EDIT_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:close-on-esc="true"
		:close-on-click-outside="true"
		:show-close="true"
	>
		<template #content>
			<div>
				<p v-if="newApiKey" class="mb-s">
					<n8n-info-tip :bold="false">
						<i18n-t keypath="settings.api.view.info" tag="span">
							<template #apiAction>
								<a
									href="https://docs.n8n.io/api"
									target="_blank"
									v-text="i18n.baseText('settings.api.view.info.api')"
								/>
							</template>
							<template #webhookAction>
								<a
									href="https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/"
									target="_blank"
									v-text="i18n.baseText('settings.api.view.info.webhook')"
								/>
							</template>
						</i18n-t>
					</n8n-info-tip>
				</p>
				<n8n-card v-if="newApiKey" class="mb-4xs" :class="$style.card">
					<CopyInput
						:label="newApiKey.label"
						:value="newApiKey.apiKey"
						:redact-value="true"
						:copy-button-text="i18n.baseText('generic.clickToCopy')"
						:toast-title="i18n.baseText('settings.api.view.copy.toast')"
						:hint="i18n.baseText('settings.api.view.copy')"
					/>
				</n8n-card>

				<div v-if="newApiKey" :class="$style.hint">
					<n8n-text size="small">
						{{
							i18n.baseText(
								`settings.api.view.${settingsStore.isSwaggerUIEnabled ? 'tryapi' : 'more-details'}`,
							)
						}}
					</n8n-text>
					{{ ' ' }}
					<n8n-link :to="apiDocsURL" :new-window="true" size="small">
						{{
							i18n.baseText(
								`settings.api.view.${isSwaggerUIEnabled ? 'apiPlayground' : 'external-docs'}`,
							)
						}}
					</n8n-link>
				</div>

				<N8nInputLabel v-else label="Label" color="text-dark">
					<N8nInput
						ref="inputRef"
						required
						:model-value="label"
						type="text"
						placeholder="e.g Internal Project"
						@update:model-value="onInput"
					/>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div>
				<N8nButton
					v-if="mode === 'new' && !newApiKey"
					float="right"
					:loading="loading"
					label="Save"
					@click="onSave"
				/>
				<N8nButton v-else-if="mode === 'new'" float="right" label="Done" @click="closeModal" />
				<N8nButton v-else-if="mode === 'edit'" float="right" label="Edit" @click="onEdit" />
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
// .modalFooter {
// 	justify-content: space-between;
// 	display: flex;
// 	flex-direction: row;
// }

.card {
	margin-bottom: 50px;
}

.notice {
	margin: 0;
}

.hint {
	color: var(--color-text-light);
	margin-bottom: var(--spacing-s);
}

.modal-content {
	// overflow-y: hidden !important;
}
</style>
