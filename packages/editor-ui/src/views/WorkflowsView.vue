<template>
	<resources-list-layout
		ref="layout"
		resource-key="workflows"
		:resources="allWorkflows"
		:initialize="initialize"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:show-aside="allWorkflows.length > 0"
		@click:add="addWorkflow"
		@update:filters="filters = $event"
	>
		<template v-slot="{ data }">
			<workflow-card :data="data"/>
		</template>
		<template #empty>
			<div class="text-center">
				<n8n-heading tag="h2" size="xlarge" class="mb-2xs">
					{{ $locale.baseText(currentUser.firstName ? 'workflows.empty.heading' : 'workflows.empty.heading.userNotSetup', { interpolate: { name: currentUser.firstName } }) }}
				</n8n-heading>
				<n8n-text size="large" color="text-base">
					{{ $locale.baseText('workflows.empty.description') }}
				</n8n-text>
			</div>

			<div>
				{{ $locale.baseText('workflows.empty.startFromScratch') }}
			</div>
		</template>
		<template v-slot:filters="{ setKeyValue }">
			<div class="mb-s" v-if="areTagsEnabled">
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
import WorkflowCard from "@/components/WorkflowCard.vue";
import TemplateCard from "@/components/TemplateCard.vue";
import { debounceHelper } from '@/components/mixins/debounce';
import ResourceOwnershipSelect from "@/components/forms/ResourceOwnershipSelect.ee.vue";
import ResourceFiltersDropdown from "@/components/forms/ResourceFiltersDropdown.vue";
import {CREDENTIAL_SELECT_MODAL_KEY, VIEWS} from '@/constants';
import Vue from "vue";
import {ITag, IUser, IWorkflowDb} from "@/Interface";
import TagsDropdown from "@/components/TagsDropdown.vue";
import {mapGetters} from "vuex";

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
		WorkflowCard,
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
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		areTagsEnabled(): boolean {
			return this.$store.getters['settings/areTagsEnabled'];
		},
		allWorkflows(): IWorkflowDb[] {
			return [];// this.$store.getters['allWorkflows'];
		},
	},
	methods: {
		addWorkflow() {
			this.$router.push({ name: VIEWS.NEW_WORKFLOW });

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
		onFilter(resource: IWorkflowDb, filters: { tags: ITag[]; search: string; }, matches: boolean): boolean {
			if (this.areTagsEnabled && filters.tags.length > 0) {
				matches = matches && filters.tags.every(
					(tag) => (resource.tags as ITag[])?.find((resourceTag) => typeof resourceTag === 'object' ? `${resourceTag.id}` === `${tag}` : `${resourceTag}` === `${tag}`)
				);
			}

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


