<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import type { ICredentialsResponse, ICredentialTypeMap } from '@/Interface';
import type { ICredentialType, ICredentialsDecrypted } from 'n8n-workflow';
import ResourcesListLayout, {
	type IResource,
	type IFilters,
} from '@/components/layouts/ResourcesListLayout.vue';
import CredentialCard from '@/components/CredentialCard.vue';
import {
	CREDENTIAL_SELECT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	EnterpriseEditionFeature,
} from '@/constants';
import { useUIStore, listenForModalChanges } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useProjectsStore } from '@/stores/projects.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { getResourcePermissions } from '@/permissions';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { N8nCheckbox } from 'n8n-design-system';
import { pickBy } from 'lodash-es';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';

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

const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();

type Filters = IFilters & { type?: string[]; setupNeeded?: boolean };
const updateFilter = (state: Filters) => {
	void router.replace({ query: pickBy(state) as LocationQueryRaw });
};

const filters = computed<Filters>(
	() =>
		({ ...route.query, setupNeeded: route.query.setupNeeded?.toString() === 'true' }) as Filters,
);
const loading = ref(false);

const needsSetup = (data: string | undefined): boolean => {
	const dataObject = data as unknown as ICredentialsDecrypted['data'];
	if (!dataObject) return false;

	if (Object.keys(dataObject).length === 0) return true;

	return Object.values(dataObject).every((value) => !value || value === CREDENTIAL_EMPTY_VALUE);
};

const allCredentials = computed<IResource[]>(() =>
	credentialsStore.allCredentials.map((credential) => ({
		id: credential.id,
		name: credential.name,
		value: '',
		updatedAt: credential.updatedAt,
		createdAt: credential.createdAt,
		homeProject: credential.homeProject,
		scopes: credential.scopes,
		type: credential.type,
		sharedWithProjects: credential.sharedWithProjects,
		readOnly: !getResourcePermissions(credential.scopes).credential.update,
		needsSetup: needsSetup(credential.data),
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

watch(
	() => props.credentialId,
	(id) => {
		if (!id) return;

		if (id === 'create') {
			uiStore.openModal(CREDENTIAL_SELECT_MODAL_KEY);
			return;
		}

		uiStore.openExistingCredential(id);
	},
	{
		immediate: true,
	},
);

const onFilter = (resource: IResource, newFilters: IFilters, matches: boolean): boolean => {
	const iResource = resource as ICredentialsResponse & { needsSetup: boolean };
	const filtersToApply = newFilters as Filters;
	if (filtersToApply.type && filtersToApply.type.length > 0) {
		matches = matches && filtersToApply.type.includes(iResource.type);
	}

	if (filtersToApply.search) {
		const searchString = filtersToApply.search.toLowerCase();

		matches =
			matches ||
			(credentialTypesById.value[iResource.type] &&
				credentialTypesById.value[iResource.type].displayName.toLowerCase().includes(searchString));
	}

	if (filtersToApply.setupNeeded) {
		matches = matches && iResource.needsSetup;
	}

	return matches;
};

const initialize = async () => {
	loading.value = true;
	const isVarsEnabled =
		useSettingsStore().isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables];

	const loadPromises = [
		credentialsStore.fetchAllCredentials(route?.params?.projectId as string | undefined),
		credentialsStore.fetchCredentialTypes(false),
		externalSecretsStore.fetchAllSecrets(),
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		isVarsEnabled ? useEnvironmentsStore().fetchAllVariables() : Promise.resolve(), // for expression resolution
	];

	await Promise.all(loadPromises);
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

onMounted(() => {
	documentTitle.set(i18n.baseText('credentials.heading'));
});
</script>

<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="credentials"
		:resources="allCredentials"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:type-props="{ itemSize: 77 }"
		:loading="loading"
		:disabled="readOnlyEnv || !projectPermissions.credential.create"
		@update:filters="updateFilter"
	>
		<template #header>
			<ProjectHeader />
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
			<n8n-action-box
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
			</n8n-action-box>
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
