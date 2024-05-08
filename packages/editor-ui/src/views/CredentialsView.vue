<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="credentials"
		:resources="allCredentials"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:type-props="{ itemSize: 77 }"
		@click:add="addCredential"
		@update:filters="filters = $event"
	>
		<template #header>
			<ProjectTabs />
		</template>
		<template #add-button="{ disabled }">
			<div>
				<n8n-button
					size="large"
					block
					:disabled="disabled"
					data-test-id="resources-list-add"
					@click="addCredential"
				>
					{{ addCredentialButtonText }}
				</n8n-button>
			</div>
		</template>
		<template #default="{ data }">
			<CredentialCard data-test-id="resources-list-item" class="mb-2xs" :data="data" />
		</template>
		<template #filters="{ setKeyValue }">
			<div class="mb-s">
				<n8n-input-label
					:label="$locale.baseText('credentials.filters.type')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<n8n-select
					ref="typeInput"
					:model-value="filters.type"
					size="medium"
					multiple
					filterable
					:class="$style['type-input']"
					@update:model-value="setKeyValue('type', $event)"
				>
					<n8n-option
						v-for="credentialType in allCredentialTypes"
						:key="credentialType.name"
						:value="credentialType.name"
						:label="credentialType.displayName"
					/>
				</n8n-select>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<script lang="ts">
import type { ICredentialsResponse, ICredentialTypeMap } from '@/Interface';
import { defineComponent } from 'vue';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import CredentialCard from '@/components/CredentialCard.vue';
import type { ICredentialType } from 'n8n-workflow';
import { CREDENTIAL_SELECT_MODAL_KEY, EnterpriseEditionFeature } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectTabs from '@/features/projects/components/ProjectTabs.vue';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useSettingsStore } from '@/stores/settings.store';

type IResourcesListLayoutInstance = InstanceType<typeof ResourcesListLayout>;

export default defineComponent({
	name: 'CredentialsView',
	components: {
		ResourcesListLayout,
		CredentialCard,
		ProjectTabs,
	},
	data() {
		return {
			filters: {
				search: '',
				homeProject: '',
				type: '',
			},
			sourceControlStoreUnsubscribe: () => {},
		};
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNodeTypesStore,
			useUIStore,
			useSourceControlStore,
			useExternalSecretsStore,
			useProjectsStore,
		),
		allCredentials(): ICredentialsResponse[] {
			return this.credentialsStore.allCredentials;
		},
		allCredentialTypes(): ICredentialType[] {
			return this.credentialsStore.allCredentialTypes;
		},
		credentialTypesById(): ICredentialTypeMap {
			return this.credentialsStore.credentialTypesById;
		},
		addCredentialButtonText() {
			return this.projectsStore.currentProject
				? this.$locale.baseText('credentials.project.add')
				: this.$locale.baseText('credentials.add');
		},
	},
	watch: {
		'filters.type'() {
			this.sendFiltersTelemetry('type');
		},
		'$route.params.projectId'() {
			void this.initialize();
		},
	},
	mounted() {
		this.sourceControlStoreUnsubscribe = this.sourceControlStore.$onAction(({ name, after }) => {
			if (name === 'pullWorkfolder' && after) {
				after(() => {
					void this.initialize();
				});
			}
		});
	},
	beforeUnmount() {
		this.sourceControlStoreUnsubscribe();
	},
	methods: {
		addCredential() {
			this.uiStore.openModal(CREDENTIAL_SELECT_MODAL_KEY);

			this.$telemetry.track('User clicked add cred button', {
				source: 'Creds list',
			});
		},
		async initialize() {
			const isVarsEnabled = useSettingsStore().isEnterpriseFeatureEnabled(
				EnterpriseEditionFeature.Variables,
			);

			const loadPromises = [
				this.credentialsStore.fetchAllCredentials(
					this.$route?.params?.projectId as string | undefined,
				),
				this.credentialsStore.fetchCredentialTypes(false),
				this.externalSecretsStore.fetchAllSecrets(),
				this.nodeTypesStore.loadNodeTypesIfNotLoaded(),
				isVarsEnabled ? useEnvironmentsStore().fetchAllVariables() : Promise.resolve(), // for expression resolution
			];

			await Promise.all(loadPromises);
		},
		onFilter(
			resource: ICredentialsResponse,
			filters: { type: string[]; search: string },
			matches: boolean,
		): boolean {
			if (filters.type.length > 0) {
				matches = matches && filters.type.includes(resource.type);
			}

			if (filters.search) {
				const searchString = filters.search.toLowerCase();

				matches =
					matches ||
					(this.credentialTypesById[resource.type] &&
						this.credentialTypesById[resource.type].displayName
							.toLowerCase()
							.includes(searchString));
			}

			return matches;
		},
		sendFiltersTelemetry(source: string) {
			(this.$refs.layout as IResourcesListLayoutInstance).sendFiltersTelemetry(source);
		},
	},
});
</script>

<style lang="scss" module>
.type-input {
	--max-width: 265px;
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>
