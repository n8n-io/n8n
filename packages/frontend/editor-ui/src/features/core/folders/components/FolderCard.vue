<script setup lang="ts">
import { computed, ref } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from '../folders.constants';
import { ProjectTypes, type Project } from '@/features/collaboration/projects/projects.types';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import type { FolderResource } from '@/Interface';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import type { PathItem } from '@n8n/design-system';
import { useFoldersStore } from '../folders.store';
import FolderCardActions, { type FolderCardAction } from './FolderCardActions.vue';
import FolderCardSubtitle from './FolderCardSubtitle.vue';
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';

import { N8nBadge, N8nBreadcrumbs, N8nCard, N8nHeading, N8nIcon } from '@n8n/design-system';

type Props = {
	data: FolderResource;
	personalProject: Project | null;
	actions?: FolderCardAction[];
	readOnly?: boolean;
	showOwnershipBadge?: boolean;
	showMcpAccessActions?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	readOnly: true,
	showOwnershipBadge: false,
	showMcpAccessActions: false,
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
				}).fullPath,
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
	}).fullPath;
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
		<RouterLink :to="cardUrl" @click="() => emit('folderOpened', { folder: props.data })">
			<N8nCard :class="$style.card" hoverable>
				<template #prepend>
					<N8nIcon
						data-test-id="folder-card-icon"
						size="xlarge"
						:class="$style['folder-icon']"
						icon="folder"
					/>
				</template>
				<template #header>
					<div :class="$style['card-header']">
						<N8nHeading tag="h2" bold size="small" data-test-id="folder-card-name">
							{{ data.name }}
						</N8nHeading>
						<N8nBadge v-if="readOnly" class="ml-3xs" variant="outline">
							{{ i18n.baseText('workflows.item.readonly') }}
						</N8nBadge>
					</div>
				</template>
				<template #footer>
					<FolderCardSubtitle
						:resource-count="data.workflowCount"
						:resource-label="
							i18n.baseText('generic.workflow', { interpolate: { count: data.workflowCount } })
						"
						:sub-folder-count="data.subFolderCount"
						:updated-at="data.updatedAt"
						:created-at="data.createdAt"
					/>
				</template>
				<template #append>
					<div :class="$style['card-actions']" @click.stop.prevent>
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
									<N8nBreadcrumbs
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
									</N8nBreadcrumbs>
								</div>
							</ProjectCardBadge>
						</div>
						<FolderCardActions
							:folder="data"
							:actions="actions"
							:show-mcp-access-actions="showMcpAccessActions"
							@action="onAction"
						/>
					</div>
				</template>
			</N8nCard>
		</RouterLink>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.folder-icon {
	flex-shrink: 0;
	color: var(--color--text);
	align-content: center;
	text-align: center;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing--xs);
	margin-bottom: var(--spacing--5xs);
}

.cardBadge.with-breadcrumbs {
	:global(.n8n-badge) {
		padding-right: 0;
	}
	:global(.n8n-breadcrumbs) {
		padding-left: var(--spacing--5xs);
	}
}

.card-actions {
	display: flex;
	gap: var(--spacing--xs);
}

@include breakpoints.breakpoint('sm-and-down') {
	.card {
		flex-wrap: wrap;

		:global(.n8n-card-append) {
			width: 100%;
			margin-top: var(--spacing--3xs);
			padding-left: 40px;
		}
		.card-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
}
</style>
