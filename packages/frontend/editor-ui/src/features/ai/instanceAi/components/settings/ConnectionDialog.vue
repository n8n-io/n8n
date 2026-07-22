<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { InstanceAiModelCredential } from '@n8n/api-types';
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
import {
	INSTANCE_MODEL_CREDENTIAL_TYPES,
	INSTANCE_SEARCH_CREDENTIAL_TYPES,
	SANDBOX_PROVIDER_LABELS,
	type InstanceAiConnectionKind,
} from '../../constants';
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

interface KindSpec {
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
	showBackInSetup: boolean;
	showSkipInSetup: boolean;
	continueInSetup: () => boolean;
	envConfigured: () => boolean;
	assignedId: () => string | null;
	assignedSelection: () => string;
	/** Preselected when opening with nothing assigned (never applied in read-only mode). */
	defaultSelection: () => string;
	options: () => Array<{ value: string; label: string }>;
	existingCredentials: () => InstanceAiModelCredential[];
	existingCredentialLabel: (credential: InstanceAiModelCredential) => string;
	selectionFor: (credential: InstanceAiModelCredential) => string;
	credentialTypeFor: (selection: string) => string;
	seedData: (selection: string) => ICredentialDataDecryptedObject;
	showsFields: (selection: string) => boolean;
	applyLoadedData: (data: ICredentialDataDecryptedObject) => void;
	initialExtra: () => string;
	/** Whether the extra input must be filled whenever a connection is active (any mode). */
	extraRequired: boolean;
	newDataComplete: (selection: string) => boolean;
	extraInput?: {
		labelKey: BaseTextKey;
		placeholderKey?: BaseTextKey;
		inputType: 'text' | 'password';
		testId: string;
		visible: () => boolean;
	};
	buildConnectionData: () => ICredentialDataDecryptedObject;
	stageExisting: () => void;
	stageNew: (connectionData: ICredentialDataDecryptedObject) => void;
	stageClear: () => void;
	refresh: () => void;
}

