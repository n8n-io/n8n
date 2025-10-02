<script setup lang="ts">
import CredentialCard from '@/components/CredentialCard.vue';
import EmptySharedSectionActionBox from '@/components/Folders/EmptySharedSectionActionBox.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type { BaseFilters, Resource, ICredentialTypeMap } from '@/Interface';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useProjectPages } from '@/composables/useProjectPages';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	EnterpriseEditionFeature,
	VIEWS,
} from '@/constants';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { listenForModalChanges, useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import type { Project } from '@/types/projects.types';
import { isCredentialsResource } from '@/utils/typeGuards';
import { useI18n } from '@n8n/i18n';
import pickBy from 'lodash/pickBy';
import type { ICredentialType, ICredentialsDecrypted } from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

import { N8nActionBox, N8nCheckbox, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
const props = defineProps<{
	credentialId?: string;
}>();

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const externalSecretsStore = useExternalSecretsStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const insightsStore = useInsightsStore();

const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();
const overview = useProjectPages();

type Filters = BaseFilters & { type?: string[]; setupNeeded?: boolean };
const updateFilter = (state: Filters) => {
	void router.replace({ query: pickBy(state) as LocationQueryRaw });
};

const onSearchUpdated = (search: string) => {
	updateFilter({ ...filters.value, search });
};

const filters = ref<Filters>({
	...route.query,
	setupNeeded: route.query.setupNeeded?.toString() === 'true',
} as Filters);
const loading = ref(false);

const needsSetup = (data: string | undefined): boolean => {
	const dataObject = data as unknown as ICredentialsDecrypted['data'];
	if (!dataObject) return false;

	if (Object.keys(dataObject).length === 0) return true;

	return Object.values(dataObject).every((value) => !value || value === CREDENTIAL_EMPTY_VALUE);
};

const allCredentials = computed<Resource[]>(() =>
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
		needsSetup: needsSetup(credential.data),
		type: credential.type,
	})),
);

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

const setRouteCredentialId = (credentialId?: string) => {
	void router.replace({ params: { credentialId }, query: route.query });
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
			uiStore.openModal(CREDENTIAL_SELECT_MODAL_KEY);
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
			uiStore.openExistingCredential(props.credentialId);
			return;
		}

		return await router.replace({
			name: VIEWS.ENTITY_UNAUTHORIZED,
			params: { entityType: 'credential' },
		});
	}
};

const initialize = async () => {
	loading.value = true;
	const isVarsEnabled =
		useSettingsStore().isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables];

	const loadPromises = [
		credentialsStore.fetchAllCredentials(
			route?.params?.projectId as string | undefined,
			true,
			overview.isSharedSubPage,
		),
		credentialsStore.fetchCredentialTypes(false),
		externalSecretsStore.fetchAllSecrets(),
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		isVarsEnabled ? useEnvironmentsStore().fetchAllVariables() : Promise.resolve(), // for expression resolution
	];

	await Promise.all(loadPromises);
	maybeCreateCredential();
	await maybeEditCredential();
	loading.value = false;
};

credentialsStore.$onAction(({ name, after }) => {
	if (name === 'createNewCredential') {
		after(() => {
			void credentialsStore.fetchAllCredentials(route?.params?.projectId as string | undefined);
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
	>
		<template #header>
			<ProjectHeader>
				<InsightsSummary
					v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<template #default="{ data }">
			<CredentialCard
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				:read-only="data.readOnly"
				:needs-setup="data.needsSetup"
				@click="setRouteCredentialId"
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
		</template>
		<template #empty>
			<EmptySharedSectionActionBox
				v-if="overview.isSharedSubPage && personalProject"
				:personal-project="personalProject"
				resource-type="credentials"
			/>
			<N8nActionBox
				v-else
				data-test-id="empty-resources-list"
				emoji="👋"
				:heading="
					i18n.baseText(
						usersStore.currentUser?.firstName
							? 'credentials.empty.heading'
							: 'credentials.empty.heading.userNotSetup',
						{
							interpolate: { name: usersStore.currentUser?.firstName ?? '' },
						},
					)
				"
				:description="i18n.baseText('credentials.empty.description')"
				:button-text="i18n.baseText('credentials.empty.button')"
				button-type="secondary"
				:button-disabled="readOnlyEnv || !projectPermissions.credential.create"
				:button-icon="readOnlyEnv ? 'lock' : undefined"
				@click:button="addCredential"
			>
				<template #disabledButtonTooltip>
					{{
						readOnlyEnv
							? i18n.baseText('readOnlyEnv.cantAdd.credential')
							: i18n.baseText('credentials.empty.button.disabled.tooltip')
					}}
				</template>
			</N8nActionBox>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.type-input {
	--max-width: 265px;
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>
