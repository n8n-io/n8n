<template>
	<resources-list-layout
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
		<template #default="{ data }">
			<credential-card data-test-id="resources-list-item" class="mb-2xs" :data="data" />
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
					:value="filters.type"
					size="medium"
					multiple
					filterable
					ref="typeInput"
					:class="$style['type-input']"
					@input="setKeyValue('type', $event)"
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
	</resources-list-layout>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import type { ICredentialsResponse, ICredentialTypeMap } from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import CredentialCard from '@/components/CredentialCard.vue';
import type { ICredentialType } from 'n8n-workflow';
import TemplateCard from '@/components/TemplateCard.vue';
import { debounceHelper } from '@/mixins/debounce';
import ResourceOwnershipSelect from '@/components/forms/ResourceOwnershipSelect.ee.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '@/constants';
import type Vue from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';

type IResourcesListLayoutInstance = Vue & { sendFiltersTelemetry: (source: string) => void };

export default mixins(showMessage, debounceHelper).extend({
	name: 'SettingsPersonalView',
	components: {
		ResourcesListLayout,
		TemplateCard,
		PageViewLayout,
		PageViewLayoutList,
		SettingsView,
		CredentialCard,
		ResourceOwnershipSelect,
		ResourceFiltersDropdown,
	},
	data() {
		return {
			filters: {
				search: '',
				ownedBy: '',
				sharedWith: '',
				type: '',
			},
		};
	},
	computed: {
		...mapStores(useCredentialsStore, useNodeTypesStore, useUIStore, useUsersStore),
		allCredentials(): ICredentialsResponse[] {
			return this.credentialsStore.allCredentials;
		},
		allCredentialTypes(): ICredentialType[] {
			return this.credentialsStore.allCredentialTypes;
		},
		credentialTypesById(): ICredentialTypeMap {
			return this.credentialsStore.credentialTypesById;
		},
	},
	methods: {
		addCredential() {
			this.uiStore.openModal(CREDENTIAL_SELECT_MODAL_KEY);

			this.$telemetry.track('User clicked add cred button', {
				source: 'Creds list',
			});
		},
		async initialize() {
			const loadPromises = [
				this.credentialsStore.fetchAllCredentials(),
				this.credentialsStore.fetchCredentialTypes(false),
			];

			if (this.nodeTypesStore.allNodeTypes.length === 0) {
				loadPromises.push(this.nodeTypesStore.getNodeTypes());
			}

			await Promise.all(loadPromises);

			await this.usersStore.fetchUsers(); // Can be loaded in the background, used for filtering
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
	watch: {
		'filters.type'() {
			this.sendFiltersTelemetry('type');
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
