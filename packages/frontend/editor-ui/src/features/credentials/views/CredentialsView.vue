<script setup lang="ts">
import CredentialCard from '../components/CredentialCard.vue';
import SelectedItemsInfo from '@/app/components/common/SelectedItemsInfo.vue';
import type { SelectionBarAction } from '@/app/components/common/SelectedItemsInfo.vue';
import EmptySharedSectionActionBox from '@/features/core/folders/components/EmptySharedSectionActionBox.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import type { BaseFilters, CredentialsResource, Resource } from '@/Interface';
import type { ICredentialsResponse, ICredentialTypeMap } from '../credentials.types';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { CREDENTIAL_EDIT_MODAL_KEY, CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { isCredentialsResource } from '@/app/utils/typeGuards';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import pickBy from 'lodash/pickBy';
import type { ICredentialType, ICredentialsDecrypted } from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useCredentialsStore } from '../credentials.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useDependencies } from '@/app/composables/useDependencies';
import { useInstanceAiCredentialHelp } from '@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp';
import { useResourcesListSelection } from '@/app/composables/useResourcesListSelection';
import { useAvailableProjectSearch } from '@/features/collaboration/projects/projects.utils';
import BulkCredentialActionReviewDialog from '../bulkActions/BulkCredentialActionReviewDialog.vue';
import {
	formatBulkCredentialActionError,
	useBulkCredentialActions,
} from '../bulkActions/useBulkCredentialActions';
import type { BulkCredentialActionConfig } from '../bulkActions/bulkCredentialActions.types';

