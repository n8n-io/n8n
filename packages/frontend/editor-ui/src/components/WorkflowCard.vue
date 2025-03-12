<script setup lang="ts">
import { computed } from 'vue';
import type { FolderPathItem, IUser } from '@/Interface';
import {
	DUPLICATE_MODAL_KEY,
	MODAL_CONFIRM,
	PROJECT_MOVE_RESOURCE_MODAL,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { getResourcePermissions } from '@/permissions';
import dateformat from 'dateformat';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import TimeAgo from '@/components/TimeAgo.vue';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { ResourceType } from '@/utils/projects.utils';
import type { EventBus } from '@n8n/utils/event-bus';
import type { WorkflowResource } from './layouts/ResourcesListLayout.vue';
import { type ProjectIcon as CardProjectIcon, ProjectTypes } from '@/types/projects.types';

const WORKFLOW_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	SHARE: 'share',
	DUPLICATE: 'duplicate',
	DELETE: 'delete',
	MOVE: 'move',
};

const props = withDefaults(
	defineProps<{
		data: WorkflowResource;
		breadcrumbs: {
			visibleItems: FolderPathItem[];
			hiddenItems: FolderPathItem[];
		};
		readOnly?: boolean;
		workflowListEventBus?: EventBus;
	}>(),
	{
		readOnly: false,
		workflowListEventBus: undefined,
	},
);

const emit = defineEmits<{
	'expand:tags': [];
	'click:tag': [tagId: string, e: PointerEvent];
	'workflow:deleted': [];
	'workflow:active-toggle': [value: { id: string; active: boolean }];
}>();

const toast = useToast();
const message = useMessage();
const locale = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();

