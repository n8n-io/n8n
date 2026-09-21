<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { AgentJsonVectorStoreConfig, AgentVectorStoreProvider } from '@n8n/api-types';
import { VECTOR_STORE_NAME_REGEX, VECTOR_STORE_USE_WHEN_MAX_LENGTH } from '@n8n/api-types';
import { N8nButton, N8nFormInput, N8nIcon, N8nInputLabel, N8nText } from '@n8n/design-system';
import type { Rule, RuleGroup } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getProviderCredentialTypes } from '../model-providers';
import { testAgentVectorStore } from '../composables/useAgentApi';
import {
	AGENT_EMBEDDING_PROVIDERS,
	AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS,
	getEmbeddingModelProvider,
	getEmbeddingModelsForProvider,
	type AgentEmbeddingProvider,
} from '../vector-stores';
import AgentCredentialSelect, { type AgentCredentialOption } from './AgentCredentialSelect.vue';
import EmbeddingModelSelector from './EmbeddingModelSelector.vue';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';

type AddVectorStoreModalData = {
	projectId: string;
	agentId: string;
	existingNames: string[];
	vectorStore?: never;
	onConfirm: (vectorStore: AgentJsonVectorStoreConfig) => void;
	onRemove?: never;
};

type EditVectorStoreModalData = {
	projectId: string;
	agentId: string;
	existingNames: string[];
	vectorStore: AgentJsonVectorStoreConfig;
	onConfirm: (vectorStore: AgentJsonVectorStoreConfig) => void;
	onRemove?: (name: string) => void;
};

export type AgentVectorStoresModalData = AddVectorStoreModalData | EditVectorStoreModalData;

const props = defineProps<{
	modalName: string;
	data: AgentVectorStoresModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const { showMessage, showError } = useToast();
const rootStore = useRootStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const providerOrder: AgentVectorStoreProvider[] = ['pinecone', 'supabase', 'qdrant', 'postgres'];

const isEditing = computed(() => Boolean(props.data.vectorStore));
const selectedProvider = ref<AgentVectorStoreProvider | null>(
	props.data.vectorStore?.provider ?? null,
);
const providerDefinition = computed(() =>
	selectedProvider.value ? AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[selectedProvider.value] : null,
);
const currentStep = computed(() => (selectedProvider.value ? 'configure' : 'select'));
const modalTitle = computed(() =>
	selectedProvider.value ? name.value : i18n.baseText('agents.builder.vectorStores.modal.title'),
);

const existing = props.data.vectorStore;
const name = ref(
	existing?.name ?? i18n.baseText('agents.builder.vectorStores.modal.defaultName' as BaseTextKey),
);
const nameTouched = ref(isEditing.value);
const credential = ref(existing?.credential ?? '');
const indexName = ref(existing && existing.provider === 'pinecone' ? existing.indexName : '');
const namespace = ref(
	existing && existing.provider === 'pinecone' ? (existing.namespace ?? '') : '',
);
const collectionName = ref(
	existing && existing.provider === 'qdrant' ? existing.collectionName : '',
);
const tableName = ref(
	existing && (existing.provider === 'supabase' || existing.provider === 'postgres')
		? existing.tableName
		: '',
);
const queryName = ref(
	existing && existing.provider === 'supabase' ? (existing.queryName ?? '') : '',
);
const embeddingModel = ref(existing?.embedding.model ?? '');
const embeddingCredential = ref(existing?.embedding.credential ?? '');
const useWhen = ref(existing?.useWhen ?? '');

const testing = ref(false);
const submitted = ref(false);

const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingCredentialField = ref<'credential' | 'embeddingCredential' | null>(null);
const pendingCredentialType = ref<string | null>(null);

// Tracks whether each N8nFormInput currently reports a valid value. N8nFormInput
// already handles "don't show the error until the field is touched" internally
// (validateOnBlur) — this only drives the Connect/Save button's disabled state.
const formValidation = reactive({
	locator: false,
	useWhen: false,
});

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function handleInteractOutside(event: Event) {
	if (credentialModalOpen.value) event.preventDefault();
}

function selectProvider(provider: AgentVectorStoreProvider) {
	submitted.value = false;
	selectedProvider.value = provider;
}

function goBack() {
	if (isEditing.value) return;
	submitted.value = false;
	selectedProvider.value = null;
	nameTouched.value = false;
	name.value = i18n.baseText('agents.builder.vectorStores.modal.defaultName' as BaseTextKey);
	credential.value = '';
	indexName.value = '';
	namespace.value = '';
	collectionName.value = '';
	tableName.value = '';
	queryName.value = '';
	embeddingModel.value = '';
	embeddingCredential.value = '';
	useWhen.value = '';
	formValidation.locator = false;
	formValidation.useWhen = false;
}

const locatorValue = computed(() => {
	switch (selectedProvider.value) {
		case 'pinecone':
			return indexName.value;
		case 'qdrant':
			return collectionName.value;
		case 'supabase':
		case 'postgres':
			return tableName.value;
		default:
			return '';
	}
});

// Prefills the connection name from the index/table/collection name until the
// user edits it directly, so add mode doesn't start with an empty required field.
watch(locatorValue, (value) => {
	if (isEditing.value || nameTouched.value) return;
	const locator = value.trim();
	if (!locator) return;
	name.value = locator.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64);
});

