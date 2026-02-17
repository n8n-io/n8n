<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '../projects.store';
import { useSecretsProvidersList } from '@/features/integrations/secretsProviders.ee/composables/useSecretsProvidersList.ee';
import type { SecretProviderConnection } from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { ROLE } from '@n8n/api-types';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY, VIEWS } from '@/app/constants';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { useRouter } from 'vue-router';

import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nActionBox,
	N8nHeading,
	N8nText,
	N8nDataTableServer,
	N8nLink,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const secretsProviders = useSecretsProvidersList();
const envFeatureFlag = useEnvFeatureFlag();

// Types
interface SecretTableRow {
	id: string;
	type: 'secret';
	secretName: string;
	providerName: string;
	providerKey: string;
	providerType: string;
	providerDisplayName: string;
	credentialsCount?: number;
}

interface ProviderHeaderRow {
	id: string;
	type: 'provider-header';
	providerName: string;
	providerKey: string;
	providerType: string;
	providerDisplayName: string;
	secretsCount: number;
	isExpanded: boolean;
}

type TableRow = SecretTableRow | ProviderHeaderRow;

// State
const projectSecretProviders = ref<SecretProviderConnection[]>([]);
const isLoadingSecretProviders = ref(false);
const secretsSearch = ref('');
const expandedProviders = ref<Set<string>>(new Set());
const currentPage = ref(0); // 0-based indexing for N8nDataTableServer
const itemsPerPage = ref(5);

// Feature flag check
const isFeatureEnabled = computed(() =>
	envFeatureFlag.check.value('EXTERNAL_SECRETS_FOR_PROJECTS'),
);

// Permissions
const hasExternalSecretsListPermission = computed(
	() => projectsStore.currentProject?.scopes?.includes('externalSecretsProvider:list') ?? false,
);

const hasProjectExternalSecretsCreatePermission = computed(
	() => projectsStore.currentProject?.scopes?.includes('externalSecretsProvider:create') ?? false,
);

const isInstanceAdmin = computed(
	() => usersStore.currentUser?.role === ROLE.Owner || usersStore.currentUser?.role === ROLE.Admin,
);

const showExternalSecretsSection = computed(
	() => isFeatureEnabled.value && hasExternalSecretsListPermission.value,
);

// Empty state logic
type EmptyStateType = 'instance-admin-no-project-providers' | 'project-admin-no-providers' | null;

const emptyStateType = computed<EmptyStateType>(() => {
	if (projectSecretProviders.value.length > 0) return null;

	if (isInstanceAdmin.value) {
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
			buttonType: 'secondary' as const,
			buttonAction: onShareSecretsStore,
			testId: 'external-secrets-empty-state-no-project-providers',
		},
		'project-admin-no-providers': {
			heading: i18n.baseText('projects.settings.externalSecrets.emptyState.heading'),
			description: i18n.baseText(
				'projects.settings.externalSecrets.emptyState.projectAdmin.description',
			),
			buttonText: i18n.baseText('projects.settings.externalSecrets.button.addSecretsStore'),
			buttonType: 'secondary' as const,
			buttonAction: onAddSecretsStore,
			testId: 'external-secrets-empty-state-project-admin',
		},
	};

	return configs[type];
});

// Filtered providers (for pagination)
const filteredProviders = computed(() => {
	if (!secretsSearch.value.trim()) return projectSecretProviders.value;

	const searchTerm = secretsSearch.value.toLowerCase();
	return projectSecretProviders.value.filter((provider) => {
		const hasMatchingSecrets = provider.secrets?.some(
			(secret) =>
				secret.name.toLowerCase().includes(searchTerm) ||
				provider.name.toLowerCase().includes(searchTerm),
		);
		return hasMatchingSecrets;
	});
});

// Paginated providers (paginate by provider, not by row)
const paginatedProviders = computed(() => {
	const start = currentPage.value * itemsPerPage.value; // 0-based indexing
	const end = start + itemsPerPage.value;
	return filteredProviders.value.slice(start, end);
});