const specs: Record<InstanceAiConnectionKind, KindSpec> = {
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
		showBackInSetup: false,
		showSkipInSetup: false,
		continueInSetup: () => true,
		envConfigured: () => Boolean(store.settings?.modelEnvConfigured),
		assignedId: () => store.settings?.modelCredentialId ?? null,
		assignedSelection: () =>
			store.instanceModelCredentials.find(
				(credential) => credential.id === store.settings?.modelCredentialId,
			)?.type ?? '',
		defaultSelection: () => '',
		options: () =>
			INSTANCE_MODEL_CREDENTIAL_TYPES.map((type) => ({
				value: type,
				label: credentialTypeLabel(type),
			})),
		existingCredentials: () => store.instanceModelCredentials,
		existingCredentialLabel: (credential) =>
			`${credential.name} · ${credentialTypeLabel(credential.type)}`,
		selectionFor: (credential) => credential.type,
		credentialTypeFor: (selected) => selected,
		seedData: () => ({}),
		showsFields: (selected) => Boolean(selected),
		applyLoadedData: (data) => {
			fieldsData.value = data;
		},
		initialExtra: () => store.settings?.modelName ?? '',
		extraRequired: true,
		newDataComplete: () => true,
		extraInput: {
			labelKey: 'settings.n8nAgent.modelName.label',
			placeholderKey: 'settings.n8nAgent.modelName.placeholder',
			inputType: 'text',
			testId: 'n8n-agent-model-name-input',
			visible: () => Boolean(usingExisting.value ? selectedCredentialId.value : selection.value),
		},
		buildConnectionData: () => ({ ...toRaw(fieldsData.value) }),
		stageExisting: () => {
			store.setField('modelCredentialId', selectedCredentialId.value || null);
			store.setField('modelName', selectedCredentialId.value ? extraValue.value.trim() : undefined);
		},
		stageNew: (connectionData) => {
			store.setField('modelConnection', { type: selection.value, data: connectionData });
			store.setField('modelName', extraValue.value.trim());
		},
		stageClear: () => {
			store.setField('modelConnection', null);
			store.setField('modelName', undefined);
		},
		refresh: () => void store.refreshInstanceModelCredentials(),
	},
	sandbox: {
		idPrefix: 'n8n-agent-sandbox',
		titleKey: 'settings.n8nAgent.sandboxDialog.title',
		setupTitleKey: 'settings.n8nAgent.sandboxDialog.setupTitle',
		descriptionKey: 'settings.n8nAgent.sandboxDialog.description',
		fieldLabelKey: 'settings.n8nAgent.sandboxDialog.provider',
		providerHintKey: 'settings.n8nAgent.sandboxDialog.providerHint',
		testName: 'AI Assistant sandbox',
		showBackInSetup: true,
		showSkipInSetup: false,
		continueInSetup: () => !isLastStep.value,
		envConfigured: () => Boolean(store.settings?.sandboxEnvConfigured),
		assignedId: () =>
			store.settings?.daytonaCredentialId ?? store.settings?.n8nSandboxCredentialId ?? null,
		assignedSelection: () =>
			store.settings?.daytonaCredentialId
				? 'daytona'
				: store.settings?.n8nSandboxCredentialId
					? 'n8n-sandbox'
					: '',
		defaultSelection: () =>
			store.settings?.sandboxEnvConfigured ? '' : (store.settings?.sandboxProvider ?? ''),
		options: () => [
			{ value: 'daytona', label: SANDBOX_PROVIDER_LABELS.daytona },
			{ value: 'n8n-sandbox', label: SANDBOX_PROVIDER_LABELS['n8n-sandbox'] },
		],
		existingCredentials: () =>
			store.serviceCredentials.filter((credential) =>
				SANDBOX_CREDENTIAL_TYPES.includes(credential.type),
			),
		existingCredentialLabel: (credential) => credential.name,
		selectionFor: (credential) => (credential.type === 'daytonaApi' ? 'daytona' : 'n8n-sandbox'),
		credentialTypeFor: (selected) => (selected === 'daytona' ? 'daytonaApi' : 'httpHeaderAuth'),
		seedData: (selected): ICredentialDataDecryptedObject => {
			if (selected === 'daytona') return { apiUrl: DAYTONA_DEFAULT_API_URL };
			return {};
		},
		showsFields: (selected) => selected === 'daytona',
		applyLoadedData: (data) => {
			if (!store.settings?.daytonaCredentialId && store.settings?.n8nSandboxCredentialId) {
				extraValue.value = typeof data.value === 'string' ? data.value : '';
			} else {
				fieldsData.value = data;
			}
		},
		initialExtra: () => '',
		extraRequired: false,
		newDataComplete: (selected) => {
			if (selected === 'n8n-sandbox') return extraValue.value.trim().length > 0;
			return (
				typeof fieldsData.value.apiUrl === 'string' &&
				fieldsData.value.apiUrl.trim().length > 0 &&
				typeof fieldsData.value.apiKey === 'string' &&
				fieldsData.value.apiKey.trim().length > 0
			);
		},
		extraInput: {
			labelKey: 'settings.n8nAgent.sandboxCredential.apiKey',
			inputType: 'password',
			testId: 'n8n-agent-sandbox-api-key-input',
			visible: () => !usingExisting.value && selection.value === 'n8n-sandbox',
		},
		buildConnectionData: () =>
			selection.value === 'daytona'
				? { ...toRaw(fieldsData.value) }
				: { name: N8N_SANDBOX_HEADER, value: extraValue.value.trim() },
		stageExisting: () => {
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
		},
		stageNew: (connectionData) => {
			if (selection.value === 'daytona') {
				store.setField('sandboxConnection', { type: 'daytonaApi', data: connectionData });
			} else {
				store.setField('sandboxConnection', {
					type: 'httpHeaderAuth',
					data: { name: N8N_SANDBOX_HEADER, value: extraValue.value.trim() },
				});
			}
		},
		stageClear: () => store.setField('sandboxConnection', null),
		refresh: () => void store.refreshCredentials(),
	},
	search: {
		idPrefix: 'n8n-agent-search',
		titleKey: 'settings.n8nAgent.searchDialog.title',
		setupTitleKey: 'settings.n8nAgent.searchDialog.setupTitle',
		descriptionKey: 'settings.n8nAgent.searchDialog.description',
		fieldLabelKey: 'settings.n8nAgent.searchCredential.label',
		placeholderKey: 'settings.n8nAgent.searchCredential.placeholder',
		testName: 'AI Assistant web search',
		showBackInSetup: true,
		showSkipInSetup: true,
		continueInSetup: () => false,
		envConfigured: () => Boolean(store.settings?.searchEnvConfigured),
		assignedId: () => store.settings?.searchCredentialId ?? null,
		assignedSelection: () =>
			store.serviceCredentials.find(
				(credential) => credential.id === store.settings?.searchCredentialId,
			)?.type ?? '',
		defaultSelection: () => (store.settings?.searchEnvConfigured ? '' : DEFAULT_SEARCH_TYPE),
		options: () =>
			INSTANCE_SEARCH_CREDENTIAL_TYPES.map((type) => ({
				value: type,
				label: credentialTypeLabel(type),
			})),
		existingCredentials: () =>
			store.serviceCredentials.filter((credential) =>
				INSTANCE_SEARCH_CREDENTIAL_TYPES.some((type) => type === credential.type),
			),
		existingCredentialLabel: (credential) =>
			`${credential.name} · ${credentialTypeLabel(credential.type)}`,
		selectionFor: (credential) => credential.type,
		credentialTypeFor: (selected) => selected,
		seedData: () => ({}),
		showsFields: (selected) => Boolean(selected),
		applyLoadedData: (data) => {
			fieldsData.value = data;
		},
		initialExtra: () => '',
		extraRequired: false,
		newDataComplete: (selected) => {
			const field = selected === 'braveSearchApi' ? 'apiKey' : 'apiUrl';
			const value = fieldsData.value[field];
			return typeof value === 'string' && value.trim().length > 0;
		},
		buildConnectionData: () => ({ ...toRaw(fieldsData.value) }),
		stageExisting: () => store.setField('searchCredentialId', selectedCredentialId.value || null),
		stageNew: (connectionData) =>
			store.setField('searchConnection', { type: selection.value, data: connectionData }),
		stageClear: () => store.setField('searchConnection', null),
		refresh: () => void store.refreshCredentials(),
	},
};