function onNameInput(value: string) {
	nameTouched.value = true;
	name.value = value;
}

const nameError = computed(() => {
	const trimmed = name.value.trim();
	if (!trimmed) {
		return i18n.baseText(
			'agents.builder.vectorStores.modal.name.validation.required' as BaseTextKey,
		);
	}
	if (!VECTOR_STORE_NAME_REGEX.test(trimmed)) {
		return i18n.baseText('agents.builder.vectorStores.modal.name.validation.pattern');
	}
	const otherNames = props.data.existingNames.filter((otherName) => otherName !== existing?.name);
	// '-' becomes '_' in the generated tool name. Compare the generated forms.
	const sanitize = (value: string) => value.replace(/-/g, '_');
	if (otherNames.some((otherName) => sanitize(otherName) === sanitize(trimmed))) {
		return i18n.baseText('agents.builder.vectorStores.modal.name.validation.duplicate');
	}
	return '';
});
const visibleNameError = computed(() => (submitted.value ? nameError.value : ''));

const useWhenValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: VECTOR_STORE_USE_WHEN_MAX_LENGTH } },
];

const canTest = computed(
	() =>
		Boolean(selectedProvider.value) &&
		!nameError.value &&
		Boolean(credential.value) &&
		formValidation.locator &&
		Boolean(embeddingModel.value) &&
		Boolean(embeddingCredential.value) &&
		formValidation.useWhen,
);

const storeCredentialOptions = computed(() =>
	providerDefinition.value
		? (credentialsByType.value[providerDefinition.value.credentialType] ?? [])
		: [],
);

function embeddingCredentialTypeFor(provider: AgentEmbeddingProvider): string {
	return getProviderCredentialTypes(provider)[0];
}

function onEmbeddingModelUpdate(model: string) {
	embeddingModel.value = model;
	const provider = getEmbeddingModelProvider(model);
	if (!provider) return;
	const requiredType = embeddingCredentialTypeFor(provider);
	const currentCredentialValid = (credentialsByType.value[requiredType] ?? []).some(
		(option) => option.id === embeddingCredential.value,
	);
	if (!currentCredentialValid) {
		embeddingCredential.value = '';
	}
}

async function loadCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await credentialsStore.fetchUsableCredentials({
			projectId: props.data.projectId,
		});
		const types = new Set<string>();
		for (const definition of Object.values(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)) {
			types.add(definition.credentialType);
		}
		for (const provider of AGENT_EMBEDDING_PROVIDERS) {
			for (const type of getProviderCredentialTypes(provider)) types.add(type);
		}
		for (const type of types) {
			credentialsByType.value[type] = allCredentials
				.filter((c) => c.type === type)
				.map((c) => ({
					id: c.id,
					name: c.name,
					typeDisplayName: credentialsStore.getCredentialTypeByName(c.type)?.displayName,
					homeProject: c.homeProject,
				}));
		}
	} finally {
		credentialsLoading.value = false;
	}
}

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.data.projectId)
		return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.data.projectId)
		return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.data.projectId) ?? null;
});