// Table rows (built from paginated providers to keep groups intact)
const tableRows = computed<TableRow[]>(() => {
	const rows: TableRow[] = [];

	paginatedProviders.value.forEach((provider) => {
		const providerTypeInfo = getProviderTypeInfo(provider.type);
		const providerDisplayName = providerTypeInfo?.displayName ?? provider.type;
		const isExpanded = expandedProviders.value.has(provider.name);

		// Filter secrets by search if applicable
		let secrets = provider.secrets ?? [];
		if (secretsSearch.value.trim()) {
			const searchTerm = secretsSearch.value.toLowerCase();
			secrets = secrets.filter(
				(secret) =>
					secret.name.toLowerCase().includes(searchTerm) ||
					provider.name.toLowerCase().includes(searchTerm),
			);
		}

		const secretsCount = secrets.length;

		// Add provider header row
		rows.push({
			id: `header-${provider.name}`,
			type: 'provider-header',
			providerName: provider.name,
			providerKey: provider.name,
			providerType: provider.type,
			providerDisplayName,
			secretsCount,
			isExpanded,
		});

		// Add secret rows if expanded
		if (isExpanded && secrets.length > 0) {
			secrets.forEach((secret) => {
				rows.push({
					id: `${provider.name}-${secret.name}`,
					type: 'secret',
					secretName: secret.name,
					providerName: provider.name,
					providerKey: provider.name,
					providerType: provider.type,
					providerDisplayName,
					credentialsCount: secret.credentialsCount,
				});
			});
		}
	});

	return rows;
});

const tableHeaders = computed<Array<TableHeader<TableRow>>>(() => [
	{
		title: i18n.baseText('projects.settings.externalSecrets.table.header.secretName'),
		key: 'secretName',
		disableSort: true,
		value: (row: TableRow) => (row.type === 'secret' ? row.secretName : ''),
	},
	{
		title: i18n.baseText('projects.settings.externalSecrets.table.header.provider'),
		key: 'secretsStore',
		disableSort: true,
		value: (row: TableRow) => row.providerName,
	},
	{
		title: i18n.baseText('projects.settings.externalSecrets.table.header.usedInCredentials'),
		key: 'credentialsCount',
		width: 200,
		disableSort: true,
		value: (row: TableRow) =>
			row.type === 'secret' && row.credentialsCount !== undefined ? row.credentialsCount : '',
	},
]);

function toggleProvider(providerName: string) {
	if (expandedProviders.value.has(providerName)) {
		expandedProviders.value.delete(providerName);
	} else {
		expandedProviders.value.add(providerName);
	}
}

function getProviderTypeInfo(providerType: string) {
	return secretsProviders.providerTypes.value.find(
		(type: { type: string }) => type.type === providerType,
	);
}

async function fetchProjectSecretProviders() {
	if (
		!projectsStore.currentProjectId ||
		!hasExternalSecretsListPermission.value ||
		!isFeatureEnabled.value
	) {
		return;
	}
	isLoadingSecretProviders.value = true;
	try {
		projectSecretProviders.value = await projectsStore.getProjectSecretProviders(
			projectsStore.currentProjectId,
		);
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('projects.settings.externalSecrets.load.error'));
	} finally {
		isLoadingSecretProviders.value = false;
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
				await fetchProjectSecretProviders();
			},
		},
	});
}

function openProviderModal(providerKey: string) {
	openConnectionModal(providerKey, 'connection');
}

function onAddSecretsStore() {
	openConnectionModal();
}

function onShareSecretsStore() {
	void router.push({ name: VIEWS.EXTERNAL_SECRETS_SETTINGS });
}

watch(secretsSearch, () => {
	currentPage.value = 0;
});

// Fetch project secret providers when currentProjectId is available
watch(
	() => projectsStore.currentProjectId,
	async (newProjectId) => {
		if (newProjectId && showExternalSecretsSection.value) {
			await fetchProjectSecretProviders();
		}
	},
	{ immediate: true },
);

onMounted(async () => {
	if (!showExternalSecretsSection.value) return;
	await Promise.all([
		secretsProviders.fetchProviderTypes(),
		secretsProviders.fetchActiveConnections(),
	]);
});

defineExpose({
	fetchProjectSecretProviders,
});
</script>