const spec = specs[props.kind];

const assignedId = computed(() => spec.assignedId());
const hasSelection = computed(() =>
	usingExisting.value ? selectedCredentialId.value : selection.value,
);
const providerOptions = computed(() => spec.options());
const existingOptions = computed(() => spec.existingCredentials());

const noneLabel = computed(() =>
	spec.envConfigured()
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
	extraValue.value = spec.initialExtra();
	selectedCredentialId.value = assignedId.value ?? '';
	selectingExistingCredential.value = false;
	selection.value = readOnly.value
		? spec.assignedSelection()
		: spec.assignedSelection() || spec.defaultSelection();
	fieldsData.value = spec.seedData(selection.value);
	if (assignedId.value && !readOnly.value) {
		isLoading.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id: assignedId.value });
			const data = (
				credential && 'data' in credential ? (credential.data ?? {}) : {}
			) as ICredentialDataDecryptedObject;
			spec.applyLoadedData(data);
		} catch {
			fieldsData.value = spec.seedData(selection.value);
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
		selection.value = spec.selectionFor(existingCredential);
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
	fieldsData.value = next === hydratedSelection ? { ...hydratedData } : spec.seedData(next);
	extraValue.value = next === hydratedSelection ? hydratedExtra : '';
}

function selectCredential(nextCredentialId: string) {
	if (nextCredentialId === selectedCredentialId.value) return;
	credentialTestError.value = '';
	selectedCredentialId.value = nextCredentialId;
	const credential = existingOptions.value.find(({ id }) => id === nextCredentialId);
	selection.value = credential ? spec.selectionFor(credential) : '';
	extraValue.value = nextCredentialId === assignedId.value ? hydratedExtra : '';
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const isComplete = computed(() => {
	if (!hasSelection.value) return true;
	if (spec.extraRequired && extraValue.value.trim().length === 0) return false;
	if (usingExisting.value) return true;
	return spec.newDataComplete(selection.value);
});
const isChanged = computed(() => snapshot() !== hydratedSnapshot);
const primaryDisabled = computed(() => {
	if (store.isSaving || isTestingCredential.value || isLoading.value || !isComplete.value)
		return true;
	if (props.setup) return !isChanged.value && !hasSelection.value;
	return !isChanged.value && !credentialTestError.value;
});

async function handlePrimary() {
	const connectionData = spec.buildConnectionData();
	if (
		!usingExisting.value &&
		selection.value &&
		!(await testCredential({
			id: selection.value === spec.assignedSelection() ? (assignedId.value ?? '') : '',
			name: spec.testName,
			type: spec.credentialTypeFor(selection.value),
			data: connectionData,
		}))
	)
		return;

	if (isChanged.value) {
		if (usingExisting.value) spec.stageExisting();
		else if (!selection.value) spec.stageClear();
		else spec.stageNew(connectionData);
		if (!(await store.save())) return;
	}
	spec.refresh();
	// Emit before closing so the host can transition to the next dialog without an all-closed gap.
	emit('saved');
	open.value = false;
}

function handleBack() {
	emit('back');
	open.value = false;
}

const title = computed(() => i18n.baseText(props.setup ? spec.setupTitleKey : spec.titleKey));
const description = computed(() =>
	i18n.baseText(
		props.setup && spec.setupDescriptionKey ? spec.setupDescriptionKey : spec.descriptionKey,
	),
);
const showCancel = computed(() => !props.setup || (!spec.showBackInSetup && !spec.showSkipInSetup));
const primaryLabel = computed(() => {
	if (credentialTestError.value) return i18n.baseText('credentialEdit.credentialConfig.retry');
	if (props.setup && spec.continueInSetup())
		return i18n.baseText('settings.n8nAgent.setup.continue');
	return i18n.baseText('generic.save');
});
</script>

<template>
	<N8nDialog v-model:open="open" size="medium" :data-test-id="`${spec.idPrefix}-dialog`">
		<N8nDialogHeader>
			<N8nText
				v-if="setup"
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				:data-test-id="`${spec.idPrefix}-dialog-step`"
			>
				{{ stepLabel }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText(spec.fieldLabelKey)">
				<N8nSelect
					v-if="readOnly"
					:model-value="selectedCredentialId"
					size="medium"
					:disabled="store.isSaving || isLoading"
					:placeholder="spec.placeholderKey ? i18n.baseText(spec.placeholderKey) : undefined"
					:data-test-id="`${spec.idPrefix}-provider-select`"
					@update:model-value="selectCredential(String($event ?? ''))"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
					<N8nOption
						v-for="credential in existingOptions"
						:key="credential.id"
						:value="credential.id"
						:label="spec.existingCredentialLabel(credential)"
					/>
				</N8nSelect>
				<N8nSelect
					v-else
					:model-value="selectingExistingCredential ? selectedCredentialId : selection"
					size="medium"
					:disabled="store.isSaving || isLoading"
					:placeholder="spec.placeholderKey ? i18n.baseText(spec.placeholderKey) : undefined"
					:data-test-id="`${spec.idPrefix}-provider-select`"
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
						:label="spec.existingCredentialLabel(credential)"
					/>
				</N8nSelect>
				<N8nText
					v-if="spec.providerHintKey"
					tag="p"
					:class="$style.providerHint"
					size="small"
					color="text-light"
				>
					{{ i18n.baseText(spec.providerHintKey) }}
				</N8nText>
			</N8nInputLabel>

			<ConnectionFields
				v-if="!usingExisting && selection && spec.showsFields(selection) && !isLoading"
				:credential-type="spec.credentialTypeFor(selection)"
				:data="fieldsData"
				:data-test-id="`${spec.idPrefix}-connection-fields`"
				@update="setFieldValue"
			/>

			<N8nInputLabel
				v-if="spec.extraInput && spec.extraInput.visible()"
				:label="i18n.baseText(spec.extraInput.labelKey)"
			>
				<N8nInput
					:model-value="extraValue"
					:type="spec.extraInput.inputType"
					size="medium"
					:disabled="store.isSaving || isLoading"
					autocomplete="off"
					:spellcheck="false"
					:placeholder="
						spec.extraInput.placeholderKey
							? i18n.baseText(spec.extraInput.placeholderKey)
							: undefined
					"
					:data-test-id="spec.extraInput.testId"
					@update:model-value="extraValue = String($event)"
				/>
			</N8nInputLabel>
		</div>

		<N8nText
			v-if="spec.footnoteKey"
			:class="$style.footnote"
			size="small"
			color="text-light"
			tag="p"
		>
			{{ i18n.baseText(spec.footnoteKey) }}
		</N8nText>
		<Banner
			v-if="credentialTestError"
			theme="danger"
			:message="i18n.baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
			:details="credentialTestError"
			:data-test-id="`${spec.idPrefix}-credential-test-error`"
		/>

		<N8nDialogFooter>
			<N8nButton
				v-if="setup && spec.showBackInSetup"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.back')"
				:data-test-id="`${spec.idPrefix}-dialog-back`"
				@click="handleBack"
			/>
			<N8nButton
				v-if="setup && spec.showSkipInSetup"
				variant="outline"
				size="medium"
				:label="i18n.baseText('settings.n8nAgent.setup.skip')"
				:data-test-id="`${spec.idPrefix}-dialog-skip`"
				@click="open = false"
			/>
			<N8nButton
				v-if="showCancel"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				:data-test-id="`${spec.idPrefix}-dialog-cancel`"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="primaryLabel"
				:loading="isTestingCredential"
				:disabled="primaryDisabled"
				:data-test-id="`${spec.idPrefix}-dialog-save`"
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
