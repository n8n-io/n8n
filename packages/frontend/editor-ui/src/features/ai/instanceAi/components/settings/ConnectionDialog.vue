<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import {
	INSTANCE_AI_MODEL_CREDENTIAL_TYPES,
	INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
	type InstanceAiProviderConnection,
} from '@n8n/api-types';
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
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import type { IUpdateInformation } from '@/Interface';
import Banner from '@/app/components/Banner.vue';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { SANDBOX_PROVIDER_LABELS, type InstanceAiConnectionKind } from '../../constants';
import { useInstanceAiSetupSteps } from '../../composables/useInstanceAiSetupSteps';
import { useInstanceCredentialTest } from '../../composables/useInstanceCredentialTest';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ConnectionFields from './ConnectionFields.vue';

const DAYTONA_DEFAULT_API_URL = 'https://app.daytona.io/api';
const N8N_SANDBOX_HEADER = 'x-api-key';
const DEFAULT_SEARCH_TYPE = 'searXngApi';
const SANDBOX_CREDENTIAL_TYPES = ['daytonaApi', 'httpHeaderAuth'];
const SETUP_STEP: Record<InstanceAiConnectionKind, number> = { model: 1, sandbox: 2, search: 3 };

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ kind: InstanceAiConnectionKind; setup?: boolean }>(), {
	setup: false,
});

