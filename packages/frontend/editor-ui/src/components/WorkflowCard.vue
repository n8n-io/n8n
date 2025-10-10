<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	DUPLICATE_MODAL_KEY,
	MODAL_CONFIRM,
	PROJECT_MOVE_RESOURCE_MODAL,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { getResourcePermissions } from '@n8n/permissions';
import dateformat from 'dateformat';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import TimeAgo from '@/components/TimeAgo.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectCardBadge from '@/features/projects/components/ProjectCardBadge.vue';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { ResourceType } from '@/features/projects/projects.utils';
import type { EventBus } from '@n8n/utils/event-bus';
import type { UserAction, WorkflowResource } from '@/Interface';
import type { IUser } from 'n8n-workflow';
import { type ProjectSharingData, ProjectTypes } from '@/features/projects/projects.types';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useFoldersStore } from '@/features/folders/folders.store';

import {
	N8nActionToggle,
	N8nBadge,
	N8nBreadcrumbs,
	N8nCard,
	N8nIcon,
	N8nTags,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useMCPStore } from '@/features/mcpAccess/mcp.store';
const WORKFLOW_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	SHARE: 'share',
	DUPLICATE: 'duplicate',
	DELETE: 'delete',
	ARCHIVE: 'archive',
	UNARCHIVE: 'unarchive',
	MOVE: 'move',
	MOVE_TO_FOLDER: 'moveToFolder',
	ENABLE_MCP_ACCESS: 'enableMCPAccess',
	REMOVE_MCP_ACCESS: 'removeMCPAccess',
};

const props = withDefaults(
	defineProps<{
		data: WorkflowResource;
		readOnly?: boolean;
		workflowListEventBus?: EventBus;
		showOwnershipBadge?: boolean;
		areTagsEnabled?: boolean;
		isMcpEnabled?: boolean;
		areFoldersEnabled?: boolean;
	}>(),
	{
		readOnly: false,
		workflowListEventBus: undefined,
		showOwnershipBadge: false,
		areTagsEnabled: true,
		isMcpEnabled: false,
		areFoldersEnabled: false,
	},
);

const emit = defineEmits<{
	'expand:tags': [];
	'click:tag': [tagId: string, e: PointerEvent];
	'workflow:deleted': [];
	'workflow:archived': [];
	'workflow:unarchived': [];
	'workflow:active-toggle': [value: { id: string; active: boolean }];
	'action:move-to-folder': [
		value: {
			id: string;
			name: string;
			parentFolderId?: string;
			sharedWithProjects?: ProjectSharingData[];
		},
	];
}>();

const toast = useToast();
const message = useMessage();
const locale = useI18n();
const router = useRouter();
const route = useRoute();
const telemetry = useTelemetry();

const uiStore = useUIStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const foldersStore = useFoldersStore();
const mcpStore = useMCPStore();

const hiddenBreadcrumbsItemsAsync = ref<Promise<PathItem[]>>(new Promise(() => {}));
const cachedHiddenBreadcrumbsItems = ref<PathItem[]>([]);

// We use this to optimistically update the MCP status in the UI
// without needing to modify the workflow prop directly.
// null means we haven't changed it yet
const mcpToggleStatus = ref<boolean | null>(null);

const resourceTypeLabel = computed(() => locale.baseText('generic.workflow').toLowerCase());
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const workflowPermissions = computed(() => getResourcePermissions(props.data.scopes).workflow);

const showFolders = computed(() => {
	return props.areFoldersEnabled && route.name !== VIEWS.WORKFLOWS;
});

const showCardBreadcrumbs = computed(() => {
	return props.showOwnershipBadge && !isSomeoneElsesWorkflow.value && cardBreadcrumbs.value.length;
});

