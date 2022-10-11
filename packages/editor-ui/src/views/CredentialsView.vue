<template>
	<resources-list-layout
		ref="layout"
		resource-key="credentials"
		:resources="allCredentials"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		@click:add="addCredential"
		@update:filters="filters = $event"
	>
		<template v-slot="{ data }">
			<credential-card :data="data"/>
		</template>
		<template v-slot:filters="{ setKeyValue }">
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
					size="small"
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
import {showMessage} from '@/components/mixins/showMessage';
import {ICredentialsResponse, IUser} from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import ResourcesListLayout from "@/components/layouts/ResourcesListLayout.vue";
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import PageViewLayoutList from "@/components/layouts/PageViewLayoutList.vue";
import CredentialCard from "@/components/CredentialCard.vue";
import {ICredentialType} from "n8n-workflow";
import TemplateCard from "@/components/TemplateCard.vue";
import { debounceHelper } from '@/components/mixins/debounce';
import ResourceOwnershipSelect from "@/components/forms/ResourceOwnershipSelect.ee.vue";
import ResourceFiltersDropdown from "@/components/forms/ResourceFiltersDropdown.vue";
import {CREDENTIAL_SELECT_MODAL_KEY} from '@/constants';
import Vue from "vue";

type IResourcesListLayoutInstance = Vue & { sendFiltersTelemetry: (source: string) => void };

export default mixins(
	showMessage,
	debounceHelper,
).extend({
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
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		allUsers(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
		allCredentials(): ICredentialsResponse[] {
			return this.$store.getters['credentials/allCredentials'];
		},
		allCredentialTypes(): ICredentialType[] {
			return this.$store.getters['credentials/allCredentialTypes'];
		},
		credentialTypesById(): Record<ICredentialType['name'], ICredentialType> {
			return this.$store.getters['credentials/credentialTypesById'];
		},
	},
	methods: {
		addCredential() {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);

			this.$telemetry.track('User clicked add cred button', {
				source: 'Creds list',
			});
		},
		async initialize() {
			const loadPromises = [
				this.$store.dispatch('credentials/fetchAllCredentials'),
				this.$store.dispatch('credentials/fetchCredentialTypes'),
			];

			if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
				loadPromises.push(this.$store.dispatch('nodeTypes/getNodeTypes'));
			}

			await Promise.all(loadPromises);

			this.$store.dispatch('users/fetchUsers'); // Can be loaded in the background, used for filtering
		},
		onFilter(resource: ICredentialsResponse, filters: { type: string[]; search: string; }, matches: boolean): boolean {
			if (filters.type.length > 0) {
				matches = matches && filters.type.includes(resource.type);
			}

			if (filters.search) {
				const searchString = filters.search.toLowerCase();

				matches = matches || (
					this.credentialTypesById[resource.type] && this.credentialTypesById[resource.type].displayName.toLowerCase().includes(searchString)
				);
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

