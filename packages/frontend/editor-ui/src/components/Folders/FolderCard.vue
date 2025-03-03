<script setup lang="ts">
import { computed } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from './constants';
import type { FolderResource } from '../layouts/ResourcesListLayout.vue';
import { type ProjectIcon, ProjectTypes } from '@/types/projects.types';
import { useI18n } from '@/composables/useI18n';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { FolderPathItem, UserAction } from '@/Interface';

type Props = {
	data: FolderResource;
	actions: UserAction[];
	breadcrumbs: {
		visibleItems: FolderPathItem[];
		hiddenItems: FolderPathItem[];
	};
};

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
});

const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const emit = defineEmits<{
	action: [{ action: string; folderId: string }];
	folderOpened: [{ folder: FolderResource }];
}>();

const projectIcon = computed<ProjectIcon>(() => {
	const defaultIcon: ProjectIcon = { type: 'icon', value: 'layer-group' };
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (props.data.homeProject?.type === ProjectTypes.Team) {
		return props.data.homeProject.icon ?? defaultIcon;
	}
	return defaultIcon;
});

const projectName = computed(() => {
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return props.data.homeProject?.name;
});

const cardUrl = computed(() => {
	return getFolderUrl(props.data.id);
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

const onBreadcrumbsItemClick = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};
</script>

<template>
	<div>
		<router-link :to="cardUrl" @click="() => emit('folderOpened', { folder: props.data })">
			<n8n-card :class="$style.card">
				<template #prepend>
					<n8n-icon
						data-test-id="folder-card-icon"
						:class="$style['folder-icon']"
						icon="folder"
						size="large"
					/>
				</template>
				<template #header>
					<n8n-heading tag="h2" bold size="small" data-test-id="folder-card-name">
						{{ data.name }}
					</n8n-heading>
				</template>
				<template #footer>
					<div :class="$style['card-footer']">
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--workflow-count']]"
							data-test-id="folder-card-workflow-count"
						>
							{{ data.workflowCount }} {{ i18n.baseText('generic.workflows') }}
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
						<div :class="$style.breadcrumbs">
							<n8n-breadcrumbs
								:items="breadcrumbs.visibleItems"
								:hidden-items="breadcrumbs.hiddenItems"
								:path-truncated="breadcrumbs.visibleItems[0]?.parentFolder"
								:show-border="true"
								:highlight-last-item="false"
								theme="small"
								data-test-id="folder-card-breadcrumbs"
								@item-selected="onBreadcrumbsItemClick"
							>
								<template v-if="data.homeProject" #prepend>
									<div :class="$style['home-project']">
										<n8n-link :to="`/projects/${data.homeProject.id}`">
											<ProjectIcon :icon="projectIcon" :border-less="true" size="mini" />
											<n8n-text size="small" :compact="true" :bold="true" color="text-base">
												{{ projectName }}
											</n8n-text>
										</n8n-link>
									</div>
								</template>
							</n8n-breadcrumbs>
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
	background-color: var(--color-background-dark);
	color: var(--color-background-light-base);
	border-radius: 50%;
	align-content: center;
	text-align: center;
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

.card-actions {
	display: flex;
	gap: var(--spacing-xs);
}

.home-project span {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	color: var(--color-text-dark);
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