import { N8nCheckbox, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
const props = defineProps<{
	credentialId?: string;
}>();

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const externalSecretsStore = useExternalSecretsStore();
const projectsStore = useProjectsStore();

// Credentials-list credential help (shared with the new-credential dialog): opens
// Instance AI in a new tab asking about the credential alone.
const instanceAiCredentialHelp = useInstanceAiCredentialHelp();
const insightsStore = useInsightsStore();
const { fetchDependencyCounts } = useDependencies();

const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const toast = useToast();
const i18n = useI18n();
const overview = useProjectPages();
const projectSearchFn = useAvailableProjectSearch();

const MAX_SELECTED_CREDENTIALS = 100;

type Filters = BaseFilters & {
	type?: string[];
	setupNeeded?: boolean;
	externalSecretsStore?: string;
};
const updateFilter = (state: Filters) => {
	selection.clear();
	void router.replace({ query: pickBy(state) as LocationQueryRaw });
};

const onSearchUpdated = (search: string) => {
	updateFilter({ ...filters.value, search });
};

const filters = ref<Filters>({
	...route.query,
	setupNeeded: route.query.setupNeeded?.toString() === 'true',
	...(route.query.externalSecretsStore
		? { externalSecretsStore: route.query.externalSecretsStore.toString() }
		: {}),
} as Filters);
const loading = ref(false);

const needsSetup = (credential: ICredentialsResponse): boolean => {
	// Private (resolvable) credentials store their connection data per-user via a
	// resolver, so their own `data` is always empty and they never need setup.
	if (credential.isResolvable) return false;

	const dataObject = credential.data as unknown as ICredentialsDecrypted['data'];
	if (!dataObject) return false;

	if (Object.keys(dataObject).length === 0) return true;

	return Object.values(dataObject).every((value) => !value || value === CREDENTIAL_EMPTY_VALUE);
};

const allCredentials = computed<CredentialsResource[]>(() =>
	credentialsStore.allCredentials.map((credential) => ({
		resourceType: 'credential',
		id: credential.id,
		name: credential.name,
		value: '',
		updatedAt: credential.updatedAt,
		createdAt: credential.createdAt,
		homeProject: credential.homeProject,
		scopes: credential.scopes,
		sharedWithProjects: credential.sharedWithProjects,
		readOnly: !getResourcePermissions(credential.scopes).credential.update,
		needsSetup: needsSetup(credential),
		isGlobal: credential.isGlobal,
		isResolvable: credential.isResolvable,
		connectedByMe: credential.connectedByMe,
		type: credential.type,
	})),
);

const selection = useResourcesListSelection<CredentialsResource>({
	maxSelected: MAX_SELECTED_CREDENTIALS,
});
const selectedCredentials = selection.selectedItems;
const selectedCount = selection.selectedCount;
const selectionLimitReached = selection.isLimitReached;

const bulkActions = useBulkCredentialActions({
	selectedItems: selectedCredentials,
	teamProjectsEnabled: computed(() => projectsStore.isTeamProjectFeatureEnabled),
});
const selectionBarActions = computed<SelectionBarAction[]>(() =>
	bulkActions.availableActions.value.map((action) => ({
		id: action.id,
		label: action.label,
		destructive: action.destructive,
	})),
);
const activeBulkAction = bulkActions.activeAction;
const isBulkDialogOpen = computed(() => activeBulkAction.value !== null);
const isBulkSubmitting = ref(false);
const bulkDialogError = ref<string | null>(null);
const bulkDialogErrorDetails = ref<string[]>([]);

const allCredentialTypes = computed<ICredentialType[]>(() => credentialsStore.allCredentialTypes);

const credentialTypesById = computed<ICredentialTypeMap>(
	() => credentialsStore.credentialTypesById,
);

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const projectPermissions = computed(() =>
	getResourcePermissions(
		projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
	),
);

const personalProject = computed<Project | null>(() => {
	return projectsStore.personalProject;
});

const showSecretStoreFilter = computed(() => {
	return (
		!!route.query.externalSecretsStore && externalSecretsStore.isEnterpriseExternalSecretsEnabled
	);
});

const setRouteCredentialId = (credentialId?: string) => {
	void router.replace({ params: { credentialId }, query: route.query });
};

const refreshCredentials = async () => {
	selection.clear();
	await credentialsStore.fetchAllCredentials({
		projectId: route?.params?.projectId as string | undefined,
		includeScopes: true,
		externalSecretsStore: filters.value.externalSecretsStore,
	});
};

const onBulkActionSelected = (id: string) => {
	const action = bulkActions.availableActions.value.find((candidate) => candidate.id === id);
	if (!action) return;
	bulkDialogError.value = null;
	bulkDialogErrorDetails.value = [];
	bulkActions.openAction(action.id);
};

const onBulkDialogOpenChange = (open: boolean) => {
	if (open) return;
	bulkActions.closeDialog();
	bulkDialogError.value = null;
	bulkDialogErrorDetails.value = [];
};

const onBulkConfirm = async (config: BulkCredentialActionConfig) => {
	const actionId = activeBulkAction.value?.id;
	if (!actionId) return;

	isBulkSubmitting.value = true;
	bulkDialogError.value = null;
	bulkDialogErrorDetails.value = [];
	try {
		const result = await bulkActions.execute(config);
		const completed = result.items.filter((item) => item.status === 'completed').length;
		const failed = result.items.filter((item) => item.status === 'failed').length;
		const notAttempted = result.items.filter((item) => item.status === 'notAttempted').length;

		bulkActions.closeDialog();
		selection.clear();
		await refreshCredentials();

		if (result.status === 'completed') {
			toast.showMessage({
				title: i18n.baseText(`credentials.bulkActions.toast.success.${actionId}`, {
					adjustToNumber: completed,
					interpolate: { count: String(completed) },
				}),
				type: 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText(`credentials.bulkActions.toast.partial.title.${actionId}`),
				message: i18n.baseText(`credentials.bulkActions.toast.partial.message.${actionId}`, {
					interpolate: {
						completed: String(completed),
						failed: String(failed),
						notAttempted: String(notAttempted),
					},
				}),
				type: 'warning',
			});
		}
	} catch (error) {
		const formatted = formatBulkCredentialActionError(
			error,
			selectedCredentials.value,
			i18n.baseText(`credentials.bulkActions.error.${actionId}`),
		);
		bulkDialogError.value = formatted.message;
		bulkDialogErrorDetails.value = formatted.details;
	} finally {
		isBulkSubmitting.value = false;
	}
};

const addCredential = () => {
	setRouteCredentialId('create');
	telemetry.track('User clicked add cred button', {
		source: 'Creds list',
	});
};

listenForModalChanges({
	store: uiStore,
	onModalClosed(modalName) {
		if ([CREDENTIAL_SELECT_MODAL_KEY, CREDENTIAL_EDIT_MODAL_KEY].includes(modalName as string)) {
			void router.replace({ params: { credentialId: '' }, query: route.query });
		}
		if (modalName === CREDENTIAL_EDIT_MODAL_KEY && credentialsStore.pendingOAuthRefresh) {
			credentialsStore.pendingOAuthRefresh = false;
			void refreshCredentials();
		}
	},
});

const onFilter = (resource: Resource, newFilters: BaseFilters, matches: boolean): boolean => {
	if (!isCredentialsResource(resource)) return false;
	const filtersToApply = newFilters as Filters;
	if (filtersToApply.type && filtersToApply.type.length > 0) {
		matches = matches && filtersToApply.type.includes(resource.type);
	}

	if (filtersToApply.search) {
		const searchString = filtersToApply.search.toLowerCase();

		matches =
			matches ||
			(credentialTypesById.value[resource.type] &&
				credentialTypesById.value[resource.type].displayName.toLowerCase().includes(searchString));
	}

	if (filtersToApply.setupNeeded) {
		matches = matches && resource.needsSetup;
	}

	return matches;
};

const maybeCreateCredential = () => {
	if (props.credentialId === 'create') {
		if (projectPermissions.value.credential.create) {
			// Modal data persists across opens, so clear the instance-only preset.
			uiStore.openModalWithData({ name: CREDENTIAL_SELECT_MODAL_KEY, data: {} });
		} else {
			void router.replace({ name: VIEWS.HOMEPAGE });
		}
	}
};

const maybeEditCredential = async () => {
	if (!!props.credentialId && props.credentialId !== 'create') {
		const credential = credentialsStore.getCredentialById(props.credentialId);
		const credentialPermissions = getResourcePermissions(credential?.scopes).credential;
		if (!credential) {
			return await router.replace({
				name: VIEWS.ENTITY_NOT_FOUND,
				params: { entityType: 'credential' },
			});
		}

		if (credentialPermissions.update || credentialPermissions.read) {
			uiStore.openExistingCredential(props.credentialId, {
				instanceAiCredentialHelp: instanceAiCredentialHelp(),
			});
			return;
		}

		return await router.replace({
			name: VIEWS.ENTITY_UNAUTHORIZED,
			params: { entityType: 'credential' },
		});
	}
};

const initialize = async () => {
	selection.clear();
	loading.value = true;
	const isVarsEnabled =
		useSettingsStore().isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables];

	const isPersonalView =
		!overview.isSharedSubPage &&
		overview.isProjectsSubPage &&
		route?.params?.projectId === projectsStore.personalProject?.id;

	const loadPromises = [
		credentialsStore.fetchAllCredentials({
			projectId: route?.params?.projectId as string | undefined,
			includeScopes: true,
			onlySharedWithMe: overview.isSharedSubPage,
			includeGlobal: !isPersonalView, // don't include global credentials if personal
			externalSecretsStore: filters.value.externalSecretsStore,
		}),
		credentialsStore.fetchCredentialTypes(false),
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		isVarsEnabled ? useEnvironmentsStore().fetchAllVariables() : Promise.resolve(), // for expression resolution
	];

	await Promise.all(loadPromises);
	maybeCreateCredential();
	await maybeEditCredential();
	loading.value = false;

	// Fire-and-forget: fetch which workflows use these credentials
	const credentialIds = credentialsStore.allCredentials.map((c) => c.id);
	void fetchDependencyCounts(credentialIds, 'credential');
};