const resourceTypeLabel = computed(() => locale.baseText('generic.workflow').toLowerCase());
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const workflowPermissions = computed(() => getResourcePermissions(props.data.scopes).workflow);
const actions = computed(() => {
	const items = [
		{
			label: locale.baseText('workflows.item.open'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.OPEN,
		},
		{
			label: locale.baseText('workflows.item.share'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.SHARE,
		},
	];

	if (workflowPermissions.value.create && !props.readOnly) {
		items.push({
			label: locale.baseText('workflows.item.duplicate'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE,
		});
	}

	if (workflowPermissions.value.move && projectsStore.isTeamProjectFeatureEnabled) {
		items.push({
			label: locale.baseText('workflows.item.move'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.MOVE,
		});
	}

	if (workflowPermissions.value.delete && !props.readOnly) {
		items.push({
			label: locale.baseText('workflows.item.delete'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.DELETE,
		});
	}

	return items;
});
const formattedCreatedAtDate = computed(() => {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(
		props.data.createdAt,
		`d mmmm${String(props.data.createdAt).startsWith(currentYear) ? '' : ', yyyy'}`,
	);
});

const projectIcon = computed<CardProjectIcon>(() => {
	const defaultIcon: CardProjectIcon = { type: 'icon', value: 'layer-group' };
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

async function onClick(event?: KeyboardEvent | PointerEvent) {
	if (event?.ctrlKey || event?.metaKey) {
		const route = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { name: props.data.id },
		});
		window.open(route.href, '_blank');

		return;
	}

	await router.push({
		name: VIEWS.WORKFLOW,
		params: { name: props.data.id },
	});
}

function onClickTag(tagId: string, event: PointerEvent) {
	event.stopPropagation();
	emit('click:tag', tagId, event);
}

function onExpandTags() {
	emit('expand:tags');
}

async function onAction(action: string) {
	switch (action) {
		case WORKFLOW_LIST_ITEM_ACTIONS.OPEN:
			await onClick();
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE:
			uiStore.openModalWithData({
				name: DUPLICATE_MODAL_KEY,
				data: {
					id: props.data.id,
					name: props.data.name,
					tags: (props.data.tags ?? []).map((tag) =>
						typeof tag !== 'string' && 'id' in tag ? tag.id : tag,
					),
					externalEventBus: props.workflowListEventBus,
				},
			});
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.SHARE:
			uiStore.openModalWithData({
				name: WORKFLOW_SHARE_MODAL_KEY,
				data: { id: props.data.id },
			});

			telemetry.track('User opened sharing modal', {
				workflow_id: props.data.id,
				user_id_sharer: currentUser.value.id,
				sub_view: 'Workflows listing',
			});
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.DELETE:
			await deleteWorkflow();
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.MOVE:
			moveResource();
			break;
	}
}

async function deleteWorkflow() {
	const deleteConfirmed = await message.confirm(
		locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
			interpolate: { workflowName: props.data.name },
		}),
		locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
		{
			type: 'warning',
			confirmButtonText: locale.baseText(
				'mainSidebar.confirmMessage.workflowDelete.confirmButtonText',
			),
			cancelButtonText: locale.baseText(
				'mainSidebar.confirmMessage.workflowDelete.cancelButtonText',
			),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await workflowsStore.deleteWorkflow(props.data.id);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
		return;
	}

	// Reset tab title since workflow is deleted.
	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
		type: 'success',
	});
	emit('workflow:deleted');
}

function moveResource() {
	uiStore.openModalWithData({
		name: PROJECT_MOVE_RESOURCE_MODAL,
		data: {
			resource: props.data,
			resourceType: ResourceType.Workflow,
			resourceTypeLabel: resourceTypeLabel.value,
			eventBus: props.workflowListEventBus,
		},
	});
}

const emitWorkflowActiveToggle = (value: { id: string; active: boolean }) => {
	emit('workflow:active-toggle', value);
};
</script>

<template>
	<n8n-card :class="$style.cardLink" data-test-id="workflow-card" @click="onClick">
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading" data-test-id="workflow-card-name">
				{{ data.name }}
				<N8nBadge v-if="!workflowPermissions.update" class="ml-3xs" theme="tertiary" bold>
					{{ locale.baseText('workflows.item.readonly') }}
				</N8nBadge>
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-show="data"
					>{{ locale.baseText('workflows.item.updated') }}
					<TimeAgo :date="String(data.updatedAt)" /> |
				</span>
				<span v-show="data" class="mr-2xs"
					>{{ locale.baseText('workflows.item.created') }} {{ formattedCreatedAtDate }}
				</span>
				<span
					v-if="settingsStore.areTagsEnabled && data.tags && data.tags.length > 0"
					v-show="data"
				>
					<n8n-tags
						:tags="data.tags"
						:truncate-at="3"
						truncate
						data-test-id="workflow-card-tags"
						@click:tag="onClickTag"
						@expand="onExpandTags"
					/>
				</span>
			</n8n-text>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<ProjectCardBadge
					v-if="!data.parentFolder"
					:class="$style.cardBadge"
					:resource="data"
					:resource-type="ResourceType.Workflow"
					:resource-type-label="resourceTypeLabel"
					:personal-project="projectsStore.personalProject"
				/>
				<div v-else :class="$style.breadcrumbs">
					<n8n-breadcrumbs
						:items="breadcrumbs.visibleItems"
						:hidden-items="breadcrumbs.hiddenItems"
						:path-truncated="breadcrumbs.visibleItems[0]?.parentFolder"
						:show-border="true"
						:highlight-last-item="false"
						theme="small"
						data-test-id="folder-card-breadcrumbs"
					>
						<template v-if="data.homeProject" #prepend>
							<div :class="$style['home-project']">
								<n8n-link :to="`/projects/${data.homeProject.id}`">
									<ProjectIcon :icon="projectIcon" :border-less="true" size="mini" />
									<n8n-text size="small" :compact="true" :bold="true" color="text-base">{{
										projectName
									}}</n8n-text>
								</n8n-link>
							</div>
						</template>
					</n8n-breadcrumbs>
				</div>
				<WorkflowActivator
					class="mr-s"
					:workflow-active="data.active"
					:workflow-id="data.id"
					:workflow-permissions="workflowPermissions"
					data-test-id="workflow-card-activator"
					@update:workflow-active="emitWorkflowActiveToggle"
				/>

				<n8n-action-toggle
					:actions="actions"
					theme="dark"
					data-test-id="workflow-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</n8n-card>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0;
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
	padding: var(--spacing-s) 0 0 var(--spacing-s);

	span {
		color: var(--color-text-light);
	}
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s) var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}

.home-project span {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	color: var(--color-text-dark);
}

@include mixins.breakpoint('sm-and-down') {
	.cardLink {
		--card--padding: 0 var(--spacing-s) var(--spacing-s);
		--card--append--width: 100%;

		flex-direction: column;
	}

	.cardActions {
		width: 100%;
		padding: 0 var(--spacing-s) var(--spacing-s);
	}

	.cardBadge,
	.breadcrumbs {
		margin-right: auto;
	}
}

@include mixins.breakpoint('xs-only') {
	.breadcrumbs > div {
		flex-direction: column;
	}
}
</style>