const credentialPermissions = computed(() => {
	const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
	return { ...permissions, create: !!permissions.create };
});

function createCredential(type: string, field: 'credential' | 'embeddingCredential') {
	const currentOptions = credentialsByType.value[type] ?? [];
	credentialIdsBeforeNew.value[type] = new Set(currentOptions.map((option) => option.id));
	pendingCredentialField.value = field;
	pendingCredentialType.value = type;
	uiStore.openNewCredential(
		type,
		false,
		false,
		props.data.projectId,
		undefined,
		undefined,
		undefined,
		{
			hideAskAssistant: true,
			appendToBody: true,
		},
	);
}

function onCreateStoreCredential() {
	if (!providerDefinition.value) return;
	createCredential(providerDefinition.value.credentialType, 'credential');
}

function onCreateEmbeddingCredential(credentialType: string) {
	createCredential(credentialType, 'embeddingCredential');
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, async (isOpen, wasOpen) => {
	if (!wasOpen || isOpen) return;
	const field = pendingCredentialField.value;
	const type = pendingCredentialType.value;
	pendingCredentialField.value = null;
	pendingCredentialType.value = null;
	if (!field || !type) return;

	const before = credentialIdsBeforeNew.value[type];
	await loadCredentials();
	const after = credentialsByType.value[type] ?? [];
	const newCredential = before ? after.find((option) => !before.has(option.id)) : undefined;
	if (newCredential) {
		if (field === 'credential') {
			credential.value = newCredential.id;
		} else {
			embeddingCredential.value = newCredential.id;
			// Keep the model/credential pairing valid: switch to a model from the
			// same provider as the credential the user just configured.
			const provider = AGENT_EMBEDDING_PROVIDERS.find(
				(candidate) => embeddingCredentialTypeFor(candidate) === type,
			);
			const [firstModelForProvider] = provider ? getEmbeddingModelsForProvider(provider) : [];
			if (firstModelForProvider) {
				embeddingModel.value = firstModelForProvider.model;
			}
		}
	}
	delete credentialIdsBeforeNew.value[type];
});

function buildVectorStoreConfig(): AgentJsonVectorStoreConfig {
	const base = {
		name: name.value.trim(),
		credential: credential.value,
		useWhen: useWhen.value.trim(),
		embedding: { model: embeddingModel.value, credential: embeddingCredential.value },
	};
	switch (selectedProvider.value) {
		case 'pinecone':
			return {
				provider: 'pinecone',
				...base,
				indexName: indexName.value.trim(),
				...(namespace.value.trim() ? { namespace: namespace.value.trim() } : {}),
			};
		case 'qdrant':
			return { provider: 'qdrant', ...base, collectionName: collectionName.value.trim() };
		case 'supabase':
			return {
				provider: 'supabase',
				...base,
				tableName: tableName.value.trim(),
				...(queryName.value.trim() ? { queryName: queryName.value.trim() } : {}),
			};
		case 'postgres':
		default:
			return { provider: 'postgres', ...base, tableName: tableName.value.trim() };
	}
}

async function onTestAndConnect() {
	submitted.value = true;
	if (!canTest.value || testing.value) return;
	testing.value = true;
	try {
		const vectorStore = buildVectorStoreConfig();
		const result = await testAgentVectorStore(
			rootStore.restApiContext,
			props.data.projectId,
			vectorStore,
		);
		if (!result.success) {
			showMessage({
				title: i18n.baseText('agents.builder.vectorStores.modal.test.failedTitle'),
				message:
					result.message ?? i18n.baseText('agents.builder.vectorStores.modal.test.genericError'),
				type: 'error',
				duration: 0,
			});
			return;
		}
		if (result.warning) {
			showMessage({
				title: i18n.baseText('agents.builder.vectorStores.modal.test.successTitle', {
					interpolate: { name: vectorStore.name },
				}),
				message: result.warning,
				type: 'warning',
				duration: 0,
			});
		}
		props.data.onConfirm(vectorStore);
		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.vectorStores.modal.test.failedTitle'));
	} finally {
		testing.value = false;
	}
}

