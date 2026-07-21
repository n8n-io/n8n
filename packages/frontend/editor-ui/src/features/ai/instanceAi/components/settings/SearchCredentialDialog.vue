<script setup lang="ts">
import { computed } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDropdownMenu,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_SEARCH_CREDENTIAL_TYPES } from '../../constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceCredentialDialog } from '../../composables/useInstanceCredentialDialog';

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

const searchCredentialTypes: readonly string[] = INSTANCE_SEARCH_CREDENTIAL_TYPES;
const credentials = computed(() =>
	store.serviceCredentials.filter((credential) => searchCredentialTypes.includes(credential.type)),
);

const { credentialId, openCreate, openEdit } = useInstanceCredentialDialog({
	open,
	current: () => store.settings?.searchCredentialId ?? '',
	hydrate: () => {},
	credentials: () => credentials.value,
	refresh: async () => await store.refreshCredentials(),
});

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

const createItems: Array<DropdownMenuItemProps<string>> = [
	{
		id: 'braveSearchApi',
		label: i18n.baseText('settings.n8nAgent.searchCredential.createBrave'),
	},
	{
		id: 'searXngApi',
		label: i18n.baseText('settings.n8nAgent.searchCredential.createSearxng'),
	},
];

const isChanged = computed(() => credentialId.value !== (store.settings?.searchCredentialId ?? ''));

const noneLabel = computed(() =>
	store.settings?.searchEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);
const canRemove = computed(() => Boolean(store.settings?.searchCredentialId));

async function handleSave() {
	store.setField('searchCredentialId', credentialId.value || null);
	if (!(await store.save())) return;
	open.value = false;
}

async function handleRemove() {
	store.setField('searchCredentialId', null);
	if (!(await store.save())) return;
	open.value = false;
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="small"
		:header="i18n.baseText('settings.n8nAgent.searchDialog.title')"
		:description="i18n.baseText('settings.n8nAgent.searchDialog.description')"
		data-test-id="n8n-agent-search-dialog"
	>
		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.searchCredential.label')">
				<div :class="$style.credentialControls">
					<N8nSelect
						:class="$style.credentialSelect"
						:model-value="credentialId"
						size="medium"
						:disabled="store.isSaving"
						:placeholder="i18n.baseText('settings.n8nAgent.searchCredential.placeholder')"
						data-test-id="n8n-agent-search-credential-select"
						@update:model-value="credentialId = String($event ?? '')"
					>
						<N8nOption value="" :label="noneLabel" />
						<N8nOption
							v-for="credential in credentials"
							:key="credential.id"
							:value="credential.id"
							:label="`${credential.name} · ${credentialTypeLabel(credential.type)}`"
						/>
					</N8nSelect>

					<N8nButton
						v-if="credentialId && store.canManageInstanceCredentials"
						variant="outline"
						size="medium"
						:label="i18n.baseText('settings.n8nAgent.credentials.edit')"
						:disabled="store.isSaving"
						data-test-id="n8n-agent-search-credential-edit"
						@click="openEdit"
					/>

					<N8nDropdownMenu
						v-if="store.canManageInstanceCredentials"
						:items="createItems"
						placement="bottom-end"
						data-test-id="n8n-agent-search-credential-create"
						@select="openCreate"
					>
						<template #trigger>
							<N8nButton variant="outline" size="medium" :disabled="store.isSaving">
								{{ i18n.baseText('settings.n8nAgent.modelCredential.createNew') }}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>
			</N8nInputLabel>
		</div>

		<N8nDialogFooter>
			<N8nButton
				v-if="canRemove"
				:class="$style.removeButton"
				variant="ghost"
				size="medium"
				:label="i18n.baseText('settings.n8nAgent.searchDialog.remove')"
				:disabled="store.isSaving"
				data-test-id="n8n-agent-search-dialog-remove"
				@click="handleRemove"
			/>
			<N8nButton
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="i18n.baseText('generic.save')"
				:disabled="store.isSaving || !isChanged"
				data-test-id="n8n-agent-search-dialog-save"
				@click="handleSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin: var(--spacing--sm) 0;
}

.credentialControls {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.credentialSelect {
	flex: 1 1 100%;
	min-width: 0;
}

.removeButton {
	margin-right: auto;
	color: var(--text-color--danger);
}
</style>
