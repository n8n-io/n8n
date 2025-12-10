<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { N8nButton, N8nHeading, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	type ChatHubLLMProvider,
	type ChatModelDto,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useChatStore } from '../chat.store';
import { providerDisplayNames } from '../constants';
import { fetchChatModelsApi } from '../chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import TagsDropdown from '@/features/shared/tags/components/TagsDropdown.vue';
import { type ITag } from '@n8n/rest-api-client';

interface IModel extends ITag {
	isManual?: boolean;
}

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		disabled: boolean;
		onConfirm: (settings: ChatProviderSettingsDto) => void;
		onCancel: () => void;
	};
}>();

const settings = ref<ChatProviderSettingsDto | null>(null);
const modalBus = ref(createEventBus());
const loadingSettings = ref(false);
const loadingModels = ref(false);
const limitModels = ref(false);
const availableModels = ref<ChatModelDto[]>([]);
const customModels = ref<string[]>([]);

const allModels = computed<IModel[]>(() => {
	const models: Map<string, IModel> = new Map(
		availableModels.value.reduce<Array<[string, IModel]>>((acc, model) => {
			if (model.model.provider !== 'custom-agent' && model.model.provider !== 'n8n') {
				acc.push([
					model.model.model,
					{
						id: model.model.model,
						name: model.name,
					},
				]);
			}

			return acc;
		}, []),
	);

	for (const model of customModels.value) {
		models.set(model, {
			id: model,
			name: model,
			isManual: true,
		});
	}

	return Array.from(models.values());
});

const modelsById = computed<Record<string, IModel>>(() => {
	const map: Record<string, IModel> = {};
	allModels.value.forEach((model) => {
		map[model.id] = model;
	});

	return map;
});

const selectedModels = computed({
	get: () => settings.value?.allowedModels?.map((m) => m.model) || [],
	set: (value) => {
		if (settings.value) {
			settings.value.allowedModels = allModels.value
				.filter((model) => value.includes(model.id))
				.map((model) => ({
					model: model.id,
					displayName: model.name,
					isManual: model.isManual,
				}));

			customModels.value = settings.value.allowedModels
				.filter((model) => model.isManual)
				.map((model) => model.model);
		}
	},
});

async function addManualModel(name: string): Promise<IModel> {
	customModels.value.push(name);
	return {
		id: name,
		name,
	};
}

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const chatStore = useChatStore();
const toast = useToast();

const credentialType = computed(() => {
	return PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider];
});

function onCredentialSelect(credentialId: string) {
	if (settings.value) {
		settings.value.credentialId = credentialId;
	}
}

function onCredentialDeselect() {
	if (settings.value) {
		settings.value.credentialId = null;
		settings.value.allowedModels = [];
		limitModels.value = false;
	}
}

function onConfirm() {
	if (settings.value) {
		props.data.onConfirm(settings.value);
	} else {
		props.data.onCancel();
	}

	modalBus.value.emit('close');
}

function onCancel() {
	props.data.onCancel();
	modalBus.value.emit('close');
}

async function loadSettings() {
	settings.value = await chatStore.fetchProviderSettings(props.data.provider);
	limitModels.value = settings.value?.allowedModels.length > 0;
	customModels.value = settings.value.allowedModels
		.filter((model) => model.isManual)
		.map((model) => model.model);
}

async function loadAvailableModels(credentialId: string) {
	loadingModels.value = true;
	try {
		const credentials = {
			[props.data.provider]: credentialId,
		};

		const response = await fetchChatModelsApi(useRootStore().restApiContext, { credentials });

		availableModels.value = response[props.data.provider].models || [];
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.chatHub.providers.modal.edit.errorFetchingModels'),
		);
	} finally {
		loadingModels.value = false;
	}
}

const isConfirmDisabled = computed(() => {
	if (props.data.disabled) return true;
	if (!settings.value) return true;

	return limitModels.value && settings.value.allowedModels.length === 0;
});

function onToggleEnabled(value: string | number | boolean) {
	if (settings.value) {
		settings.value.enabled = typeof value === 'boolean' ? value : Boolean(value);
		if (!settings.value.enabled) {
			settings.value.credentialId = null;
			settings.value.allowedModels = [];
			limitModels.value = false;
		}
	}
}

