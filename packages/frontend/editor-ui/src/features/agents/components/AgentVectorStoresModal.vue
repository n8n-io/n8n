<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { AgentJsonVectorStoreConfig, AgentVectorStoreProvider } from '@n8n/api-types';
import { VECTOR_STORE_NAME_REGEX, VECTOR_STORE_USE_WHEN_MAX_LENGTH } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { testAgentVectorStore } from '../composables/useAgentApi';
import {
	AGENT_EMBEDDING_MODEL_OPTIONS,
	AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS,
} from '../vector-stores';
import AgentCredentialSelect, { type AgentCredentialOption } from './AgentCredentialSelect.vue';

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
const rootStore = useRootStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();

const providerOrder: AgentVectorStoreProvider[] = ['pinecone', 'supabase', 'qdrant', 'postgres'];

const isEditing = computed(() => Boolean(props.data.vectorStore));
const selectedProvider = ref<AgentVectorStoreProvider | null>(
	props.data.vectorStore?.provider ?? null,
);
const providerDefinition = computed(() =>
	selectedProvider.value ? AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[selectedProvider.value] : null,
);

const existing = props.data.vectorStore;
const name = ref(existing?.name ?? '');
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
const embeddingModel = ref(existing?.embedding.model ?? AGENT_EMBEDDING_MODEL_OPTIONS[0].model);
const embeddingCredential = ref(existing?.embedding.credential ?? '');
const useWhen = ref(existing?.useWhen ?? '');

const testing = ref(false);
const testErrorMessage = ref('');

const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingCredentialField = ref<'credential' | 'embeddingCredential' | null>(null);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function selectProvider(provider: AgentVectorStoreProvider) {
	selectedProvider.value = provider;
}

function goBack() {
	if (isEditing.value) return;
	selectedProvider.value = null;
	testErrorMessage.value = '';
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
	name.value = value
		.trim()
		.replace(/[^a-zA-Z0-9_-]+/g, '_')
		.slice(0, 64);
});

function onNameInput(value: string) {
	nameTouched.value = true;
	name.value = value;
}

const nameError = computed(() => {
	const trimmed = name.value.trim();
	if (!trimmed) return '';
	if (!VECTOR_STORE_NAME_REGEX.test(trimmed)) {
		return i18n.baseText('agents.builder.vectorStores.modal.name.validation.pattern');
	}
	const otherNames = props.data.existingNames.filter((otherName) => otherName !== existing?.name);
	if (otherNames.includes(trimmed)) {
		return i18n.baseText('agents.builder.vectorStores.modal.name.validation.duplicate');
	}
	return '';
});

const useWhenTrimmed = computed(() => useWhen.value.trim());
const useWhenError = computed(() => {
	if (!useWhenTrimmed.value) {
		return i18n.baseText('agents.builder.vectorStores.useWhen.validation.required');
	}
	if (useWhenTrimmed.value.length > VECTOR_STORE_USE_WHEN_MAX_LENGTH) {
		return i18n.baseText('agents.builder.vectorStores.useWhen.validation.maxLength', {
			interpolate: { max: String(VECTOR_STORE_USE_WHEN_MAX_LENGTH) },
		});
	}
	return '';
});

const locatorFilled = computed(() => locatorValue.value.trim().length > 0);

const canTest = computed(
	() =>
		Boolean(selectedProvider.value) &&
		name.value.trim().length > 0 &&
		!nameError.value &&
		Boolean(credential.value) &&
		locatorFilled.value &&
		Boolean(embeddingModel.value) &&
		Boolean(embeddingCredential.value) &&
		!useWhenError.value,
);

const embeddingModelOptions = computed(() =>
	AGENT_EMBEDDING_MODEL_OPTIONS.map((option) => ({
		...option,
		label: i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.optionLabel', {
			interpolate: { model: option.model, dimensions: String(option.dimensions) },
		}),
	})),
);

const selectedEmbeddingOption = computed(() =>
	AGENT_EMBEDDING_MODEL_OPTIONS.find((option) => option.model === embeddingModel.value),
);

const embeddingCredentialOptions = computed(() => {
	const credentialTypes = selectedEmbeddingOption.value?.credentialTypes ?? [];
	const seen = new Set<string>();
	const options: AgentCredentialOption[] = [];
	for (const type of credentialTypes) {
		for (const option of credentialsByType.value[type] ?? []) {
			if (seen.has(option.id)) continue;
			seen.add(option.id);
			options.push(option);
		}
	}
	return options;
});

