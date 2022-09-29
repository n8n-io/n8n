<template>
	<resources-list-layout
		ref="layout"
		resource-key="workflows"
		:resources="allWorkflows"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		@click:add="addWorkflow"
		@update:filters="filters = $event"
	>
		<template v-slot="{ data }">
			<credential-card :data="data"/>
		</template>
		<template v-slot:filters="{ setKeyValue }">
			<div class="mb-s">
				<n8n-input-label
					:label="$locale.baseText('workflows.filters.tags')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<TagsDropdown
					:placeholder="$locale.baseText('workflowOpen.filterWorkflows')"
					:currentTagIds="filters.tags"
					:createEnabled="false"
					@update="setKeyValue('tags', $event)"
				/>
			</div>
		</template>
	</resources-list-layout>
</template>

<script lang="ts">
import {showMessage} from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import ResourcesListLayout from "@/components/layouts/ResourcesListLayout.vue";
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import PageViewLayoutList from "@/components/layouts/PageViewLayoutList.vue";
import CredentialCard from "@/components/CredentialCard.vue";
import TemplateCard from "@/components/TemplateCard.vue";
import { debounceHelper } from '@/components/mixins/debounce';
import ResourceOwnershipSelect from "@/components/forms/ResourceOwnershipSelect.ee.vue";
import ResourceFiltersDropdown from "@/components/forms/ResourceFiltersDropdown.vue";
import {CREDENTIAL_SELECT_MODAL_KEY} from '@/constants';
import Vue from "vue";
import {IWorkflowDb, IWorkflowResponse} from "n8n";
import TagsDropdown from "@/components/TagsDropdown.vue";

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
		TagsDropdown,
	},
	data() {
		return {
			filters: {
				search: '',
				ownedBy: '',
				sharedWith: '',
				tags: []
			},
		};
	},
	computed: {
		allWorkflows(): IWorkflowResponse[] {
			return this.$store.getters['allWorkflows'];
		},
	},
	methods: {
		addWorkflow() {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);

			this.$telemetry.track('User clicked add workflow button', {
				source: 'Workflows list',
			});
		},
		async initialize() {
			await Promise.all([
				this.$store.dispatch('fetchAllWorkflows'),
				this.$store.dispatch('fetchActiveWorkflows'),
			]);

			this.$store.dispatch('users/fetchUsers'); // Can be loaded in the background, used for filtering
		},
		onFilter(resource: IWorkflowDb, filters: { type: string[]; search: string; }, matches: boolean): boolean {
			// @TODO
			// if (filters.tags.length > 0) {
			// 	matches = matches && filters.type.includes(resource.tags);
			// }

			return matches;
		},
		sendFiltersTelemetry(source: string) {
			(this.$refs.layout as IResourcesListLayoutInstance).sendFiltersTelemetry(source);
		},
	},
	watch: {
		'filters.tags'() {
			this.sendFiltersTelemetry('tags');
		},
	},
});
</script>


