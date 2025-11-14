<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	ChatHubLLMProvider,
	ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { ElSwitch } from 'element-plus';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import { useChatStore } from '../chat.store';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		onConfirm: (settings: ChatProviderSettingsDto) => void;
	};
}>();

const settings = ref<ChatProviderSettingsDto | null>(null);
const modalBus = ref(createEventBus());

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const chatStore = useChatStore();

const availableCredentials = computed<ICredentialsResponse[]>(() => {
	return credentialsStore.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider]);
});

function onCredentialSelect(credentialId: string) {
	if (settings.value) {
		settings.value.credentialId = credentialId;
	}
}

function onConfirm() {
	modalBus.value.emit('close');
}

function onCreateNew() {
	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}

async function loadSettings() {
	settings.value = await chatStore.fetchProviderSettings(props.data.provider);
}

onMounted(async () => {
	await loadSettings();
});
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
			<div v-if="settings" :class="$style.content">
				<div>
					<N8nText size="small" color="text-base">
						{{ i18n.baseText('settings.chatHub.providers.modal.edit.enabled.label') }}
					</N8nText>
					<ElSwitch
						v-model="settings.enabled"
						:active-text="i18n.baseText('settings.chatHub.providers.modal.edit.enabled.on')"
						:inactive-text="i18n.baseText('settings.chatHub.providers.modal.edit.enabled.off')"
					/>
				</div>

				<div>
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
						<N8nButton size="medium" type="secondary" @click="onCreateNew()">
							{{ i18n.baseText('settings.chatHub.providers.modal.edit.credential.new') }}
						</N8nButton>
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