credentialsStore.$onAction(({ name, after }) => {
	if (name === 'fetchAllCredentials') selection.clear();
	if (name === 'createNewCredential' || name === 'updateCredential') {
		after(() => {
			void refreshCredentials();
		});
	}
});

sourceControlStore.$onAction(({ name, after }) => {
	if (name !== 'pullWorkfolder') return;
	after(() => {
		void initialize();
	});
});

watch(() => route?.params?.projectId, initialize);

watch(
	() => props.credentialId,
	() => {
		maybeCreateCredential();
		void maybeEditCredential();
	},
);

// Watch for changes to externalSecretsStore filter and refetch data
// since this is a backend filter that affects what credentials are returned
watch(
	() => filters.value.externalSecretsStore,
	async (newValue, oldValue) => {
		// Only refetch if the filter actually changed (not on initial mount)
		if (newValue !== oldValue && (newValue !== undefined || oldValue !== undefined)) {
			void initialize();
		}
	},
);

onMounted(() => {
	documentTitle.set(i18n.baseText('credentials.heading'));
});
</script>

<template>
	<ResourcesListLayout
		ref="layout"
		v-model:filters="filters"
		resource-key="credentials"
		:resources="allCredentials"
		:initialize="initialize"
		:additional-filters-handler="onFilter"
		:type-props="{ itemSize: 77 }"
		:loading="loading"
		:disabled="readOnlyEnv || !projectPermissions.credential.create"
		@update:filters="updateFilter"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="selection.clear"
	>
		<template #header>
			<ProjectHeader main-button="credential">
				<InsightsSummary
					v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<template #list-controls="{ resources }">
			<N8nCheckbox
				v-if="resources.length"
				:model-value="selection.isPageChecked(resources)"
				:indeterminate="selection.isPageIndeterminate(resources)"
				:label="i18n.baseText('credentials.bulkActions.selectAll')"
				:class="$style.selectAllCheckbox"
				data-test-id="select-all-credentials-checkbox"
				@update:model-value="selection.togglePage(resources, $event)"
			/>
		</template>
		<template #default="{ data }">
			<CredentialCard
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				:read-only="data.readOnly"
				:needs-setup="data.needsSetup"
				:selectable="true"
				:selected="selection.isSelected(data)"
				:selection-active="selectedCount > 0"
				:selection-disabled="!selection.canSelect(data)"
				@click="setRouteCredentialId"
				@connected="refreshCredentials"
				@update:selected="selection.toggleItem(data, $event)"
			/>
		</template>
		<template #filters="{ setKeyValue }">
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('credentials.filters.type')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					ref="typeInput"
					:model-value="filters.type"
					size="medium"
					multiple
					filterable
					:class="$style['type-input']"
					@update:model-value="setKeyValue('type', $event)"
				>
					<N8nOption
						v-for="credentialType in allCredentialTypes"
						:key="credentialType.name"
						:value="credentialType.name"
						:label="credentialType.displayName"
					/>
				</N8nSelect>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('credentials.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>

				<N8nCheckbox
					:label="i18n.baseText('credentials.filters.setup')"
					data-test-id="credential-filter-setup-needed"
					:model-value="filters.setupNeeded"
					@update:model-value="setKeyValue('setupNeeded', $event)"
				>
				</N8nCheckbox>
			</div>

			<!-- secret store filter is only shown if query parameter is set in url
			 -  needed for handling deletion of enterprise external secrets -->
			<div v-if="showSecretStoreFilter && filters.externalSecretsStore" class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('credentials.filters.secretStore')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					:model-value="filters.externalSecretsStore"
					size="medium"
					disabled
					data-test-id="credential-filter-secret-store"
					:class="$style['type-input']"
				>
					<N8nOption :value="filters.externalSecretsStore" :label="filters.externalSecretsStore" />
				</N8nSelect>
			</div>
		</template>
		<template #empty>
			<EmptySharedSectionActionBox
				v-if="overview.isSharedSubPage && personalProject"
				:personal-project="personalProject"
				resource-type="credentials"
			/>
			<ResourcesListEmptyState
				v-else
				resource-key="credentials"
				:button-disabled="readOnlyEnv || !projectPermissions.credential.create"
				:disabled-tooltip-text="
					readOnlyEnv ? i18n.baseText('readOnlyEnv.cantAdd.credential') : undefined
				"
				@click:button="addCredential"
			/>
		</template>
		<template #postamble>
			<SelectedItemsInfo
				:selected-count="selectedCount"
				:actions="selectionBarActions"
				:selected-text="
					i18n.baseText(
						selectionLimitReached
							? 'credentials.bulkActions.selectedCountMaximum'
							: 'credentials.bulkActions.selectedCount',
						{
							adjustToNumber: selectedCount,
							interpolate: { count: String(selectedCount) },
						},
					)
				"
				:no-actions-text="i18n.baseText('credentials.bulkActions.noActions')"
				:no-actions-tooltip="i18n.baseText('credentials.bulkActions.noActions.tooltip')"
				@action="onBulkActionSelected"
				@clear-selection="selection.clear"
			/>

			<BulkCredentialActionReviewDialog
				:open="isBulkDialogOpen"
				:action="activeBulkAction"
				:submitting="isBulkSubmitting"
				:error-message="bulkDialogError"
				:error-details="bulkDialogErrorDetails"
				:project-search-fn="projectSearchFn"
				@update:open="onBulkDialogOpenChange"
				@confirm="onBulkConfirm"
			/>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.type-input {
	--select--dropdown--max-width: 265px;
}

.selectAllCheckbox {
	margin: 0;
	// Align the checkbox square with the per-card selection checkboxes, which are
	// centered in a --spacing--xl (32px) gutter: (32px - 16px square) / 2 = 8px.
	padding-left: var(--spacing--2xs);
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>
