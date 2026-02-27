<script lang="ts" setup>
import { computed, reactive, ref, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '../projects.store';
import { useSecretsProvidersList } from '@/features/integrations/secretsProviders.ee/composables/useSecretsProvidersList.ee';
import type { SecretProviderConnection } from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY, VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRouter } from 'vue-router';

import {
	N8nButton,
	N8nIconButton,
	N8nIcon,
	N8nInput,
	N8nActionBox,
	N8nHeading,
	N8nText,
	N8nDataTableServer,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useSecretsProviderConnection } from '@/features/integrations/secretsProviders.ee/composables/useSecretsProviderConnection.ee';
import { useRBACStore } from '@/app/stores/rbac.store';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const rbacStore = useRBACStore();
const settingsStore = useSettingsStore();
const secretsProviders = useSecretsProvidersList();
const secretsProviderConnection = useSecretsProviderConnection(projectsStore.currentProjectId);

interface ConnectionRow {
	id: string;
	connectionName: string;
	secretsCount: number;
	isExpanded: boolean;
	secrets: NonNullable<SecretProviderConnection['secrets']>;
}

const projectSecretConnections = ref<SecretProviderConnection[]>([]);
const connectionSecrets = reactive<Record<string, SecretProviderConnection['secrets']>>({});
const isLoadingSecretConnections = ref(false);
const secretsSearch = ref('');
const expandedConnections = ref<Set<string>>(new Set());
const currentPage = ref(0);
const itemsPerPage = ref(5);

const isFeatureEnabled = computed(
	() => settingsStore.moduleSettings['external-secrets']?.forProjects ?? false,
);

// Permissions
const hasExternalSecretsListPermission = computed(
	() => projectsStore.currentProject?.scopes?.includes('externalSecretsProvider:list') ?? false,
);

const hasProjectExternalSecretsCreatePermission = computed(
	() => projectsStore.currentProject?.scopes?.includes('externalSecretsProvider:create') ?? false,
);

const canCreateGlobalSecretsStore = computed(() =>
	rbacStore.hasScope('externalSecretsProvider:create'),
);

const showExternalSecretsSection = computed(
	() => isFeatureEnabled.value && hasExternalSecretsListPermission.value,
);

// Empty state logic
type EmptyStateType = 'instance-admin-no-project-providers' | 'project-admin-no-providers' | null;

const emptyStateType = computed<EmptyStateType>(() => {
	if (projectSecretConnections.value.length > 0) return null;

	if (canCreateGlobalSecretsStore.value) {
		const hasGlobalProviders = secretsProviders.activeProviders.value.length > 0;
		return hasGlobalProviders
			? 'instance-admin-no-project-providers'
			: 'project-admin-no-providers';
	}

	return hasProjectExternalSecretsCreatePermission.value ? 'project-admin-no-providers' : null;
});

const emptyStateConfig = computed(() => {
	const type = emptyStateType.value;
	if (!type) return null;

	const configs = {
		'instance-admin-no-project-providers': {
			heading: i18n.baseText('projects.settings.externalSecrets.emptyState.heading'),
			description: i18n.baseText(
				'projects.settings.externalSecrets.emptyState.instanceAdmin.noProjectProviders.description',
			),
			buttonText: i18n.baseText('projects.settings.externalSecrets.button.shareSecretsStore'),
			buttonAction: onShareSecretsStore,
			testId: 'external-secrets-empty-state-no-project-providers',
		},
		'project-admin-no-providers': {
			heading: i18n.baseText('projects.settings.externalSecrets.emptyState.heading'),
			description: i18n.baseText(
				'projects.settings.externalSecrets.emptyState.projectAdmin.description',
			),
			buttonText: i18n.baseText('projects.settings.externalSecrets.button.addSecretsStore'),
			buttonAction: onAddSecretsStore,
			testId: 'external-secrets-empty-state-project-admin',
		},
	};
	return configs[type];
});

const sortedConnections = computed(() =>
	[...projectSecretConnections.value].sort((a, b) => b.secretsCount - a.secretsCount),
);

const filteredConnections = computed(() => {
	if (!secretsSearch.value.trim()) return sortedConnections.value;

	const searchTerm = secretsSearch.value.toLowerCase();
	return sortedConnections.value.filter((connection) => {
		if (connection.name.toLowerCase().includes(searchTerm)) return true;
		const secrets = connectionSecrets[connection.name] ?? [];
		return secrets.some((s) => s.name.toLowerCase().includes(searchTerm));
	});
});

const paginatedConnections = computed(() => {
	const start = currentPage.value * itemsPerPage.value; // 0-based indexing
	const end = start + itemsPerPage.value;
	return filteredConnections.value.slice(start, end);
});

function getFilteredSecrets(connectionName: string) {
	const secrets = connectionSecrets[connectionName] ?? [];
	const searchTerm = secretsSearch.value.trim().toLowerCase();
	if (!searchTerm) return secrets;
	return secrets.filter(
		(secret) =>
			secret.name.toLowerCase().includes(searchTerm) ||
			connectionName.toLowerCase().includes(searchTerm),
	);
}