const emit = defineEmits<{ saved: []; back: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();
const readOnly = computed(() => !store.canManageInstanceCredentials);
const { credentialTestError, isTestingCredential, testCredential, restoreStoredError } =
	useInstanceCredentialTest();
const { stepLabel, isLastStep } = useInstanceAiSetupSteps(SETUP_STEP[props.kind]);

provideWorkflowDocumentStore();

/** For 'sandbox' the selection is a provider ('daytona' | 'n8n-sandbox'); otherwise a credential type. */
const selection = ref('');
const selectedCredentialId = ref('');
const selectingExistingCredential = ref(false);
const fieldsData = ref<ICredentialDataDecryptedObject>({});
/** The one extra input a kind may have: the model name (model) or the API key (n8n sandbox). */
const extraValue = ref('');
const isLoading = ref(false);

let hydratedSelection = '';
let hydratedData: ICredentialDataDecryptedObject = {};
let hydratedExtra = '';
let hydratedSnapshot = '';

const usingExisting = computed(() => readOnly.value || selectingExistingCredential.value);

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

interface DialogCopy {
	idPrefix: string;
	titleKey: BaseTextKey;
	setupTitleKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	setupDescriptionKey?: BaseTextKey;
	fieldLabelKey: BaseTextKey;
	placeholderKey?: BaseTextKey;
	providerHintKey?: BaseTextKey;
	footnoteKey?: BaseTextKey;
	testName: string;
}

const DIALOG_COPY: Record<InstanceAiConnectionKind, DialogCopy> = {
	model: {
		idPrefix: 'n8n-agent-model',
		titleKey: 'settings.n8nAgent.modelDialog.title',
		setupTitleKey: 'settings.n8nAgent.modelDialog.setupTitle',
		descriptionKey: 'settings.n8nAgent.modelDialog.description',
		setupDescriptionKey: 'settings.n8nAgent.modelDialog.setupDescription',
		fieldLabelKey: 'settings.n8nAgent.modelCredential.field',
		placeholderKey: 'settings.n8nAgent.modelCredential.placeholder',
		footnoteKey: 'settings.n8nAgent.modelDialog.footnote',
		testName: 'AI Assistant model',
	},
	sandbox: {
		idPrefix: 'n8n-agent-sandbox',
		titleKey: 'settings.n8nAgent.sandboxDialog.title',
		setupTitleKey: 'settings.n8nAgent.sandboxDialog.setupTitle',
		descriptionKey: 'settings.n8nAgent.sandboxDialog.description',
		fieldLabelKey: 'settings.n8nAgent.sandboxDialog.provider',
		providerHintKey: 'settings.n8nAgent.sandboxDialog.providerHint',
		testName: 'AI Assistant sandbox',
	},
	search: {
		idPrefix: 'n8n-agent-search',
		titleKey: 'settings.n8nAgent.searchDialog.title',
		setupTitleKey: 'settings.n8nAgent.searchDialog.setupTitle',
		descriptionKey: 'settings.n8nAgent.searchDialog.description',
		fieldLabelKey: 'settings.n8nAgent.searchCredential.label',
		placeholderKey: 'settings.n8nAgent.searchCredential.placeholder',
		testName: 'AI Assistant web search',
	},
};

const copy = DIALOG_COPY[props.kind];

function environmentConfigured(): boolean {
	if (props.kind === 'model') return Boolean(store.settings?.modelEnvConfigured);
	if (props.kind === 'sandbox') return Boolean(store.settings?.sandboxEnvConfigured);
	return Boolean(store.settings?.searchEnvConfigured);
}

function getAssignedId(): string | null {
	if (props.kind === 'model') return store.settings?.modelCredentialId ?? null;
	if (props.kind === 'sandbox') {
		return store.settings?.daytonaCredentialId ?? store.settings?.n8nSandboxCredentialId ?? null;
	}
	return store.settings?.searchCredentialId ?? null;
}

function getAssignedSelection(): string {
	if (props.kind === 'sandbox') {
		if (store.settings?.daytonaCredentialId) return 'daytona';
		if (store.settings?.n8nSandboxCredentialId) return 'n8n-sandbox';
		return '';
	}
	const credentials =
		props.kind === 'model' ? store.instanceModelCredentials : store.serviceCredentials;
	return credentials.find(({ id }) => id === getAssignedId())?.type ?? '';
}

function getDefaultSelection(): string {
	if (props.kind === 'model') return '';
	if (props.kind === 'sandbox') {
		return store.settings?.sandboxEnvConfigured ? '' : (store.settings?.sandboxProvider ?? '');
	}
	return store.settings?.searchEnvConfigured ? '' : DEFAULT_SEARCH_TYPE;
}

function getProviderOptions(): Array<{ value: string; label: string }> {
	if (props.kind === 'sandbox') {
		return [
			{ value: 'daytona', label: SANDBOX_PROVIDER_LABELS.daytona },
			{ value: 'n8n-sandbox', label: SANDBOX_PROVIDER_LABELS['n8n-sandbox'] },
		];
	}
	const credentialTypes =
		props.kind === 'model'
			? INSTANCE_AI_MODEL_CREDENTIAL_TYPES
			: INSTANCE_AI_SEARCH_CREDENTIAL_TYPES;
	return credentialTypes.map((type) => ({ value: type, label: credentialTypeLabel(type) }));
}

function getExistingCredentials(): InstanceAiProviderConnection[] {
	if (props.kind === 'model') return store.instanceModelCredentials;
	const allowedTypes =
		props.kind === 'sandbox' ? SANDBOX_CREDENTIAL_TYPES : INSTANCE_AI_SEARCH_CREDENTIAL_TYPES;
	return store.serviceCredentials.filter(({ type }) =>
		allowedTypes.some((allowed) => allowed === type),
	);
}

function existingCredentialLabel(credential: InstanceAiProviderConnection): string {
	return props.kind === 'sandbox'
		? credential.name
		: `${credential.name} · ${credentialTypeLabel(credential.type)}`;
}

function selectionForCredential(credential: InstanceAiProviderConnection): string {
	if (props.kind !== 'sandbox') return credential.type;
	return credential.type === 'daytonaApi' ? 'daytona' : 'n8n-sandbox';
}

function credentialTypeFor(selected: string): string {
	if (props.kind !== 'sandbox') return selected;
	return selected === 'daytona' ? 'daytonaApi' : 'httpHeaderAuth';
}

function seedData(selected: string): ICredentialDataDecryptedObject {
	return props.kind === 'sandbox' && selected === 'daytona'
		? { apiUrl: DAYTONA_DEFAULT_API_URL }
		: {};
}

function applyLoadedData(data: ICredentialDataDecryptedObject): void {
	if (
		props.kind === 'sandbox' &&
		!store.settings?.daytonaCredentialId &&
		store.settings?.n8nSandboxCredentialId
	) {
		extraValue.value = typeof data.value === 'string' ? data.value : '';
		return;
	}
	fieldsData.value = data;
}

function newConnectionIsComplete(selected: string): boolean {
	if (props.kind === 'model') return true;
	if (props.kind === 'sandbox') {
		if (selected === 'n8n-sandbox') return extraValue.value.trim().length > 0;
		return (
			typeof fieldsData.value.apiUrl === 'string' &&
			fieldsData.value.apiUrl.trim().length > 0 &&
			typeof fieldsData.value.apiKey === 'string' &&
			fieldsData.value.apiKey.trim().length > 0
		);
	}
	const field = selected === 'braveSearchApi' ? 'apiKey' : 'apiUrl';
	const value = fieldsData.value[field];
	return typeof value === 'string' && value.trim().length > 0;
}

function buildConnectionData(): ICredentialDataDecryptedObject {
	if (props.kind === 'sandbox' && selection.value === 'n8n-sandbox') {
		return { name: N8N_SANDBOX_HEADER, value: extraValue.value.trim() };
	}
	return { ...toRaw(fieldsData.value) };
}

function stageExisting(): void {
	if (props.kind === 'model') {
		store.setField('modelCredentialId', selectedCredentialId.value || null);
		store.setField('modelName', selectedCredentialId.value ? extraValue.value.trim() : undefined);
		return;
	}
	if (props.kind === 'search') {
		store.setField('searchCredentialId', selectedCredentialId.value || null);
		return;
	}
	store.setField(
		'daytonaCredentialId',
		selection.value === 'daytona' ? selectedCredentialId.value : null,
	);
	store.setField(
		'n8nSandboxCredentialId',
		selection.value === 'n8n-sandbox' ? selectedCredentialId.value : null,
	);
	if (selection.value === 'daytona' || selection.value === 'n8n-sandbox') {
		store.setField('sandboxProvider', selection.value);
	}
}

function stageNew(connectionData: ICredentialDataDecryptedObject): void {
	if (props.kind === 'model') {
		store.setField('modelConnection', { type: selection.value, data: connectionData });
		store.setField('modelName', extraValue.value.trim());
		return;
	}
	if (props.kind === 'sandbox') {
		store.setField('sandboxConnection', {
			type: credentialTypeFor(selection.value),
			data: connectionData,
		});
		return;
	}
	store.setField('searchConnection', { type: selection.value, data: connectionData });
}

function stageClear(): void {
	if (props.kind === 'model') {
		store.setField('modelConnection', null);
		store.setField('modelName', undefined);
	} else if (props.kind === 'sandbox') {
		store.setField('sandboxConnection', null);
	} else {
		store.setField('searchConnection', null);
	}
}

function refreshCredentials(): void {
	if (props.kind === 'model') void store.refreshInstanceModelCredentials();
	else void store.refreshCredentials();
}

const assignedId = computed(getAssignedId);
const hasSelection = computed(() =>
	usingExisting.value ? selectedCredentialId.value : selection.value,
);
const providerOptions = computed(getProviderOptions);
const existingOptions = computed(getExistingCredentials);

const noneLabel = computed(() =>
	environmentConfigured()
		? i18n.baseText('settings.n8nAgent.connection.none')
		: i18n.baseText('settings.n8nAgent.connection.noneNoEnv'),
);

function snapshot() {
	return JSON.stringify({
		c: usingExisting.value ? selectedCredentialId.value : '',
		e: selectingExistingCredential.value,
		s: selection.value,
		d: fieldsData.value,
		x: extraValue.value,
	});
}

async function hydrate() {
	extraValue.value = props.kind === 'model' ? (store.settings?.modelName ?? '') : '';
	selectedCredentialId.value = assignedId.value ?? '';
	selectingExistingCredential.value = false;
	selection.value = readOnly.value
		? getAssignedSelection()
		: getAssignedSelection() || getDefaultSelection();
	fieldsData.value = seedData(selection.value);
	if (assignedId.value && !readOnly.value) {
		isLoading.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id: assignedId.value });
			const data = (
				credential && 'data' in credential ? (credential.data ?? {}) : {}
			) as ICredentialDataDecryptedObject;
			applyLoadedData(data);
		} catch {
			fieldsData.value = seedData(selection.value);
		} finally {
			isLoading.value = false;
		}
	}
	hydratedSelection = selection.value;
	hydratedData = { ...fieldsData.value };
	hydratedExtra = extraValue.value;
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

