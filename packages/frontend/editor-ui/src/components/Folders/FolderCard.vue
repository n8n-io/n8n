<script setup lang="ts">
import { computed } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from './constants';
import type { FolderResource } from '../layouts/ResourcesListLayout.vue';
import type { Project } from '@/types/projects.types';
import { useI18n } from '@/composables/useI18n';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import type { UserAction } from '@/Interface';
import { ResourceType } from '@/utils/projects.utils';

type Props = {
	data: FolderResource;
	personalProject: Project | null;
	actions: UserAction[];
	readOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	readOnly: true,
});

const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const emit = defineEmits<{
	action: [{ action: string; folderId: string }];
	folderOpened: [{ folder: FolderResource }];
}>();

const resourceTypeLabel = computed(() => i18n.baseText('generic.folder').toLowerCase());

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
						<div v-if="data.homeProject" :class="$style['project-pill']">
							<ProjectCardBadge
								:class="{ [$style.cardBadge]: true, [$style['with-breadcrumbs']]: false }"
								:resource="data"
								:resource-type="ResourceType.Workflow"
								:resource-type-label="resourceTypeLabel"
								:personal-project="personalProject"
								:show-badge-border="true"
							/>
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
