<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation } from '@/Interface';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { INSTANCE_MODEL_CREDENTIAL_TYPES } from '../../constants';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ConnectionFields from './ConnectionFields.vue';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ setup?: boolean }>(), { setup: false });

const emit = defineEmits<{ saved: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

provideWorkflowDocumentStore();

const selectedType = ref('');
const fieldsData = ref<ICredentialDataDecryptedObject>({});
const modelName = ref('');
const isLoading = ref(false);

let hydratedType = '';
let hydratedData: ICredentialDataDecryptedObject = {};
let hydratedSnapshot = '';

const assignedId = computed(() => store.settings?.modelCredentialId ?? null);
const assignedType = computed(() =>
	assignedId.value
		? (store.instanceModelCredentials.find((credential) => credential.id === assignedId.value)
				?.type ?? '')
		: '',
);

function snapshot() {
	return JSON.stringify({ t: selectedType.value, d: fieldsData.value, m: modelName.value.trim() });
}

async function hydrate() {
	modelName.value = store.settings?.modelName ?? '';
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

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

const providerOptions = computed(() =>
	INSTANCE_MODEL_CREDENTIAL_TYPES.map((type) => ({
		value: type,
		label: credentialTypeLabel(type),
	})),
);

const noneLabel = computed(() =>
	store.settings?.modelEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

function selectType(nextType: string) {
	if (nextType === selectedType.value) return;
	selectedType.value = nextType;
	// Switching providers starts from a clean slate; only the hydrated provider keeps its values.
	fieldsData.value = nextType === hydratedType ? { ...hydratedData } : {};
	if (nextType !== hydratedType) modelName.value = '';
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const readOnly = computed(() => !store.canManageInstanceCredentials);
const isComplete = computed(() => !selectedType.value || modelName.value.trim().length > 0);
const isChanged = computed(() => snapshot() !== hydratedSnapshot);
const primaryDisabled = computed(() => {
	if (store.isSaving || isLoading.value || readOnly.value || !isComplete.value) return true;
	if (props.setup) return !isChanged.value && !selectedType.value;
	return !isChanged.value;
});

async function handlePrimary() {
	if (isChanged.value) {
		if (!selectedType.value) {
			store.setField('modelConnection', null);
			store.setField('modelName', undefined);
		} else {
			store.setField('modelConnection', {
				type: selectedType.value,
				data: { ...toRaw(fieldsData.value) },
			});
			store.setField('modelName', modelName.value.trim());
		}
		if (!(await store.save())) return;
		void store.refreshInstanceModelCredentials();
	}
	open.value = false;
	emit('saved');
}

const title = computed(() =>
	props.setup
		? i18n.baseText('settings.n8nAgent.modelDialog.setupTitle')
		: i18n.baseText('settings.n8nAgent.modelDialog.title'),
);
const description = computed(() =>
	props.setup
		? i18n.baseText('settings.n8nAgent.modelDialog.setupDescription')
		: i18n.baseText('settings.n8nAgent.modelDialog.description'),
);
</script>

<template>
	<N8nDialog v-model:open="open" size="medium" data-test-id="n8n-agent-model-dialog">
		<N8nDialogHeader>
			<N8nText
				v-if="setup"
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				data-test-id="n8n-agent-model-dialog-step"
			>
				{{ i18n.baseText('settings.n8nAgent.setup.step1') }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.modelCredential.field')">
				<N8nSelect
					:model-value="selectedType"
					size="medium"
					:disabled="store.isSaving || readOnly"
					:placeholder="i18n.baseText('settings.n8nAgent.modelCredential.placeholder')"
					data-test-id="n8n-agent-model-provider-select"
					@update:model-value="selectType(String($event ?? ''))"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
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
				data-test-id="n8n-agent-model-connection-fields"
				@update="setFieldValue"
			/>

			<N8nInputLabel
				v-if="selectedType"
				:label="i18n.baseText('settings.n8nAgent.modelName.label')"
			>
				<N8nInput
					:model-value="modelName"
					size="medium"
					:disabled="store.isSaving || readOnly"
					autocomplete="off"
					:spellcheck="false"
					:placeholder="i18n.baseText('settings.n8nAgent.modelName.placeholder')"
					data-test-id="n8n-agent-model-name-input"
					@update:model-value="modelName = String($event)"
				/>
			</N8nInputLabel>
		</div>

		<N8nText :class="$style.footnote" size="small" color="text-light" tag="p">
			{{ i18n.baseText('settings.n8nAgent.modelDialog.footnote') }}
		</N8nText>

		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="n8n-agent-model-dialog-cancel"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="
					setup ? i18n.baseText('settings.n8nAgent.setup.continue') : i18n.baseText('generic.save')
				"
				:disabled="primaryDisabled"
				data-test-id="n8n-agent-model-dialog-save"
				@click="handlePrimary"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--sm);
}

.footnote {
	margin: var(--spacing--sm) 0 0;
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