function selectOption(next: string) {
	const existingCredential = existingOptions.value.find(({ id }) => id === next);
	if (existingCredential) {
		credentialTestError.value = '';
		selectingExistingCredential.value = true;
		selectedCredentialId.value = existingCredential.id;
		selection.value = selectionForCredential(existingCredential);
		fieldsData.value = {};
		extraValue.value = existingCredential.id === assignedId.value ? hydratedExtra : '';
		return;
	}

	const changedMode = selectingExistingCredential.value;
	if (next === selection.value && !changedMode) return;
	credentialTestError.value = '';
	selectingExistingCredential.value = false;
	selectedCredentialId.value = '';
	selection.value = next;
	// Switching starts from a clean slate; only the hydrated selection keeps its values.
	fieldsData.value = next === hydratedSelection ? { ...hydratedData } : seedData(next);
	extraValue.value = next === hydratedSelection ? hydratedExtra : '';
}

function selectCredential(nextCredentialId: string) {
	if (nextCredentialId === selectedCredentialId.value) return;
	credentialTestError.value = '';
	selectedCredentialId.value = nextCredentialId;
	const credential = existingOptions.value.find(({ id }) => id === nextCredentialId);
	selection.value = credential ? selectionForCredential(credential) : '';
	extraValue.value = nextCredentialId === assignedId.value ? hydratedExtra : '';
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const isComplete = computed(() => {
	if (!hasSelection.value) return true;
	if (props.kind === 'model' && extraValue.value.trim().length === 0) return false;
	if (usingExisting.value) return true;
	return newConnectionIsComplete(selection.value);
});
const isChanged = computed(() => snapshot() !== hydratedSnapshot);
const primaryDisabled = computed(() => {
	if (store.isSaving || isTestingCredential.value || isLoading.value || !isComplete.value)
		return true;
	if (props.setup) return !isChanged.value && !hasSelection.value;
	return !isChanged.value && !credentialTestError.value;
});

async function handlePrimary() {
	const connectionData = buildConnectionData();
	if (
		!usingExisting.value &&
		selection.value &&
		!(await testCredential({
			id: selection.value === getAssignedSelection() ? (assignedId.value ?? '') : '',
			name: copy.testName,
			type: credentialTypeFor(selection.value),
			data: connectionData,
		}))
	)
		return;

	if (isChanged.value) {
		if (usingExisting.value) stageExisting();
		else if (!selection.value) stageClear();
		else stageNew(connectionData);
		if (!(await store.save())) return;
	}
	refreshCredentials();
	// Emit before closing so the host can transition to the next dialog without an all-closed gap.
	emit('saved');
	open.value = false;
}

function handleBack() {
	emit('back');
	open.value = false;
}

const title = computed(() => i18n.baseText(props.setup ? copy.setupTitleKey : copy.titleKey));
const description = computed(() =>
	i18n.baseText(
		props.setup && copy.setupDescriptionKey ? copy.setupDescriptionKey : copy.descriptionKey,
	),
);
const showCancel = computed(() => !props.setup || props.kind === 'model');
const primaryLabel = computed(() => {
	if (credentialTestError.value) return i18n.baseText('credentialEdit.credentialConfig.retry');
	if (props.setup && (props.kind === 'model' || (props.kind === 'sandbox' && !isLastStep.value)))
		return i18n.baseText('settings.n8nAgent.setup.continue');
	return i18n.baseText('generic.save');
});
</script>

<template>
	<N8nDialog v-model:open="open" size="medium" :data-test-id="`${copy.idPrefix}-dialog`">
		<N8nDialogHeader>
			<N8nText
				v-if="setup"
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				:data-test-id="`${copy.idPrefix}-dialog-step`"
			>
				{{ stepLabel }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText(copy.fieldLabelKey)">
				<N8nSelect
					v-if="readOnly"
					:model-value="selectedCredentialId"
					size="medium"
					:disabled="store.isSaving || isLoading"
					:placeholder="copy.placeholderKey ? i18n.baseText(copy.placeholderKey) : undefined"
					:data-test-id="`${copy.idPrefix}-provider-select`"
					@update:model-value="selectCredential(String($event ?? ''))"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
					<N8nOption
						v-for="credential in existingOptions"
						:key="credential.id"
						:value="credential.id"
						:label="existingCredentialLabel(credential)"
					/>
				</N8nSelect>
				<N8nSelect
					v-else
					:model-value="selectingExistingCredential ? selectedCredentialId : selection"
					size="medium"
					:disabled="store.isSaving || isLoading"
					:placeholder="copy.placeholderKey ? i18n.baseText(copy.placeholderKey) : undefined"
					:data-test-id="`${copy.idPrefix}-provider-select`"
					@update:model-value="selectOption(String($event ?? ''))"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
					<N8nOption
						v-for="option in providerOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
					<N8nOption
						v-for="credential in existingOptions"
						:key="credential.id"
						:value="credential.id"
						:label="existingCredentialLabel(credential)"
					/>
				</N8nSelect>
				<N8nText
					v-if="copy.providerHintKey"
					tag="p"
					:class="$style.providerHint"
					size="small"
					color="text-light"
				>
					{{ i18n.baseText(copy.providerHintKey) }}
				</N8nText>
			</N8nInputLabel>

			<ConnectionFields
				v-if="
					!usingExisting &&
					selection &&
					(kind !== 'sandbox' || selection === 'daytona') &&
					!isLoading
				"
				:credential-type="credentialTypeFor(selection)"
				:data="fieldsData"
				:data-test-id="`${copy.idPrefix}-connection-fields`"
				@update="setFieldValue"
			/>

			<N8nInputLabel
				v-if="kind === 'model' && hasSelection"
				:label="i18n.baseText('settings.n8nAgent.modelName.label')"
			>
				<N8nInput
					:model-value="extraValue"
					type="text"
					size="medium"
					:disabled="store.isSaving || isLoading"
					autocomplete="off"
					:spellcheck="false"
					:placeholder="i18n.baseText('settings.n8nAgent.modelName.placeholder')"
					data-test-id="n8n-agent-model-name-input"
					@update:model-value="extraValue = String($event)"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				v-else-if="kind === 'sandbox' && !usingExisting && selection === 'n8n-sandbox'"
				:label="i18n.baseText('settings.n8nAgent.sandboxCredential.apiKey')"
			>
				<N8nInput
					:model-value="extraValue"
					type="password"
					size="medium"
					:disabled="store.isSaving || isLoading"
					autocomplete="off"
					:spellcheck="false"
					data-test-id="n8n-agent-sandbox-api-key-input"
					@update:model-value="extraValue = String($event)"
				/>
			</N8nInputLabel>
		</div>

		<N8nText
			v-if="copy.footnoteKey"
			:class="$style.footnote"
			size="small"
			color="text-light"
			tag="p"
		>
			{{ i18n.baseText(copy.footnoteKey) }}
		</N8nText>
		<Banner
			v-if="credentialTestError"
			theme="danger"
			:message="i18n.baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
			:details="credentialTestError"
			:data-test-id="`${copy.idPrefix}-credential-test-error`"
		/>

		<N8nDialogFooter>
			<N8nButton
				v-if="setup && kind !== 'model'"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.back')"
				:data-test-id="`${copy.idPrefix}-dialog-back`"
				@click="handleBack"
			/>
			<N8nButton
				v-if="setup && kind === 'search'"
				variant="outline"
				size="medium"
				:label="i18n.baseText('settings.n8nAgent.setup.skip')"
				:data-test-id="`${copy.idPrefix}-dialog-skip`"
				@click="open = false"
			/>
			<N8nButton
				v-if="showCancel"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				:data-test-id="`${copy.idPrefix}-dialog-cancel`"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="primaryLabel"
				:loading="isTestingCredential"
				:disabled="primaryDisabled"
				:data-test-id="`${copy.idPrefix}-dialog-save`"
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
	margin: var(--spacing--sm) 0;
	// Long credential forms scroll inside the dialog instead of growing past the viewport.
	max-height: calc(100dvh - 20rem);
	overflow-y: auto;
}

.providerHint {
	margin: var(--spacing--4xs) 0 0;
}

.footnote {
	margin: 0 0 var(--spacing--sm);
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
