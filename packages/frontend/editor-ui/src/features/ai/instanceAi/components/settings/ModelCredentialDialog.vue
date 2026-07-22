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
import Banner from '@/app/components/Banner.vue';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { INSTANCE_MODEL_CREDENTIAL_TYPES } from '../../constants';
import { useInstanceAiSetupSteps } from '../../composables/useInstanceAiSetupSteps';
import { useInstanceCredentialTest } from '../../composables/useInstanceCredentialTest';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ConnectionFields from './ConnectionFields.vue';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ setup?: boolean }>(), { setup: false });

const emit = defineEmits<{ saved: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();
const readOnly = computed(() => !store.canManageInstanceCredentials);
const { credentialTestError, isTestingCredential, testCredential, restoreStoredError } =
	useInstanceCredentialTest();
const { stepLabel } = useInstanceAiSetupSteps(1);

provideWorkflowDocumentStore();

const selectedType = ref('');
const selectedCredentialId = ref('');
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
	return JSON.stringify({
		c: selectedCredentialId.value,
		t: selectedType.value,
		d: fieldsData.value,
		m: modelName.value.trim(),
	});
}

async function hydrate() {
	modelName.value = store.settings?.modelName ?? '';
	selectedCredentialId.value = assignedId.value ?? '';
	selectedType.value = assignedType.value;
	fieldsData.value = {};
	if (assignedId.value && !readOnly.value) {
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
	restoreStoredError(assignedId.value);
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
const existingCredentialOptions = computed(() => store.instanceModelCredentials);

const noneLabel = computed(() =>
	store.settings?.modelEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

function selectType(nextType: string) {
	if (nextType === selectedType.value) return;
	credentialTestError.value = '';
	selectedType.value = nextType;
	// Switching providers starts from a clean slate; only the hydrated provider keeps its values.
	fieldsData.value = nextType === hydratedType ? { ...hydratedData } : {};
	if (nextType !== hydratedType) modelName.value = '';
}

function selectCredential(nextCredentialId: string) {
	if (nextCredentialId === selectedCredentialId.value) return;
	credentialTestError.value = '';
	selectedCredentialId.value = nextCredentialId;
	if (nextCredentialId !== assignedId.value) modelName.value = '';
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const isComplete = computed(() => {
	const hasConnection = readOnly.value ? selectedCredentialId.value : selectedType.value;
	return !hasConnection || modelName.value.trim().length > 0;
});
const isChanged = computed(() => snapshot() !== hydratedSnapshot);
const primaryDisabled = computed(() => {
	if (store.isSaving || isTestingCredential.value || isLoading.value || !isComplete.value)
		return true;
	if (props.setup)
		return !isChanged.value && !(readOnly.value ? selectedCredentialId.value : selectedType.value);
	return !isChanged.value && !credentialTestError.value;
});

async function handlePrimary() {
	const connectionData = { ...toRaw(fieldsData.value) };
	if (
		!readOnly.value &&
		selectedType.value &&
		!(await testCredential({
			id: selectedType.value === assignedType.value ? (assignedId.value ?? '') : '',
			name: 'AI Assistant model',
			type: selectedType.value,
			data: connectionData,
		}))
	)
		return;

	if (isChanged.value) {
		if (readOnly.value) {
			store.setField('modelCredentialId', selectedCredentialId.value || null);
			store.setField('modelName', selectedCredentialId.value ? modelName.value.trim() : undefined);
		} else if (!selectedType.value) {
			store.setField('modelConnection', null);
			store.setField('modelName', undefined);
		} else {
			store.setField('modelConnection', {
				type: selectedType.value,
				data: connectionData,
			});
			store.setField('modelName', modelName.value.trim());
		}
		if (!(await store.save())) return;
	}
	void store.refreshInstanceModelCredentials();
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
				{{ stepLabel }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.modelCredential.field')">
				<N8nSelect
					v-if="readOnly"
					:model-value="selectedCredentialId"
					size="medium"
					:disabled="store.isSaving"
					:placeholder="i18n.baseText('settings.n8nAgent.modelCredential.placeholder')"
					data-test-id="n8n-agent-model-provider-select"
					@update:model-value="selectCredential(String($event ?? ''))"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
					<N8nOption
						v-for="credential in existingCredentialOptions"
						:key="credential.id"
						:value="credential.id"
						:label="`${credential.name} · ${credentialTypeLabel(credential.type)}`"
					/>
				</N8nSelect>
				<N8nSelect
					v-else
					:model-value="selectedType"
					size="medium"
					:disabled="store.isSaving"
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
				v-if="!readOnly && selectedType && !isLoading"
				:credential-type="selectedType"
				:data="fieldsData"
				data-test-id="n8n-agent-model-connection-fields"
				@update="setFieldValue"
			/>

			<N8nInputLabel
				v-if="readOnly ? selectedCredentialId : selectedType"
				:label="i18n.baseText('settings.n8nAgent.modelName.label')"
			>
				<N8nInput
					:model-value="modelName"
					size="medium"
					:disabled="store.isSaving"
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
		<Banner
			v-if="credentialTestError"
			theme="danger"
			:message="i18n.baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
			:details="credentialTestError"
			data-test-id="n8n-agent-model-credential-test-error"
		/>

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
					credentialTestError
						? i18n.baseText('credentialEdit.credentialConfig.retry')
						: setup
							? i18n.baseText('settings.n8nAgent.setup.continue')
							: i18n.baseText('generic.save')
				"
				:loading="isTestingCredential"
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