function onToggleLimitModels(value: string | number | boolean) {
	if (settings.value) {
		limitModels.value = typeof value === 'boolean' ? value : Boolean(value);
		if (!limitModels.value) {
			settings.value.allowedModels = [];
		}
	}
}

onMounted(async () => {
	loadingSettings.value = true;
	await Promise.all([
		loadSettings(),
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
	loadingSettings.value = false;
});

watch(
	() => settings.value?.credentialId,
	async (credentialId) => {
		if (credentialId) {
			await loadAvailableModels(credentialId);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal :name="modalName" :event-bus="modalBus" width="50%" max-width="500px" :center="true">
		<template #header>
			<div :class="$style.header">
				<N8nHeading size="large" color="text-dark">{{
					i18n.baseText('settings.chatHub.providers.modal.edit.title', {
						interpolate: { provider: providerDisplayNames[props.data.provider] },
					})
				}}</N8nHeading>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<div :class="$style.container">
					<N8nText tag="label" color="text-dark">
						{{
							i18n.baseText('settings.chatHub.providers.modal.edit.enabled.label', {
								interpolate: { provider: providerDisplayNames[props.data.provider] },
							})
						}}
					</N8nText>

					<N8nTooltip
						:content="i18n.baseText('settings.chatHub.providers.modal.edit.enabled.tooltip')"
						:disabled="props.data.disabled"
						placement="top"
					>
						<ElSwitch
							size="large"
							:model-value="settings?.enabled ?? false"
							:disabled="props.data.disabled"
							:loading="loadingSettings"
							@update:model-value="onToggleEnabled"
						/>
					</N8nTooltip>
				</div>

				<div v-if="settings && settings.enabled" :class="$style.container">
					<N8nText tag="label" color="text-dark">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.credential.label') }}
					</N8nText>

					<div :class="$style.credentialContainer">
						<CredentialPicker
							:class="$style.credentialPicker"
							:app-name="providerDisplayNames[props.data.provider]"
							:credential-type="credentialType"
							:selected-credential-id="settings.credentialId"
							:hide-create-new="true"
							@credential-selected="onCredentialSelect"
							@credential-deselected="onCredentialDeselect"
						/>
						<N8nIconButton
							v-if="settings.credentialId"
							native-type="button"
							:title="i18n.baseText('settings.chatHub.providers.modal.edit.credential.clearButton')"
							icon="x"
							icon-size="large"
							type="secondary"
							@click="onCredentialDeselect"
						/>
					</div>
				</div>

				<div v-if="settings && settings.enabled && settings.credentialId" :class="$style.container">
					<N8nText tag="label" color="text-dark">
						{{
							i18n.baseText('settings.chatHub.providers.modal.edit.limitModels.label', {
								interpolate: { provider: providerDisplayNames[props.data.provider] },
							})
						}}
					</N8nText>

					<div :class="$style.toggle">
						<N8nTooltip
							:content="i18n.baseText('settings.chatHub.providers.modal.edit.limitModels.tooltip')"
							:disabled="props.data.disabled"
							placement="top"
						>
							<ElSwitch
								size="large"
								:model-value="limitModels"
								:disabled="props.data.disabled"
								:loading="loadingSettings"
								@update:model-value="onToggleLimitModels"
							/>
						</N8nTooltip>
					</div>
				</div>

				<div
					v-if="settings && settings.enabled && settings.credentialId && limitModels"
					:class="$style.container"
				>
					<N8nText tag="label" color="text-dark">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.allowedModels.label') }}
					</N8nText>
					<TagsDropdown
						v-model="selectedModels"
						:class="$style.modelPicker"
						:placeholder="i18n.baseText('settings.chatHub.providers.modal.edit.models.placeholder')"
						:event-bus="null"
						:create-enabled="true"
						:manage-enabled="false"
						:all-tags="allModels"
						:is-loading="loadingModels"
						:tags-by-id="modelsById"
						:create-tag="addManualModel"
						:create-tag-i18n-key="'settings.chatHub.providers.modal.edit.models.create'"
					/>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.cancel') }}
					</N8nButton>
					<N8nButton type="primary" @click="onConfirm" :disabled="isConfirmDisabled">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.confirm') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--sm) 0 var(--spacing--md);
}

.container {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.credentialContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.credentialPicker {
	width: 100%;
}

.modelPicker {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	width: 100%;
}
.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
