<script lang="ts" setup>
import { computed, onMounted, watch } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nEmptyState,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { INSTANCE_AI_SETTINGS_VIEW } from '../constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const router = useRouter();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();

const INSTANCE_MODEL_CREDENTIAL_TYPES: Array<{ type: string; label: string }> = [
	{ type: 'openAiApi', label: 'OpenAI' },
	{ type: 'anthropicApi', label: 'Anthropic' },
	{ type: 'googlePalmApi', label: 'Google Gemini' },
	{ type: 'ollamaApi', label: 'Ollama' },
	{ type: 'groqApi', label: 'Groq' },
	{ type: 'deepSeekApi', label: 'DeepSeek' },
	{ type: 'mistralCloudApi', label: 'Mistral' },
	{ type: 'xAiApi', label: 'xAI' },
	{ type: 'openRouterApi', label: 'OpenRouter' },
	{ type: 'cohereApi', label: 'Cohere' },
];

const createModelCredentialItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
	INSTANCE_MODEL_CREDENTIAL_TYPES.map(({ type, label }) => ({ id: type, label })),
);
const canConfigure = computed(
	() => store.canManage && !store.isProxyEnabled && !store.isCloudManaged,
);
const selectedModelCredentialId = computed(() => {
	if (store.draft.modelCredentialId !== undefined) return store.draft.modelCredentialId ?? '';
	return store.settings?.modelCredentialId ?? '';
});

let creatingModelCredential = false;

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent.credentials.title'));
	void store.fetch();
});

function goBack() {
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}

function handleModelCredentialChange(value: string | number | boolean | null) {
	store.setField('modelCredentialId', value ? String(value) : null);
	void store.save();
}

function handleCreateModelCredential(credentialType: string) {
	creatingModelCredential = true;
	uiStore.openNewCredential(
		credentialType,
		false,
		false,
		undefined,
		undefined,
		undefined,
		undefined,
		{ availability: 'instance', closeOnSave: true },
	);
}

function editModelCredential() {
	if (selectedModelCredentialId.value) {
		uiStore.openExistingCredential(selectedModelCredentialId.value, { hideAskAssistant: true });
	}
}

watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen || !canConfigure.value) return;
		const previousIds = new Set(store.instanceModelCredentials.map((credential) => credential.id));
		await store.refreshInstanceModelCredentials();
		if (!creatingModelCredential) return;

		creatingModelCredential = false;
		const newCredential = store.instanceModelCredentials.find(
			(credential) => !previousIds.has(credential.id),
		);
		if (newCredential) handleModelCredentialChange(newCredential.id);
	},
);
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('settings.n8nAgent.credentials.back')"
		data-test-id="n8n-agent-credentials-settings"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.n8nAgent.credentials.title')"
			:description="i18n.baseText('settings.n8nAgent.credentials.pageDescription')"
			:show-docs-link="false"
		/>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<N8nSettingsSection
			v-else-if="canConfigure"
			:title="i18n.baseText('settings.n8nAgent.credentials.model.title')"
			:description="i18n.baseText('settings.n8nAgent.credentials.model.description')"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.n8nAgent.modelCredential.label')"
					:description="i18n.baseText('settings.n8nAgent.modelCredential.description')"
					:action-max-width="false"
				>
					<template #action>
						<div :class="$style.credentialControls">
							<N8nSelect
								:class="$style.credentialSelect"
								:model-value="selectedModelCredentialId"
								size="medium"
								:disabled="store.isSaving"
								:placeholder="i18n.baseText('settings.n8nAgent.modelCredential.placeholder')"
								data-test-id="n8n-agent-model-credential-select"
								@update:model-value="handleModelCredentialChange"
							>
								<N8nOption
									value=""
									:label="i18n.baseText('settings.n8nAgent.modelCredential.none')"
								/>
								<N8nOption
									v-for="credential in store.instanceModelCredentials"
									:key="credential.id"
									:value="credential.id"
									:label="`${credential.name} (${credential.provider})`"
								/>
							</N8nSelect>

							<N8nButton
								v-if="selectedModelCredentialId"
								variant="outline"
								size="medium"
								:label="i18n.baseText('settings.n8nAgent.credentials.edit')"
								:disabled="store.isSaving"
								data-test-id="n8n-agent-model-credential-edit"
								@click="editModelCredential"
							/>

							<N8nDropdownMenu
								:items="createModelCredentialItems"
								placement="bottom-end"
								data-test-id="n8n-agent-model-credential-create"
								@select="handleCreateModelCredential"
							>
								<template #trigger>
									<N8nButton variant="outline" size="medium" :disabled="store.isSaving">
										{{ i18n.baseText('settings.n8nAgent.modelCredential.createNew') }}
										<N8nIcon icon="chevron-down" size="small" />
									</N8nButton>
								</template>
							</N8nDropdownMenu>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nEmptyState
			v-else
			:icon="{ type: 'icon', value: 'key-round' }"
			:heading="i18n.baseText('settings.n8nAgent.credentials.unavailable.title')"
			:description="i18n.baseText('settings.n8nAgent.credentials.unavailable.description')"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--text-color--subtle);
}

.credentialControls {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.credentialSelect {
	width: 15rem;
}
</style>