<template>
	<fieldset v-if="showExternalSecretsSection">
		<h3 class="mb-s">
			<label for="projectExternalSecrets">{{
				i18n.baseText('projects.settings.externalSecrets')
			}}</label>
		</h3>

		<!-- Empty State: Consolidated view based on user role and current state -->
		<N8nActionBox
			v-if="emptyStateConfig"
			:class="$style.externalSecretsEmpty"
			:data-test-id="emptyStateConfig.testId"
			description="yes"
		>
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
					type="highlight"
					class="mr-2xs"
					element="a"
					:href="i18n.baseText('settings.externalSecrets.docs')"
					target="_blank"
					data-test-id="secrets-provider-connections-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
				</N8nButton>
				<N8nButton
					:type="emptyStateConfig.buttonType"
					:data-test-id="`${emptyStateType}-button`"
					@click="emptyStateConfig.buttonAction"
				>
					{{ emptyStateConfig.buttonText }}
				</N8nButton>
			</template>
		</N8nActionBox>

		<!-- Table View: Show when there are providers -->
		<div v-else-if="projectSecretProviders.length > 0" :class="$style.secretProvidersContainer">
			<div v-if="projectSecretProviders.length >= 5" :class="$style.searchContainer">
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

			<N8nDataTableServer
				v-model:page="currentPage"
				:headers="tableHeaders"
				:items="tableRows"
				:items-length="filteredProviders.length"
				:loading="isLoadingSecretProviders"
				:items-per-page="itemsPerPage"
				:page-sizes="[5, 10, 25, 50]"
				:row-props="
					(row) => ({ class: row.type === 'provider-header' ? $style.groupHeaderRow : '' })
				"
				data-test-id="external-secrets-table"
			>
				<template #item="{ item }">
					<!-- Provider Header Row -->
					<tr
						v-if="item.type === 'provider-header'"
						:class="$style.groupHeaderRow"
						@click="toggleProvider(item.providerName)"
					>
						<td colspan="3" :class="$style.groupHeaderCell">
							<div :class="$style.groupHeaderContent">
								<N8nIcon
									:icon="item.isExpanded ? 'chevron-down' : 'chevron-right'"
									:class="$style.expandIcon"
								/>
								<N8nText bold>{{ item.providerDisplayName }}</N8nText>
							</div>
						</td>
					</tr>
					<!-- Secret Row -->
					<tr v-else :class="$style.secretRow">
						<td :class="$style.secretNameCell">
							<code :class="$style.secretName">{{ item.secretName }}</code>
						</td>
						<td :class="$style.secretStoreCell">
							<N8nLink
								:class="$style.providerLink"
								data-test-id="secrets-store-link"
								@click="openProviderModal(item.providerKey)"
							>
								{{ item.providerName }}
							</N8nLink>
						</td>
						<td :class="$style.secretCredentialsCell">
							<N8nText
								v-if="item.credentialsCount !== undefined"
								size="small"
								:class="$style.credentialsCount"
							>
								{{ item.credentialsCount }}
							</N8nText>
						</td>
					</tr>
				</template>
			</N8nDataTableServer>
		</div>
	</fieldset>
</template>

<style lang="scss" module>
.externalSecretsEmpty {
	margin-bottom: var(--spacing--lg);
}

.description {
	max-width: 40rem;
	display: block;
}

.secretProvidersContainer {
	margin-top: var(--spacing--sm);
	max-width: 100%;
	overflow: auto;
}

.searchContainer {
	margin-bottom: var(--spacing--sm);
	max-width: var(--project-field--width);
}

.groupHeaderRow {
	background-color: var(--color--background--light-3);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.groupHeaderCell {
	padding: 0 !important;
}

.secretRow {
	background-color: var(--color--background--light-3);
	position: relative;

	&:not(:last-child):not(:has(+ .groupHeaderRow))::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--spacing--lg);
		right: var(--spacing--lg);
		height: 1px;
		background-color: var(--color--foreground);
	}
}

.groupHeaderRow:not(:first-child) {
	border-top: var(--border);
}

.groupHeaderRow:not(:last-child) {
	border-bottom: var(--border);
}

.groupHeaderContent {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--sm) var(--spacing--xl);
	width: 100%;
}

.expandIcon {
	position: absolute;
	left: var(--spacing--xs);
	transition: transform 0.2s;
	color: var(--color--text);
	flex-shrink: 0;
}

.secretNameCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0 var(--spacing--2xs) var(--spacing--xl);
}

.secretName {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	background-color: var(--color--neutral-125);
	padding: var(--spacing--4xs);
}

.secretIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.secretStoreCell {
	padding: var(--spacing--2xs) 0;
}

.secretCredentialsCell {
	padding: var(--spacing--2xs) var(--spacing--xl) var(--spacing--2xs) 0;
}

.providerLink {
	&:hover {
		text-decoration: underline;
	}
}

.credentialsCount {
	color: var(--color--text);
}
</style>