const tableRows = computed<ConnectionRow[]>(() =>
	paginatedConnections.value.map((connection) => {
		const isExpanded = expandedConnections.value.has(connection.name);
		return {
			id: `header-${connection.name}`,
			connectionName: connection.name,
			secretsCount: connection.secretsCount,
			isExpanded,
			secrets: isExpanded ? getFilteredSecrets(connection.name) : [],
		};
	}),
);

const tableHeaders = computed<Array<TableHeader<ConnectionRow>>>(() => [
	{
		title: i18n.baseText('projects.settings.externalSecrets.table.header.secretName'),
		key: 'connectionName',
		disableSort: true,
		resize: false,
		value: (row: ConnectionRow) => row.connectionName,
	},
]);

async function fetchSecretsForConnection(connectionName: string) {
	if (connectionSecrets[connectionName]?.length) return;

	const { secrets } = await secretsProviderConnection.getConnection(connectionName);

	connectionSecrets[connectionName] = secrets ?? [];
}

async function fetchSecretsForCurrentPage() {
	await Promise.all(
		paginatedConnections.value
			.filter((connection) => connection.secretsCount > 0)
			.map(async (connection) => await fetchSecretsForConnection(connection.name)),
	);
}

async function fetchProjectSecretConnections() {
	if (
		!projectsStore.currentProjectId ||
		!hasExternalSecretsListPermission.value ||
		!isFeatureEnabled.value
	) {
		return;
	}
	isLoadingSecretConnections.value = true;
	try {
		projectSecretConnections.value = await projectsStore.getProjectSecretProviders(
			projectsStore.currentProjectId,
		);
		await fetchSecretsForCurrentPage();
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('projects.settings.externalSecrets.load.error'));
	} finally {
		isLoadingSecretConnections.value = false;
	}
}

function toggleConnection(connectionName: string) {
	if (expandedConnections.value.has(connectionName)) {
		expandedConnections.value.delete(connectionName);
	} else {
		expandedConnections.value.add(connectionName);
	}
}

// Modal Functions
function openConnectionModal(
	providerKey?: string,
	activeTab: 'connection' | 'sharing' = 'connection',
) {
	const existingNames = secretsProviders.activeProviders.value.map(
		(provider: SecretProviderConnection) => provider.name,
	);

	uiStore.openModalWithData({
		name: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
		data: {
			activeTab,
			providerKey,
			providerTypes: secretsProviders.providerTypes.value,
			existingProviderNames: existingNames,
			projectId: projectsStore.currentProjectId,
			onClose: async () => {
				await fetchProjectSecretConnections();
			},
		},
	});
}

function openProviderModal(providerKey: string) {
	openConnectionModal(providerKey, 'connection');
}

function onAddSecretsStore() {
	if (!hasProjectExternalSecretsCreatePermission.value) return;
	openConnectionModal();
}

function onShareSecretsStore() {
	void router.push({ name: VIEWS.EXTERNAL_SECRETS_SETTINGS });
}

watch(secretsSearch, () => {
	currentPage.value = 0;
});

watch([currentPage, itemsPerPage], async () => {
	await fetchSecretsForCurrentPage();
});

// Fetch project secret providers when currentProjectId is available and section is visible
watch(
	[() => projectsStore.currentProjectId, showExternalSecretsSection],
	async ([newProjectId, showSection]) => {
		if (newProjectId && showSection) {
			await fetchProjectSecretConnections();
		}
	},
	{ immediate: true },
);

onMounted(async () => {
	if (!showExternalSecretsSection.value) return;
	await Promise.allSettled([
		secretsProviders.fetchProviderTypes(),
		secretsProviders.fetchActiveConnections(),
	]);
	if (canCreateGlobalSecretsStore.value) {
		await projectsStore.getAllProjects();
	}
});

defineExpose({
	fetchProjectSecretConnections,
});
</script>

