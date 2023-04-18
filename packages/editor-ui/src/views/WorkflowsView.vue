<template>
	<resources-list-layout
		ref="layout"
		resource-key="workflows"
		:resources="allWorkflows"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:show-aside="allWorkflows.length > 0"
		:shareable="isShareable"
		:initialize="initialize"
		@click:add="addWorkflow"
		@update:filters="filters = $event"
	>
		<template #callout v-if="!hasActiveWorkflows">
			<n8n-callout theme="secondary" icon="graduation-cap" class="mb-xs">
				{{ $locale.baseText('workflows.viewDemoNotice') }}

				<template #trailingContent>
					<n8n-link size="small" theme="secondary" bold underline @click="goToTemplates">
						{{ $locale.baseText('workflows.viewDemo') }}
					</n8n-link>
				</template>
			</n8n-callout>
		</template>
		<template #default="{ data, updateItemSize }">
			<workflow-card
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				@expand:tags="updateItemSize(data)"
				@click:tag="onClickTag"
			/>
		</template>
		<template #empty>
			<div class="text-center mt-s">
				<n8n-heading tag="h2" size="xlarge" class="mb-2xs">
					{{
						$locale.baseText(
							currentUser.firstName
								? 'workflows.empty.heading'
								: 'workflows.empty.heading.userNotSetup',
							{ interpolate: { name: currentUser.firstName } },
						)
					}}
				</n8n-heading>
				<n8n-text size="large" color="text-base">
					{{ $locale.baseText('workflows.empty.description') }}
				</n8n-text>
			</div>
			<div :class="['text-center', 'mt-2xl', $style.actionsContainer]">
				<n8n-card
					:class="$style.emptyStateCard"
					hoverable
					@click="addWorkflow"
					data-test-id="new-workflow-card"
				>
					<n8n-icon :class="$style.emptyStateCardIcon" icon="file" />
					<n8n-text size="large" class="mt-xs" color="text-base">
						{{ $locale.baseText('workflows.empty.startFromScratch') }}
					</n8n-text>
				</n8n-card>
				<n8n-card
					:class="$style.emptyStateCard"
					hoverable
					@click="goToTemplates"
					data-test-id="new-workflow-template-card"
				>
					<n8n-icon :class="$style.emptyStateCardIcon" icon="graduation-cap" />
					<n8n-text size="large" class="mt-xs" color="text-base">
						{{ $locale.baseText('workflows.empty.viewDemo') }}
					</n8n-text>
				</n8n-card>
			</div>
		</template>
		<template #filters="{ setKeyValue }">
			<div class="mb-s" v-if="settingsStore.areTagsEnabled">
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
			<div class="mb-s">
				<n8n-input-label
					:label="$locale.baseText('workflows.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<n8n-select :value="filters.status" @input="setKeyValue('status', $event)" size="medium">
					<n8n-option
						v-for="option in statusFilterOptions"
						:key="option.label"
						:label="option.label"
						:value="option.value"
					>
					</n8n-option>
				</n8n-select>
			</div>
		</template>
	</resources-list-layout>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import TemplateCard from '@/components/TemplateCard.vue';
import { EnterpriseEditionFeature, ASSUMPTION_EXPERIMENT, VIEWS } from '@/constants';
import { debounceHelper } from '@/mixins/debounce';
import Vue from 'vue';
import { ITag, IUser, IWorkflowDb } from '@/Interface';
import TagsDropdown from '@/components/TagsDropdown.vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';
import { useCredentialsStore } from '@/stores/credentials';
import { usePostHog } from '@/stores/posthog';

type IResourcesListLayoutInstance = Vue & { sendFiltersTelemetry: (source: string) => void };

const StatusFilter = {
	ACTIVE: true,
	DEACTIVATED: false,
	ALL: '',
};

const WorkflowsView = mixins(showMessage, debounceHelper).extend({
	name: 'WorkflowsView',
	components: {
		ResourcesListLayout,
		TemplateCard,
		PageViewLayout,
		PageViewLayoutList,
		SettingsView,
		WorkflowCard,
		TagsDropdown,
	},
	data() {
		return {
			filters: {
				search: '',
				ownedBy: '',
				sharedWith: '',
				status: StatusFilter.ALL,
				tags: [] as string[],
			},
		};
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
			useCredentialsStore,
		),
		currentUser(): IUser {
			return this.usersStore.currentUser || ({} as IUser);
		},
		allWorkflows(): IWorkflowDb[] {
			return this.workflowsStore.allWorkflows;
		},
		isShareable(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		hasActiveWorkflows(): boolean {
			return !!this.workflowsStore.activeWorkflows.length;
		},
		statusFilterOptions(): Array<{ label: string; value: string | boolean }> {
			return [
				{
					label: this.$locale.baseText('workflows.filters.status.all'),
					value: StatusFilter.ALL,
				},
				{
					label: this.$locale.baseText('workflows.filters.status.active'),
					value: StatusFilter.ACTIVE,
				},
				{
					label: this.$locale.baseText('workflows.filters.status.deactivated'),
					value: StatusFilter.DEACTIVATED,
				},
			];
		},
	},
	methods: {
		addWorkflow() {
			this.uiStore.nodeViewInitialized = false;
			this.$router.push({ name: VIEWS.NEW_WORKFLOW });

			this.$telemetry.track('User clicked add workflow button', {
				source: 'Workflows list',
			});
		},
		goToTemplates() {
			this.$router.push({ name: VIEWS.TEMPLATES });
		},
		async initialize() {
			await Promise.all([
				this.usersStore.fetchUsers(),
				this.workflowsStore.fetchAllWorkflows(),
				this.workflowsStore.fetchActiveWorkflows(),
			]);

			this.credentialsStore.fetchAllCredentials();
		},
		onClickTag(tagId: string, event: PointerEvent) {
			if (!this.filters.tags.includes(tagId)) {
				this.filters.tags.push(tagId);
			}
		},
		onFilter(
			resource: IWorkflowDb,
			filters: { tags: string[]; search: string; status: string | boolean },
			matches: boolean,
		): boolean {
			if (this.settingsStore.areTagsEnabled && filters.tags.length > 0) {
				matches =
					matches &&
					filters.tags.every((tag) =>
						(resource.tags as ITag[])?.find((resourceTag) =>
							typeof resourceTag === 'object'
								? `${resourceTag.id}` === `${tag}`
								: `${resourceTag}` === `${tag}`,
						),
					);
			}

			if (filters.status !== '') {
				matches = matches && resource.active === filters.status;
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
	mounted() {
		this.usersStore.showPersonalizationSurvey();
	},
});

export default WorkflowsView;
</script>

<style lang="scss" module>
.actionsContainer {
	display: flex;
	justify-content: center;
}

.emptyStateCard {
	width: 192px;
	text-align: center;
	display: inline-flex;
	height: 230px;

	& + & {
		margin-left: var(--spacing-s);
	}

	&:hover {
		svg {
			color: var(--color-primary);
		}
	}
}

.emptyStateCardIcon {
	font-size: 48px;

	svg {
		width: 48px !important;
		color: var(--color-foreground-dark);
		transition: color 0.3s ease;
	}
}
</style>
