<template>
	<resources-list-layout
		ref="layout"
		:resource-key="resource"
		:resources="
			activeFolder.id || showAllWorkflows || allFolders.length === 0 ? allWorkflows : allFolders
		"
		:filters="filters"
		:additional-filters-handler="onFilter"
		:type-props="{ itemSize: 80 }"
		:show-aside="allWorkflows.length > 0"
		:shareable="isShareable"
		:initialize="initialize"
		:disabled="readOnlyEnv"
		:active-folder="activeFolder"
		@click:add="addWorkflow"
		@click:back="resetFolder"
		@update:activeFolder="onUpdateFolder"
		@update:isInFolder="onUpdateIsInFolder"
		@update:filters="filters = $event"
	>
		<template #add-button="{ disabled }">
			<n8n-tooltip :disabled="!readOnlyEnv">
				<div>
					<n8n-button
						size="large"
						block
						:disabled="disabled"
						@click="addWorkflow"
						data-test-id="resources-list-add"
						class="mb-3xs"
					>
						{{ $locale.baseText(`workflows.add`) }}
					</n8n-button>
				</div>
				<template #content>
					{{ $locale.baseText('mainSidebar.workflows.readOnlyEnv.tooltip') }}
				</template>
			</n8n-tooltip>
			<n8n-tooltip :disabled="!readOnlyEnv">
				<div>
					<n8n-button
						size="large"
						block
						type="secondary"
						:disabled="activeFolder.id || (allFolders.length > 0 && showAllWorkflows)"
						@click="addFolder"
						data-test-id="resources-list-add"
					>
						{{ $locale.baseText(`folders.add`) }}
					</n8n-button>
				</div>
				<template #content>
					{{ $locale.baseText('mainSidebar.workflows.readOnlyEnv.tooltip') }}
				</template>
			</n8n-tooltip>
		</template>
		<template #default="{ data, updateItemSize }">
			<folder-card
				v-if="!activeFolder.id && !showAllWorkflows && allFolders.length > 0"
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				@expand:tags="updateItemSize(data)"
				@click:tag="onClickTag"
				@click:folder="onUpdateFolder"
				:readOnly="readOnlyEnv"
			/>
			<workflow-card
				v-else
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				@expand:tags="updateItemSize(data)"
				@click:tag="onClickTag"
				:readOnly="readOnlyEnv"
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
					{{
						$locale.baseText(
							readOnlyEnv
								? 'workflows.empty.description.readOnlyEnv'
								: 'workflows.empty.description',
						)
					}}
				</n8n-text>
			</div>
			<div v-if="!readOnlyEnv" :class="['text-center', 'mt-2xl', $style.actionsContainer]">
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
					:modelValue="filters.tags"
					:createEnabled="false"
					@update:modelValue="setKeyValue('tags', $event)"
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
				<n8n-select :modelValue="filters.status" @update:modelValue="setKeyValue('status', $event)">
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
import { defineComponent } from 'vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import FolderCard from '@/components/FolderCard.vue';
import { EnterpriseEditionFeature, VIEWS, FOLDER_CREATE_MODAL_KEY } from '@/constants';
import type { ITag, IUser, IWorkflowDb, IFolder } from '@/Interface';
import TagsDropdown from '@/components/TagsDropdown.vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useFoldersStore } from '@/stores/folders.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { genericHelpers } from '@/mixins/genericHelpers';

type IResourcesListLayoutInstance = InstanceType<typeof ResourcesListLayout>;

const StatusFilter = {
	ACTIVE: true,
	DEACTIVATED: false,
	ALL: '',
};

const WorkflowsView = defineComponent({
	name: 'WorkflowsView',
	mixins: [genericHelpers],
	components: {
		ResourcesListLayout,
		WorkflowCard,
		FolderCard,
		TagsDropdown,
	},
	data() {
		return {
			resource: 'workflows',
			showAllWorkflows: true,
			activeFolder: {} as IFolder,
			activeFolderName: '',
			filters: {
				search: '',
				ownedBy: '',
				sharedWith: '',
				folder: '',
				status: StatusFilter.ALL,
				tags: [] as string[],
			},
			sourceControlStoreUnsubscribe: () => {},
		};
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
			useFoldersStore,
			useCredentialsStore,
			useSourceControlStore,
		),
		currentUser(): IUser {
			return this.usersStore.currentUser || ({} as IUser);
		},
		allWorkflows(): IWorkflowDb[] {
			return this.workflowsStore.allWorkflows;
		},
		allFolders(): IFolderDb[] {
			return this.foldersStore.allFolders;
		},
		isShareable(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
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
			void this.$router.push({
				name: VIEWS.NEW_WORKFLOW,
				query: { folder: this.activeFolder.id },
			});

			this.$telemetry.track('User clicked add workflow button', {
				source: 'Workflows list',
			});
		},
		addFolder() {
			this.uiStore.openModal(FOLDER_CREATE_MODAL_KEY);
		},
		async initialize() {
			await Promise.all([
				this.usersStore.fetchUsers(),
				this.workflowsStore.fetchAllWorkflows(),
				this.workflowsStore.fetchActiveWorkflows(),
				this.credentialsStore.fetchAllCredentials(),
				this.foldersStore.fetchAll({ force: true }),
			]);
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
					filters.tags.every(
						(tag) =>
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

			if (this.activeFolder.id) {
				matches = matches && resource.folder?.id === this.activeFolder.id;
			}

			return matches;
		},
		sendFiltersTelemetry(source: string) {
			(this.$refs.layout as IResourcesListLayoutInstance).sendFiltersTelemetry(source);
		},
		async onUpdateIsInFolder(folder: string) {
			if (folder === 'no-folder') {
				this.showAllWorkflows = true;
				this.activeFolder = {};
				this.resource = 'workflows';
			} else {
				this.showAllWorkflows = false;
				this.activeFolder = {};
			}
		},
		async onUpdateFolder(folder: IFolder) {
			if (folder.id) {
				this.resource = 'workflows';
				this.activeFolder = folder;
				if (folder.id === '0') {
					this.activeFolder = {};
				}
			}
		},
		async resetFolder(folder: string) {
			this.activeFolderName = '';
			this.showAllWorkflows = false;
			this.activeFolder = {};
			await this.workflowsStore.fetchAllWorkflows(undefined);
		},
	},
	watch: {
		'filters.tags'() {
			this.sendFiltersTelemetry('tags');
		},
	},
	mounted() {
		void this.usersStore.showPersonalizationSurvey();

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

.buttons {
	padding-bottom: 10px;
}
</style>