<template>
	<fieldset v-if="showExternalSecretsSection" data-test-id="external-secrets-section">
		<h3 class="mb-s">
			<label for="projectExternalSecrets">{{
				i18n.baseText('projects.settings.externalSecrets')
			}}</label>
		</h3>

		<!-- Empty State: Consolidated view based on user role and current state -->
		<N8nActionBox v-if="emptyStateConfig" :data-test-id="emptyStateConfig.testId" description="yes">
			<template #description>
				<N8nHeading tag="h3" size="small" class="mb-2xs">
					{{ emptyStateConfig.heading }}
				</N8nHeading>
				<N8nText size="small" color="text-base" :class="$style.description">
					{{ emptyStateConfig.description }}
				</N8nText>
			</template>
			<template #additionalContent>
				<N8nButton
					variant="ghost"
					size="xsmall"
					class="mr-2xs"
					element="a"
					:href="i18n.baseText('settings.externalSecrets.docs')"
					target="_blank"
					data-test-id="secrets-provider-connections-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
				</N8nButton>
				<N8nButton
					variant="subtle"
					size="xsmall"
					:data-test-id="`${emptyStateType}-button`"
					@click="emptyStateConfig.buttonAction"
				>
					{{ emptyStateConfig.buttonText }}
				</N8nButton>
			</template>
		</N8nActionBox>

		<!-- Table View: Show when there are providers -->
		<div v-else-if="projectSecretConnections.length > 0" :class="$style.secretProvidersContainer">
			<div :class="$style.actionsContainer">
				<div :class="$style.searchContainer">
					<N8nInput
						v-model="secretsSearch"
						:placeholder="i18n.baseText('projects.settings.externalSecrets.search.placeholder')"
						clearable
						data-test-id="secrets-providers-search"
						size="small"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
				</div>
				<N8nButton
					v-if="hasProjectExternalSecretsCreatePermission"
					variant="outline"
					size="small"
					data-test-id="external-secrets-add-button"
					@click="onAddSecretsStore"
				>
					{{ i18n.baseText('projects.settings.externalSecrets.button.addSecretsStore') }}
				</N8nButton>
			</div>

			<N8nDataTableServer
				v-model:page="currentPage"
				v-model:items-per-page="itemsPerPage"
				:headers="tableHeaders"
				:items="tableRows"
				:items-length="filteredConnections.length"
				:loading="isLoadingSecretConnections"
				:page-sizes="[5, 10, 25, 50]"
				:row-props="() => ({ class: $style.groupHeaderRow })"
				data-test-id="external-secrets-table"
			>
				<template #item="{ item }">
					<tr :class="$style.groupHeaderRow">
						<td :class="$style.groupHeaderCell">
							<div :class="$style.groupHeaderContent">
								<N8nIconButton
									variant="ghost"
									:icon="item.isExpanded ? 'chevron-down' : 'chevron-right'"
									:class="$style.expandButton"
									:disabled="item.secretsCount === 0"
									:title="
										item.isExpanded
											? i18n.baseText('projects.settings.externalSecrets.collapse')
											: i18n.baseText('projects.settings.externalSecrets.expand')
									"
									data-test-id="external-secrets-expand-button"
									@click="toggleConnection(item.connectionName)"
								/>
								<N8nText
									:class="$style.connectionLink"
									bold
									@click="openProviderModal(item.connectionName)"
								>
									{{ item.connectionName }}
								</N8nText>
								<N8nText color="text-light" size="small">
									{{
										item.secretsCount === 1
											? i18n.baseText('settings.secretsProviderConnections.oneSecret')
											: i18n.baseText('settings.secretsProviderConnections.secrets', {
													interpolate: { count: item.secretsCount.toString() },
												})
									}}
								</N8nText>
							</div>
						</td>
					</tr>
					<tr v-if="item.isExpanded && item.secrets.length > 0">
						<td :class="$style.secretsCell">
							<div :class="$style.secretsList">
								<div v-for="secret in item.secrets" :key="secret.name" :class="$style.secretRow">
									<span
										><code :class="$style.secretName">{{ secret.name }}</code></span
									>
								</div>
							</div>
						</td>
					</tr>
				</template>
			</N8nDataTableServer>
		</div>
	</fieldset>
</template>

<style lang="scss" module>
.description {
	max-width: 40rem;
	display: block;
}

.secretProvidersContainer {
	margin-top: var(--spacing--sm);
	max-width: 100%;
	overflow: auto;
}

.actionsContainer {
	display: flex;
	justify-content: space-between;
}

.searchContainer {
	margin-bottom: var(--spacing--sm);
	max-width: var(--project-field--width);
}

.groupHeaderRow {
	background-color: var(--color--background--light-3);

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.groupHeaderCell {
	padding: 0 !important;
}

.groupHeaderRow:not(:first-child) {
	border-top: var(--border);
}

.groupHeaderRow:not(:last-child) {
	border-bottom: var(--border);
}

.secretsCell {
	padding: 0 !important;
}

.secretsList {
	max-height: 10rem;
	overflow-y: auto;
}

.secretRow {
	position: relative;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--xs) var(--spacing--xl);

	&:not(:last-child)::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--spacing--lg);
		right: var(--spacing--lg);
		height: 1px;
		background-color: var(--color--foreground);
	}
}

.groupHeaderContent {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--sm) var(--spacing--xl);
	width: 100%;
}

.expandButton {
	position: absolute;
	left: 0;
	transition: transform 0.2s;
	color: var(--color--text);
	flex-shrink: 0;

	&:hover {
		background-color: transparent;
	}

	&:disabled {
		cursor: not-allowed;
	}
}

.secretName {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	background-color: var(--color--neutral-125);
	padding: var(--spacing--4xs);

	body[data-theme='dark'] & {
		background-color: var(--color--background--light-1);
	}
}

.connectionLink {
	cursor: pointer;
	max-width: 50%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;

	&:hover {
		text-decoration: underline;
	}
}
</style>