const projectName = computed(() => {
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return locale.baseText('projects.menu.personal');
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

const actions = computed(() => {
	const items: Array<UserAction<IUser>> = [
		{
			label: locale.baseText('workflows.item.open'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.OPEN,
		},
		{
			label: locale.baseText('workflows.item.share'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.SHARE,
		},
	];

	if (workflowPermissions.value.create && !props.readOnly && !props.data.isArchived) {
		items.push({
			label: locale.baseText('workflows.item.duplicate'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE,
		});
	}

	// TODO: add test to verify that moving a readonly card is not possible
	if (
		!props.readOnly &&
		(workflowPermissions.value.update ||
			(workflowPermissions.value.move && projectsStore.isTeamProjectFeatureEnabled)) &&
		showFolders.value &&
		route.name !== VIEWS.SHARED_WORKFLOWS
	) {
		items.push({
			label: locale.baseText('folders.actions.moveToFolder'),
			value: WORKFLOW_LIST_ITEM_ACTIONS.MOVE_TO_FOLDER,
		});
	}

	if (workflowPermissions.value.delete && !props.readOnly) {
		if (!props.data.isArchived) {
			items.push({
				label: locale.baseText('workflows.item.archive'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.ARCHIVE,
			});
		} else {
			items.push({
				label: locale.baseText('workflows.item.delete'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.DELETE,
			});
			items.push({
				label: locale.baseText('workflows.item.unarchive'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.UNARCHIVE,
			});
		}
	}

	if (
		props.isMcpEnabled &&
		workflowPermissions.value.update &&
		!props.readOnly &&
		!props.data.isArchived
	) {
		if (props.data.settings?.availableInMCP) {
			items.push({
				label: locale.baseText('workflows.item.disableMCPAccess'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.REMOVE_MCP_ACCESS,
				disabled: !props.data.active,
			});
		} else {
			items.push({
				label: locale.baseText('workflows.item.enableMCPAccess'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.ENABLE_MCP_ACCESS,
				disabled: !props.data.active,
			});
		}
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

const isAvailableInMCP = computed(() => {
	if (mcpToggleStatus.value === null) {
		return props.data.settings?.availableInMCP ?? false;
	}
	return mcpToggleStatus.value;
});

const isSomeoneElsesWorkflow = computed(
	() =>
		props.data.homeProject?.type !== ProjectTypes.Team &&
		props.data.homeProject?.id !== projectsStore.personalProject?.id,
);

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
					parentFolderId: props.data.parentFolder?.id,
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
		case WORKFLOW_LIST_ITEM_ACTIONS.ARCHIVE:
			await archiveWorkflow();
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.UNARCHIVE:
			await unarchiveWorkflow();
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.MOVE:
			moveResource();
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.MOVE_TO_FOLDER:
			emit('action:move-to-folder', {
				id: props.data.id,
				name: props.data.name,
				parentFolderId: props.data.parentFolder?.id,
				sharedWithProjects: props.data.sharedWithProjects,
			});
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.ENABLE_MCP_ACCESS:
			await toggleMCPAccess(true);
			break;
		case WORKFLOW_LIST_ITEM_ACTIONS.REMOVE_MCP_ACCESS:
			await toggleMCPAccess(false);
			break;
	}
}

async function toggleMCPAccess(enabled: boolean) {
	try {
		await mcpStore.toggleWorkflowMcpAccess(props.data.id, enabled);
		mcpToggleStatus.value = enabled;
	} catch (error) {
		toast.showError(error, locale.baseText('workflowSettings.toggleMCP.error.title'));
		return;
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
		title: locale.baseText('mainSidebar.showMessage.handleSelect1.title', {
			interpolate: { workflowName: props.data.name },
		}),
		type: 'success',
	});
	emit('workflow:deleted');
}

async function archiveWorkflow() {
	if (props.data.active) {
		const archiveConfirmed = await message.confirm(
			locale.baseText('mainSidebar.confirmMessage.workflowArchive.message', {
				interpolate: { workflowName: props.data.name },
			}),
			locale.baseText('mainSidebar.confirmMessage.workflowArchive.headline'),
			{
				type: 'warning',
				confirmButtonText: locale.baseText(
					'mainSidebar.confirmMessage.workflowArchive.confirmButtonText',
				),
				cancelButtonText: locale.baseText(
					'mainSidebar.confirmMessage.workflowArchive.cancelButtonText',
				),
			},
		);

		if (archiveConfirmed !== MODAL_CONFIRM) {
			return;
		}
	}

	try {
		await workflowsStore.archiveWorkflow(props.data.id);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.archiveWorkflowError'));
		return;
	}

	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleArchive.title', {
			interpolate: { workflowName: props.data.name },
		}),
		type: 'success',
	});
	emit('workflow:archived');
}

async function unarchiveWorkflow() {
	try {
		await workflowsStore.unarchiveWorkflow(props.data.id);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.unarchiveWorkflowError'));
		return;
	}

	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleUnarchive.title', {
			interpolate: { workflowName: props.data.name },
		}),
		type: 'success',
	});
	emit('workflow:unarchived');
}

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

const onBreadcrumbItemClick = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};

const tags = computed(
	() =>
		props.data.tags?.map((tag) => (typeof tag === 'string' ? { id: tag, name: tag } : tag)) ?? [],
);
</script>

<template>
	<N8nCard
		:class="{
			[$style.cardLink]: true,
			[$style.cardArchived]: data.isArchived,
		}"
		data-test-id="workflow-card"
		@click="onClick"
	>
		<template #header>
			<N8nText
				tag="h2"
				bold
				:class="{
					[$style.cardHeading]: true,
					[$style.cardHeadingArchived]: data.isArchived,
				}"
				data-test-id="workflow-card-name"
			>
				{{ data.name }}
				<N8nBadge v-if="!workflowPermissions.update" class="ml-3xs" theme="tertiary" bold>
					{{ locale.baseText('workflows.item.readonly') }}
				</N8nBadge>
			</N8nText>
		</template>
		<div :class="$style.cardDescription">
			<span v-show="data"
				>{{ locale.baseText('workflows.item.updated') }}
				<TimeAgo :date="String(data.updatedAt)" /> |
			</span>
			<span v-show="data">
				{{ locale.baseText('workflows.item.created') }} {{ formattedCreatedAtDate }}
				<span v-if="props.isMcpEnabled && isAvailableInMCP">|</span>
			</span>
			<span
				v-show="props.isMcpEnabled && isAvailableInMCP"
				:class="[$style['description-cell'], $style['description-cell--mcp']]"
				data-test-id="workflow-card-mcp"
			>
				<N8nTooltip
					placement="right"
					:content="locale.baseText('workflows.item.availableInMCP')"
					data-test-id="workflow-card-mcp-tooltip"
				>
					<N8nIcon icon="mcp" size="medium"></N8nIcon>
				</N8nTooltip>
			</span>
			<span
				v-if="props.areTagsEnabled && data.tags && data.tags.length > 0"
				v-show="data"
				:class="$style.cardTags"
			>
				<N8nTags
					:tags="tags"
					:truncate-at="3"
					truncate
					data-test-id="workflow-card-tags"
					@click:tag="onClickTag"
					@expand="onExpandTags"
				/>
			</span>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<ProjectCardBadge
					v-if="showOwnershipBadge"
					:class="{ [$style.cardBadge]: true, [$style['with-breadcrumbs']]: showCardBreadcrumbs }"
					:resource="data"
					:resource-type="ResourceType.Workflow"
					:resource-type-label="resourceTypeLabel"
					:personal-project="projectsStore.personalProject"
					:show-badge-border="false"
				>
					<div v-if="showCardBreadcrumbs" :class="$style.breadcrumbs">
						<N8nBreadcrumbs
							:items="cardBreadcrumbs"
							:hidden-items="
								data.parentFolder?.parentFolderId !== null ? hiddenBreadcrumbsItemsAsync : undefined
							"
							:path-truncated="data.parentFolder?.parentFolderId !== null"
							:highlight-last-item="false"
							hidden-items-trigger="hover"
							theme="small"
							data-test-id="workflow-card-breadcrumbs"
							@tooltip-opened="fetchHiddenBreadCrumbsItems"
							@item-selected="onBreadcrumbItemClick"
						>
							<template #prepend></template>
						</N8nBreadcrumbs>
					</div>
				</ProjectCardBadge>

				<N8nText
					v-if="data.isArchived"
					color="text-light"
					size="small"
					bold
					class="ml-s mr-s"
					data-test-id="workflow-card-archived"
				>
					{{ locale.baseText('workflows.item.archived') }}
				</N8nText>
				<WorkflowActivator
					v-else
					class="mr-s"
					:is-archived="data.isArchived"
					:workflow-active="data.active"
					:workflow-id="data.id"
					:workflow-permissions="workflowPermissions"
					data-test-id="workflow-card-activator"
					@update:workflow-active="emitWorkflowActiveToggle"
				/>

				<N8nActionToggle
					:actions="actions"
					theme="dark"
					data-test-id="workflow-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</N8nCard>
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
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);

	span {
		color: var(--color--text--tint-1);
	}
}

.cardHeadingArchived {
	color: var(--color--text--tint-1);
}

.cardDescription {
	min-height: var(--spacing--xl);
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	gap: var(--spacing--2xs);
}

.cardTags {
	display: inline-block;
	margin-top: var(--spacing--4xs);
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}

.cardBadge {
	background-color: var(--color--background--light-3);
}

.cardBadge.with-breadcrumbs {
	:global(.n8n-badge) {
		padding-right: 0;
	}
	:global(.n8n-breadcrumbs) {
		padding-left: var(--spacing--5xs);
	}
}

.cardArchived {
	background-color: var(--color--background--light-2);
	border-color: var(--color--foreground--tint-1);
	color: var(--color--text);
}

.description-cell--mcp {
	display: inline-flex;
	align-items: center;

	&:hover {
		color: var(--color--text);
	}
}

@include mixins.breakpoint('sm-and-down') {
	.cardLink {
		--card--padding: 0 var(--spacing--sm) var(--spacing--sm);
		--card--append--width: 100%;

		flex-direction: column;
	}

	.cardActions {
		width: 100%;
		padding: 0 var(--spacing--sm) var(--spacing--sm);
		justify-content: end;
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
