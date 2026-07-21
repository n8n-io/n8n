<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation } from '@/Interface';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { INSTANCE_SEARCH_CREDENTIAL_TYPES } from '../../constants';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ConnectionFields from './ConnectionFields.vue';

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

provideWorkflowDocumentStore();

const selectedType = ref('');
const fieldsData = ref<ICredentialDataDecryptedObject>({});
const isLoading = ref(false);

let hydratedType = '';
let hydratedData: ICredentialDataDecryptedObject = {};
let hydratedSnapshot = '';

const assignedId = computed(() => store.settings?.searchCredentialId ?? null);
const assignedType = computed(() =>
	assignedId.value
		? (store.serviceCredentials.find((credential) => credential.id === assignedId.value)?.type ??
			'')
		: '',
);

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

const providerOptions = computed(() =>
	INSTANCE_SEARCH_CREDENTIAL_TYPES.map((type) => ({
		value: type,
		label: credentialTypeLabel(type),
	})),
);

function snapshot() {
	return JSON.stringify({ t: selectedType.value, d: fieldsData.value });
}

async function hydrate() {
	selectedType.value = assignedType.value;
	fieldsData.value = {};
	if (assignedId.value) {
		isLoading.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id: assignedId.value });
			fieldsData.value = (
				credential && 'data' in credential ? (credential.data ?? {}) : {}
			) as ICredentialDataDecryptedObject;
		} catch {
			fieldsData.value = {};
		} finally {
			isLoading.value = false;
		}
	}
	hydratedType = selectedType.value;
	hydratedData = { ...fieldsData.value };
	hydratedSnapshot = snapshot();
}

watch(
	open,
	async (isOpen) => {
		if (isOpen) await hydrate();
	},
	{ immediate: true },
);

function selectType(nextType: string) {
	if (nextType === selectedType.value) return;
	selectedType.value = nextType;
	fieldsData.value = nextType === hydratedType ? { ...hydratedData } : {};
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const noneLabel = computed(() =>
	store.settings?.searchEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

const readOnly = computed(() => !store.canManageInstanceCredentials);
const isChanged = computed(() => snapshot() !== hydratedSnapshot);

async function handleSave() {
	if (isChanged.value) {
		store.setField(
			'searchConnection',
			selectedType.value
				? { type: selectedType.value, data: { ...toRaw(fieldsData.value) } }
				: null,
		);
		if (!(await store.save())) return;
		void store.refreshCredentials();
	}
	open.value = false;
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('settings.n8nAgent.searchDialog.title')"
		:description="i18n.baseText('settings.n8nAgent.searchDialog.description')"
		data-test-id="n8n-agent-search-dialog"
	>
		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.searchCredential.label')">
				<N8nSelect
					:model-value="selectedType"
					size="medium"
					:disabled="store.isSaving || readOnly"
					:placeholder="i18n.baseText('settings.n8nAgent.searchCredential.placeholder')"
					data-test-id="n8n-agent-search-provider-select"
					@update:model-value="selectType(String($event ?? ''))"
				>
					<N8nOption value="" :label="noneLabel" />
					<N8nOption
						v-for="option in providerOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<ConnectionFields
				v-if="selectedType && !isLoading"
				:credential-type="selectedType"
				:data="fieldsData"
				data-test-id="n8n-agent-search-connection-fields"
				@update="setFieldValue"
			/>
		</div>

		<N8nDialogFooter>
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
				:disabled="store.isSaving || isLoading || readOnly || !isChanged"
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
</style>