function onRemove() {
	if (!existing) return;
	props.data.onRemove?.(existing.name);
	closeModal();
}

onMounted(() => {
	void loadCredentials();
});
</script>

<template>
	<AgentModalMultiStep
		:open="modalOpen"
		:step="currentStep"
		:title="modalTitle"
		:editable-title="Boolean(selectedProvider)"
		:title-placeholder="i18n.baseText('agents.builder.vectorStores.modal.name.placeholder')"
		:title-error="visibleNameError"
		:title-max-length="64"
		:show-back="Boolean(selectedProvider) && !isEditing"
		:show-footer="Boolean(selectedProvider)"
		:busy="testing"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-testid="agent-vector-stores-modal"
		@interact-outside="handleInteractOutside"
		@update:open="!$event && closeModal()"
		@update:title="onNameInput"
		@back="goBack"
	>
		<div v-show="!selectedProvider" :class="$style.content">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.vectorStores.modal.description') }}
			</N8nText>

			<div :class="$style.rows">
				<div
					v-for="provider in providerOrder"
					:key="provider"
					:class="$style.row"
					role="group"
					:aria-label="AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[provider].displayName"
					data-testid="agent-vector-stores-modal-row"
				>
					<div :class="$style.iconWrapper">
						<CredentialIcon
							:credential-type-name="
								AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[provider].credentialType
							"
							:size="24"
						/>
					</div>
					<div :class="$style.rowBody">
						<N8nText size="small" color="text-dark" :class="$style.name">
							{{ AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[provider].displayName }}
						</N8nText>
					</div>
					<div :class="$style.actions">
						<N8nButton
							variant="subtle"
							size="small"
							data-testid="agent-vector-stores-modal-connect"
							@click="selectProvider(provider)"
						>
							{{ i18n.baseText('agents.builder.vectorStores.modal.connect') }}
						</N8nButton>
					</div>
				</div>
			</div>
		</div>

		<div v-if="selectedProvider" :class="[$style.content, $style.configureContent]">
			<N8nInputLabel
				:label="i18n.baseText('agents.builder.vectorStores.modal.credential.label')"
				required
			>
				<AgentCredentialSelect
					v-model="credential"
					:credentials="storeCredentialOptions"
					:placeholder="i18n.baseText('agents.builder.vectorStores.modal.credential.placeholder')"
					:credential-permissions="credentialPermissions"
					:loading="credentialsLoading"
					data-test-id="agent-vector-stores-modal-credential"
					@create="onCreateStoreCredential"
				/>
				<N8nText
					v-if="submitted && !credential"
					size="small"
					color="danger"
					data-testid="agent-vector-stores-modal-credential-required"
				>
					{{
						i18n.baseText('agents.builder.vectorStores.modal.credential.required' as BaseTextKey)
					}}
				</N8nText>
			</N8nInputLabel>

			<template v-if="selectedProvider === 'pinecone'">
				<N8nFormInput
					v-model="indexName"
					name="indexName"
					:label="i18n.baseText('agents.builder.vectorStores.modal.indexName.label')"
					:placeholder="i18n.baseText('agents.builder.vectorStores.modal.indexName.placeholder')"
					required
					:show-validation-warnings="submitted"
					data-testid="agent-vector-stores-modal-index-name"
					@validate="(valid: boolean) => (formValidation.locator = valid)"
				/>
				<N8nFormInput
					v-model="namespace"
					name="namespace"
					:label="i18n.baseText('agents.builder.vectorStores.modal.namespace.label')"
					:placeholder="i18n.baseText('agents.builder.vectorStores.modal.namespace.placeholder')"
					data-testid="agent-vector-stores-modal-namespace"
				/>
			</template>

			<N8nFormInput
				v-else-if="selectedProvider === 'qdrant'"
				v-model="collectionName"
				name="collectionName"
				:label="i18n.baseText('agents.builder.vectorStores.modal.collectionName.label')"
				:placeholder="i18n.baseText('agents.builder.vectorStores.modal.collectionName.placeholder')"
				required
				:show-validation-warnings="submitted"
				data-testid="agent-vector-stores-modal-collection-name"
				@validate="(valid: boolean) => (formValidation.locator = valid)"
			/>

			<template v-else-if="selectedProvider === 'supabase' || selectedProvider === 'postgres'">
				<N8nFormInput
					v-model="tableName"
					name="tableName"
					:label="i18n.baseText('agents.builder.vectorStores.modal.tableName.label')"
					:placeholder="i18n.baseText('agents.builder.vectorStores.modal.tableName.placeholder')"
					required
					:show-validation-warnings="submitted"
					data-testid="agent-vector-stores-modal-table-name"
					@validate="(valid: boolean) => (formValidation.locator = valid)"
				/>
				<N8nFormInput
					v-if="selectedProvider === 'supabase'"
					v-model="queryName"
					name="queryName"
					:label="i18n.baseText('agents.builder.vectorStores.modal.queryName.label')"
					:placeholder="i18n.baseText('agents.builder.vectorStores.modal.queryName.placeholder')"
					data-testid="agent-vector-stores-modal-query-name"
				/>
			</template>

			<N8nInputLabel
				:label="i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.label')"
				:tooltip-text="i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.hint')"
				required
			>
				<EmbeddingModelSelector
					:selected-model="embeddingModel"
					:selected-credential-id="embeddingCredential || null"
					:credentials-by-type="credentialsByType"
					:can-create-credentials="credentialPermissions.create"
					@update:selected-model="onEmbeddingModelUpdate"
					@update:selected-credential-id="embeddingCredential = $event"
					@create-credential="onCreateEmbeddingCredential"
				/>
				<N8nText
					v-if="submitted && (!embeddingModel || !embeddingCredential)"
					size="small"
					color="danger"
				>
					{{
						i18n.baseText(
							'agents.builder.vectorStores.modal.embeddingModel.required' as BaseTextKey,
						)
					}}
				</N8nText>
			</N8nInputLabel>

			<N8nFormInput
				v-model="useWhen"
				name="useWhen"
				:label="i18n.baseText('agents.builder.vectorStores.useWhen.label')"
				:tooltip-text="i18n.baseText('agents.builder.vectorStores.useWhen.hint')"
				:placeholder="i18n.baseText('agents.builder.vectorStores.useWhen.placeholder')"
				required
				:maxlength="VECTOR_STORE_USE_WHEN_MAX_LENGTH"
				:validation-rules="useWhenValidationRules"
				:show-validation-warnings="submitted"
				data-testid="agent-vector-stores-modal-use-when"
				@validate="(valid: boolean) => (formValidation.useWhen = valid)"
			/>
		</div>

		<template v-if="selectedProvider && isEditing && data.onRemove" #footerLeft>
			<N8nButton variant="subtle" data-testid="agent-vector-stores-modal-remove" @click="onRemove">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.vectorStores.modal.remove') }}
			</N8nButton>
		</template>
		<template v-if="selectedProvider" #footerActions>
			<N8nButton
				variant="solid"
				:loading="testing"
				:disabled="testing"
				data-testid="agent-vector-stores-modal-confirm"
				@click="onTestAndConnect"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModalMultiStep>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.configureContent {
	gap: var(--spacing--lg);
}

.rows {
	display: flex;
	flex-direction: column;
	padding-right: var(--spacing--lg);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
	padding-block: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: var(--spacing--xl);
	display: flex;
	align-items: center;
	justify-content: center;
}

.rowBody {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
	max-width: 100%;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
