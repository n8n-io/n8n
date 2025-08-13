<script setup lang="ts">
import { computed, ref } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from './constants';
import { ProjectTypes, type Project } from '@/types/projects.types';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import type { FolderResource, UserAction } from '@/Interface';
import { ResourceType } from '@/utils/projects.utils';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useFoldersStore } from '@/stores/folders.store';
import { type IUser } from 'n8n-workflow';

type Props = {
	data: FolderResource;
	personalProject: Project | null;
	actions: Array<UserAction<IUser>>;
	readOnly?: boolean;
	showOwnershipBadge?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	readOnly: true,
	showOwnershipBadge: false,
});

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const foldersStore = useFoldersStore();

const emit = defineEmits<{
	action: [{ action: string; folderId: string }];
	folderOpened: [{ folder: FolderResource }];
}>();

const hiddenBreadcrumbsItemsAsync = ref<Promise<PathItem[]>>(new Promise(() => {}));

const cachedHiddenBreadcrumbsItems = ref<PathItem[]>([]);

const resourceTypeLabel = computed(() => i18n.baseText('generic.folder').toLowerCase());

const cardUrl = computed(() => {
	return getFolderUrl(props.data.id);
});

const projectName = computed(() => {
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return props.data.homeProject?.name;
});

const cardBreadcrumbs = computed<PathItem[]>(() => {
	if (props.data.parentFolder) {
		return [
			{
				id: props.data.parentFolder.id,
				name: props.data.parentFolder.name,
				label: props.data.parentFolder.name,
				href: router.resolve({
					name: VIEWS.PROJECTS_FOLDERS,
					params: {
						projectId: props.data.homeProject?.id,
						folderId: props.data.parentFolder.id,
					},
				}).href,
			},
		];
	}
	return [];
});

const showCardBreadcrumbs = computed(() => {
	return props.showOwnershipBadge && cardBreadcrumbs.value.length;
});

const getFolderUrl = (folderId: string) => {
	return router.resolve({
		name: VIEWS.PROJECTS_FOLDERS,
		params: {
			projectId: route.params.projectId as string,
			folderId,
		},
		query: route.query,
	}).href;
};

const onAction = async (action: string) => {
	if (action === FOLDER_LIST_ITEM_ACTIONS.OPEN) {
		emit('folderOpened', { folder: props.data });
		await router.push(cardUrl.value);
		return;
	}
	emit('action', { action, folderId: props.data.id });
};

const fetchHiddenBreadCrumbsItems = async () => {
	if (!props.data.homeProject?.id || !projectName.value || !props.data.parentFolder) {
		hiddenBreadcrumbsItemsAsync.value = Promise.resolve([]);
	} else {
		if (cachedHiddenBreadcrumbsItems.value.length) {
			hiddenBreadcrumbsItemsAsync.value = Promise.resolve(cachedHiddenBreadcrumbsItems.value);
			return;
		}
		const loadedItem = foldersStore.getHiddenBreadcrumbsItems(
			{ id: props.data.homeProject.id, name: projectName.value },
			props.data.parentFolder.id,
		);
		hiddenBreadcrumbsItemsAsync.value = loadedItem;
		cachedHiddenBreadcrumbsItems.value = await loadedItem;
	}
};

const onBreadcrumbItemClick = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};
</script>

