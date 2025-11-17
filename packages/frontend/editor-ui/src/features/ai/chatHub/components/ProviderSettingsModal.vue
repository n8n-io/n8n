<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	ChatHubLLMProvider,
	ChatModelDto,
	ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useChatStore } from '../chat.store';
import { providerDisplayNames } from '../constants';
import { fetchChatModelsApi } from '../chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import ChatProviderModelsTable from './ChatProviderModelsTable.vue';
import { useToast } from '@/app/composables/useToast';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		disabled: boolean;
		onNewCredential: (provider: ChatHubLLMProvider) => void;
		onConfirm: (settings: ChatProviderSettingsDto) => void;
		onCancel: () => void;
	};
}>();

const settings = ref<ChatProviderSettingsDto | null>(null);
const modalBus = ref(createEventBus());
const loadingSettings = ref(false);
const loadingModels = ref(false);
const availableModels = ref<ChatModelDto[]>([]);

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const chatStore = useChatStore();
const toast = useToast();

const availableCredentials = computed<ICredentialsResponse[]>(() => {
	return credentialsStore.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider]);
});

function onCredentialSelect(credentialId: string) {
	if (settings.value) {
		settings.value.credentialId = credentialId;
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

function onNewCredential() {
	props.data.onNewCredential(props.data.provider);
}

function onCancel() {
	props.data.onCancel();
	modalBus.value.emit('close');
}

async function loadSettings() {
	settings.value = await chatStore.fetchProviderSettings(props.data.provider);
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

const models = computed<Array<ChatModelDto & { enabled: boolean }>>(() => {
	return availableModels.value.map((model) => {
		const isEnabled =
			(settings.value?.limitModels === false ||
				settings.value?.allowedModels?.some((m) => m === model.name)) ??
			false;

		return {
			...model,
			enabled: isEnabled,
		};
	});
});

const onToggleEnabled = (value: string | number | boolean) => {
	if (settings.value) {
		settings.value.enabled = typeof value === 'boolean' ? value : Boolean(value);
	}
};

const onToggleLimitModels = (value: string | number | boolean) => {
	if (settings.value) {
		settings.value.limitModels = typeof value === 'boolean' ? value : Boolean(value);
	}
};

function onSelectModels(selectedModelNames: string[]) {
	if (settings.value) {
		settings.value.allowedModels = selectedModelNames;
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
			loadAvailableModels(credentialId);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="50%"
		max-width="720px"
		min-height="340px"
		:center="true"
	>
		<template #header>
			<div :class="$style.header">
				<N8nIcon icon="settings2" :size="24" />
				<N8nHeading size="large" color="text-dark">{{
					i18n.baseText('settings.chatHub.providers.modal.edit.title')
				}}</N8nHeading>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<div :class="$style.container">
					<div :class="$style.label">
						<N8nText bold>
							{{
								i18n.baseText('settings.chatHub.providers.modal.edit.enabled.label', {
									interpolate: { provider: providerDisplayNames[props.data.provider] },
								})
							}}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('settings.chatHub.providers.modal.edit.enabled.description', {
									interpolate: { provider: providerDisplayNames[props.data.provider] },
								})
							}}
						</N8nText>
					</div>

					<div :class="$style.toggle">
						<N8nTooltip
							:content="i18n.baseText('settings.chatHub.providers.modal.edit.enabled.tooltip')"
							:disabled="!props.data.disabled"
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
				</div>

				<div v-if="settings && settings.enabled">
					<N8nText size="small" color="text-base">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.credential.label') }}
					</N8nText>
					<div :class="$style.credentials">
						<N8nSelect
							:model-value="settings.credentialId"
							size="large"
							:placeholder="
								i18n.baseText('settings.chatHub.providers.modal.edit.credential.placeholder')
							"
							@update:model-value="onCredentialSelect($event)"
						>
							<N8nOption
								v-for="c in availableCredentials"
								:key="c.id"
								:value="c.id"
								:label="c.name"
							/>
						</N8nSelect>
						<N8nButton size="medium" type="secondary" @click="onNewCredential()">
							{{ i18n.baseText('settings.chatHub.providers.modal.edit.credential.new') }}
						</N8nButton>
					</div>
				</div>

				<div v-if="settings && settings.enabled && settings.credentialId">
					<div :class="$style.container">
						<div :class="$style.label">
							<N8nText bold>
								{{
									i18n.baseText('settings.chatHub.providers.modal.edit.limitModels.label', {
										interpolate: { provider: providerDisplayNames[props.data.provider] },
									})
								}}
							</N8nText>
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText('settings.chatHub.providers.modal.edit.limitModels.description', {
										interpolate: { provider: providerDisplayNames[props.data.provider] },
									})
								}}
							</N8nText>
						</div>

						<div :class="$style.toggle">
							<N8nTooltip
								:content="
									i18n.baseText('settings.chatHub.providers.modal.edit.limitModels.tooltip')
								"
								:disabled="!props.data.disabled"
								placement="top"
							>
								<ElSwitch
									size="large"
									:model-value="settings?.limitModels ?? false"
									:disabled="props.data.disabled"
									:loading="loadingSettings"
									@update:model-value="onToggleLimitModels"
								/>
							</N8nTooltip>
						</div>
					</div>

					<div v-if="settings && settings.enabled && settings.credentialId && settings.limitModels">
						<ChatProviderModelsTable
							:models="models"
							:loading="loadingModels"
							@select-models="onSelectModels"
						/>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.cancel') }}
					</N8nButton>
					<N8nButton type="primary" @click="onConfirm">
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
	align-items: center;
	justify-content: space-between;
}

.label {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.toggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.provider {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--md);
}
.providerHeader {
	display: grid;
	gap: var(--spacing--2xs);
}
.providerTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.row {
	display: grid;
	gap: var(--spacing--2xs);
}
.credentials {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.toolsList {
	display: grid;
	gap: var(--spacing--sm);
}
.toolRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) 0;
}
.toolInfo {
	display: grid;
	gap: 2px;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}
.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
