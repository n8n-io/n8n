<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY, DOCS_DOMAIN } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useI18n } from '@/composables/useI18n';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/root.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useApiKeysStore } from '@/stores/apiKeys.store';
import { useToast } from '@/composables/useToast';
import type { BaseTextKey } from '@/plugins/i18n';
import type { ApiKeyWithRawValue } from '@n8n/api-types';

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
const newApiKey = ref<ApiKeyWithRawValue | null>(null);
const apiDocsURL = ref('');
const loading = ref(false);
const rawApiKey = ref('');

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
		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.edit.error'));
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(API_KEY_CREATE_OR_EDIT_MODAL_KEY);
}

const onSave = async () => {
	if (!label.value) {
		return;
	}

	try {
		loading.value = true;
		newApiKey.value = await createApiKey(label.value);
		rawApiKey.value = newApiKey.value.rawApiKey;

		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.create.toast'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.api.create.error'));
	} finally {
		loading.value = false;
	}
};

const modalTitle = computed(() => {
	let path = 'edit';
	if (props.mode === 'new') {
		if (newApiKey.value) {
			path = 'created';
		} else {
			path = 'create';
		}
	}
	return i18n.baseText(`settings.api.view.modal.title.${path}` as BaseTextKey);
});
</script>

<template>
	<Modal
		:title="modalTitle"
		:event-bus="modalBus"
		:name="API_KEY_CREATE_OR_EDIT_MODAL_KEY"
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
						:value="newApiKey.rawApiKey"
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

				<N8nInputLabel
					v-else
					:label="i18n.baseText('settings.api.view.modal.form.label')"
					color="text-dark"
				>
					<N8nInput
						ref="inputRef"
						required
						:model-value="label"
						type="text"
						:placeholder="i18n.baseText('settings.api.view.modal.form.label.placeholder')"
						:maxlength="50"
						data-test-id="api-key-label"
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
					:label="i18n.baseText('settings.api.view.modal.save.button')"
					@click="onSave"
				/>
				<N8nButton
					v-else-if="mode === 'new'"
					float="right"
					:label="i18n.baseText('settings.api.view.modal.done.button')"
					@click="closeModal"
				/>
				<N8nButton
					v-else-if="mode === 'edit'"
					float="right"
					:label="i18n.baseText('settings.api.view.modal.edit.button')"
					@click="onEdit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
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
</style>