const storeCredentialOptions = computed(() =>
	providerDefinition.value
		? (credentialsByType.value[providerDefinition.value.credentialType] ?? [])
		: [],
);

function onEmbeddingModelChange(model: string) {
	embeddingModel.value = model;
	const stillValid = embeddingCredentialOptions.value.some(
		(option) => option.id === embeddingCredential.value,
	);
	if (!stillValid) {
		embeddingCredential.value = '';
	}
}

async function loadCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: props.data.projectId,
		});
		const types = new Set<string>();
		for (const definition of Object.values(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)) {
			types.add(definition.credentialType);
		}
		for (const option of AGENT_EMBEDDING_MODEL_OPTIONS) {
			for (const type of option.credentialTypes) types.add(type);
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

function onCreateEmbeddingCredential() {
	const [primaryCredentialType] = selectedEmbeddingOption.value?.credentialTypes ?? [];
	if (!primaryCredentialType) return;
	createCredential(primaryCredentialType, 'embeddingCredential');
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, async (isOpen, wasOpen) => {
	if (!wasOpen || isOpen) return;
	const field = pendingCredentialField.value;
	pendingCredentialField.value = null;
	if (!field) return;

	const type =
		field === 'credential'
			? providerDefinition.value?.credentialType
			: selectedEmbeddingOption.value?.credentialTypes[0];
	if (!type) return;

	const before = credentialIdsBeforeNew.value[type];
	await loadCredentials();
	const after = credentialsByType.value[type] ?? [];
	const newCredential = before ? after.find((option) => !before.has(option.id)) : undefined;
	if (newCredential) {
		if (field === 'credential') {
			credential.value = newCredential.id;
		} else {
			embeddingCredential.value = newCredential.id;
		}
	}
	delete credentialIdsBeforeNew.value[type];
});

function buildVectorStoreConfig(): AgentJsonVectorStoreConfig {
	const base = {
		name: name.value.trim(),
		credential: credential.value,
		useWhen: useWhenTrimmed.value,
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
	if (!canTest.value || testing.value) return;
	testing.value = true;
	testErrorMessage.value = '';
	try {
		const vectorStore = buildVectorStoreConfig();
		const result = await testAgentVectorStore(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
			vectorStore,
		);
		if (!result.success) {
			testErrorMessage.value =
				result.message ?? i18n.baseText('agents.builder.vectorStores.modal.test.genericError');
			return;
		}
		props.data.onConfirm(vectorStore);
		closeModal();
	} catch (error) {
		testErrorMessage.value =
			error instanceof Error
				? error.message
				: i18n.baseText('agents.builder.vectorStores.modal.test.genericError');
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
	<Modal
		:name="props.modalName"
		width="640px"
		:custom-class="$style.modal"
		data-testid="agent-vector-stores-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{
					selectedProvider
						? providerDefinition?.displayName
						: i18n.baseText('agents.builder.vectorStores.modal.title')
				}}
			</N8nHeading>
		</template>

		<template #content>
			<div v-if="!selectedProvider" :class="$style.content">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.vectorStores.modal.description') }}
				</N8nText>

				<div :class="$style.rows">
					<div
						v-for="provider in providerOrder"
						:key="provider"
						:class="$style.row"
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

			<div v-else :class="[$style.content, $style.configureContent]">
				<div :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.modal.name.label') }}
					</N8nText>
					<N8nInput
						:model-value="name"
						size="small"
						:placeholder="i18n.baseText('agents.builder.vectorStores.modal.name.placeholder')"
						data-testid="agent-vector-stores-modal-name"
						@update:model-value="onNameInput"
					/>
					<N8nText v-if="nameError" size="small" color="danger">{{ nameError }}</N8nText>
				</div>

				<div :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.modal.credential.label') }}
					</N8nText>
					<AgentCredentialSelect
						v-model="credential"
						:credentials="storeCredentialOptions"
						:placeholder="i18n.baseText('agents.builder.vectorStores.modal.credential.placeholder')"
						:credential-permissions="credentialPermissions"
						:loading="credentialsLoading"
						data-test-id="agent-vector-stores-modal-credential"
						@create="onCreateStoreCredential"
					/>
				</div>

				<template v-if="selectedProvider === 'pinecone'">
					<div :class="$style.field">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.vectorStores.modal.indexName.label') }}
						</N8nText>
						<N8nInput
							v-model="indexName"
							size="small"
							:placeholder="
								i18n.baseText('agents.builder.vectorStores.modal.indexName.placeholder')
							"
							data-testid="agent-vector-stores-modal-index-name"
						/>
					</div>
					<div :class="$style.field">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.vectorStores.modal.namespace.label') }}
						</N8nText>
						<N8nInput
							v-model="namespace"
							size="small"
							:placeholder="
								i18n.baseText('agents.builder.vectorStores.modal.namespace.placeholder')
							"
							data-testid="agent-vector-stores-modal-namespace"
						/>
					</div>
				</template>

				<div v-else-if="selectedProvider === 'qdrant'" :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.modal.collectionName.label') }}
					</N8nText>
					<N8nInput
						v-model="collectionName"
						size="small"
						:placeholder="
							i18n.baseText('agents.builder.vectorStores.modal.collectionName.placeholder')
						"
						data-testid="agent-vector-stores-modal-collection-name"
					/>
				</div>

				<template v-else-if="selectedProvider === 'supabase' || selectedProvider === 'postgres'">
					<div :class="$style.field">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.vectorStores.modal.tableName.label') }}
						</N8nText>
						<N8nInput
							v-model="tableName"
							size="small"
							:placeholder="
								i18n.baseText('agents.builder.vectorStores.modal.tableName.placeholder')
							"
							data-testid="agent-vector-stores-modal-table-name"
						/>
					</div>
					<div v-if="selectedProvider === 'supabase'" :class="$style.field">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.vectorStores.modal.queryName.label') }}
						</N8nText>
						<N8nInput
							v-model="queryName"
							size="small"
							:placeholder="
								i18n.baseText('agents.builder.vectorStores.modal.queryName.placeholder')
							"
							data-testid="agent-vector-stores-modal-query-name"
						/>
					</div>
				</template>

				<div :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.label') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.vectorStores.modal.embeddingModel.hint') }}
					</N8nText>
					<N8nSelect
						:model-value="embeddingModel"
						size="small"
						data-testid="agent-vector-stores-modal-embedding-model"
						@update:model-value="onEmbeddingModelChange"
					>
						<N8nOption
							v-for="option in embeddingModelOptions"
							:key="option.model"
							:value="option.model"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.modal.embeddingCredential.label') }}
					</N8nText>
					<AgentCredentialSelect
						v-model="embeddingCredential"
						:credentials="embeddingCredentialOptions"
						:placeholder="
							i18n.baseText('agents.builder.vectorStores.modal.embeddingCredential.placeholder')
						"
						:credential-permissions="credentialPermissions"
						:loading="credentialsLoading"
						data-test-id="agent-vector-stores-modal-embedding-credential"
						@create="onCreateEmbeddingCredential"
					/>
				</div>

				<div :class="$style.field">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.vectorStores.useWhen.label') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.vectorStores.useWhen.hint') }}
					</N8nText>
					<N8nInput
						:model-value="useWhen"
						size="small"
						:placeholder="i18n.baseText('agents.builder.vectorStores.useWhen.placeholder')"
						data-testid="agent-vector-stores-modal-use-when"
						@update:model-value="useWhen = $event"
					/>
					<N8nText v-if="useWhenError" size="small" color="danger">{{ useWhenError }}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{
							i18n.baseText('agents.builder.vectorStores.useWhen.characterCount', {
								interpolate: {
									count: String(useWhen.length),
									max: String(VECTOR_STORE_USE_WHEN_MAX_LENGTH),
								},
							})
						}}
					</N8nText>
				</div>

				<N8nCallout
					v-if="testErrorMessage"
					theme="danger"
					data-testid="agent-vector-stores-modal-error"
				>
					{{ testErrorMessage }}
				</N8nCallout>
			</div>
		</template>

		<template v-if="selectedProvider" #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditing && data.onRemove"
					variant="subtle"
					data-testid="agent-vector-stores-modal-remove"
					@click="onRemove"
				>
					{{ i18n.baseText('agents.builder.vectorStores.modal.remove') }}
				</N8nButton>
				<N8nButton
					v-else
					variant="subtle"
					data-testid="agent-vector-stores-modal-back"
					@click="goBack"
				>
					{{ i18n.baseText('agents.builder.vectorStores.modal.back') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canTest"
						:loading="testing"
						data-testid="agent-vector-stores-modal-confirm"
						@click="onTestAndConnect"
					>
						{{
							i18n.baseText(
								isEditing ? 'generic.save' : 'agents.builder.vectorStores.modal.test.button',
							)
						}}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.modal {
	:global(.modal-content) {
		overflow: hidden;
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	margin: calc(-1 * var(--spacing--lg));
	padding: var(--spacing--lg);
	max-height: 640px;
	overflow-y: auto;
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
	width: 32px;
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

.itemIcon {
	color: var(--text-color--subtle);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
