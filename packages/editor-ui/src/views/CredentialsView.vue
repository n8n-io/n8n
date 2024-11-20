<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ICredentialsResponse, ICredentialTypeMap } from '@/Interface';
import ResourcesListLayout, {
	type IResource,
	type IFilters,
} from '@/components/layouts/ResourcesListLayout.vue';
import CredentialCard from '@/components/CredentialCard.vue';
import type { ICredentialType } from 'n8n-workflow';
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
import { getResourcePermissions } from '@/permissions';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';

const props = defineProps<{
	credentialId?: string;
}>();

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const externalSecretsStore = useExternalSecretsStore();
const projectsStore = useProjectsStore();

const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();

const filters = ref<IFilters>({
	search: '',
	homeProject: '',
	type: [],
});

const loading = ref(false);

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
	void router.replace({ params: { credentialId } });
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
			void router.replace({ params: { credentialId: '' } });
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
	const iResource = resource as ICredentialsResponse;
	const filtersToApply = newFilters as IFilters & { type: string[] };
	if (filtersToApply.type.length > 0) {
		matches = matches && filtersToApply.type.includes(iResource.type);
	}

	if (filtersToApply.search) {
		const searchString = filtersToApply.search.toLowerCase();

		matches =
			matches ||
			(credentialTypesById.value[iResource.type] &&
				credentialTypesById.value[iResource.type].displayName.toLowerCase().includes(searchString));
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
		@click:add="addCredential"
		@update:filters="filters = $event"
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