<template>
	<div data-test-id="folder-card">
		<router-link :to="cardUrl" @click="() => emit('folderOpened', { folder: props.data })">
			<n8n-card :class="$style.card">
				<template #prepend>
					<n8n-icon
						data-test-id="folder-card-icon"
						:class="$style['folder-icon']"
						icon="folder"
						size="xlarge"
						:stroke-width="1"
					/>
				</template>
				<template #header>
					<div :class="$style['card-header']">
						<n8n-heading tag="h2" bold size="small" data-test-id="folder-card-name">
							{{ data.name }}
						</n8n-heading>
						<N8nBadge v-if="readOnly" class="ml-3xs" theme="tertiary" bold>
							{{ i18n.baseText('workflows.item.readonly') }}
						</N8nBadge>
					</div>
				</template>
				<template #footer>
					<div :class="$style['card-footer']">
						<n8n-text
							v-if="data.workflowCount > 0"
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--workflow-count']]"
							data-test-id="folder-card-folder-count"
						>
							{{
								i18n.baseText('generic.workflow', { interpolate: { count: data.workflowCount } })
							}}
						</n8n-text>
						<n8n-text
							v-if="data.subFolderCount > 0"
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--workflow-count']]"
							data-test-id="folder-card-workflow-count"
						>
							{{
								i18n.baseText('generic.folderCount', {
									interpolate: { count: data.subFolderCount },
								})
							}}
						</n8n-text>
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--updated']]"
							data-test-id="folder-card-last-updated"
						>
							{{ i18n.baseText('workerList.item.lastUpdated') }}
							<TimeAgo :date="String(data.updatedAt)" />
						</n8n-text>
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--created']]"
							data-test-id="folder-card-created"
						>
							{{ i18n.baseText('workflows.item.created') }}
							<TimeAgo :date="String(data.createdAt)" />
						</n8n-text>
					</div>
				</template>
				<template #append>
					<div :class="$style['card-actions']" @click.prevent>
						<div v-if="data.homeProject && showOwnershipBadge">
							<ProjectCardBadge
								:class="{
									[$style.cardBadge]: true,
									[$style['with-breadcrumbs']]: showCardBreadcrumbs,
								}"
								:resource="data"
								:resource-type="ResourceType.Workflow"
								:resource-type-label="resourceTypeLabel"
								:personal-project="personalProject"
								:show-badge-border="false"
							>
								<div v-if="showCardBreadcrumbs" :class="$style.breadcrumbs">
									<n8n-breadcrumbs
										:items="cardBreadcrumbs"
										:hidden-items="
											data.parentFolder?.parentFolderId !== null
												? hiddenBreadcrumbsItemsAsync
												: undefined
										"
										:path-truncated="data.parentFolder?.parentFolderId !== null"
										:highlight-last-item="false"
										hidden-items-trigger="hover"
										theme="small"
										data-test-id="folder-card-breadcrumbs"
										@tooltip-opened="fetchHiddenBreadCrumbsItems"
										@item-selected="onBreadcrumbItemClick"
									>
										<template #prepend></template>
									</n8n-breadcrumbs>
								</div>
							</ProjectCardBadge>
						</div>
						<n8n-action-toggle
							v-if="actions.length"
							:actions="actions"
							theme="dark"
							data-test-id="folder-card-actions"
							@action="onAction"
						/>
					</div>
				</template>
			</n8n-card>
		</router-link>
	</div>
</template>

<style lang="scss" module>
.card {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.folder-icon {
	width: var(--spacing-xl);
	height: var(--spacing-xl);
	flex-shrink: 0;
	color: var(--color-text-base);
	align-content: center;
	text-align: center;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-xs);
	margin-bottom: var(--spacing-5xs);
}

.card-footer {
	display: flex;
}

.info-cell {
	& + & {
		&::before {
			content: '|';
			margin: 0 var(--spacing-4xs);
		}
	}
}

.cardBadge.with-breadcrumbs {
	:global(.n8n-badge) {
		padding-right: 0;
	}
	:global(.n8n-breadcrumbs) {
		padding-left: var(--spacing-5xs);
	}
}

.card-actions {
	display: flex;
	gap: var(--spacing-xs);
}

@include mixins.breakpoint('sm-and-down') {
	.card {
		flex-wrap: wrap;

		:global(.n8n-card-append) {
			width: 100%;
			margin-top: var(--spacing-3xs);
			padding-left: 40px;
		}
		.card-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
	.info-cell--created {
		display: none;
	}
}
</style>
