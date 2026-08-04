<script lang="ts" setup>
import FolderBreadcrumbs from '@/features/core/folders/components/FolderBreadcrumbs.vue';
import ConnectionTracker from '@/app/components/ConnectionTracker.vue';
import { MAX_WORKFLOW_NAME_LENGTH, MODAL_CONFIRM, VIEWS } from '@/app/constants';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useMessage } from '@/app/composables/useMessage';
import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import { nodeViewEventBus } from '@/app/event-bus';
import type { IWorkflowDb } from '@/Interface';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import {
	computed,
	inject,
	onBeforeUnmount,
	onMounted,
	useCssModule,
	useTemplateRef,
	watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nBadge, N8nInlineTextEdit } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

const props = defineProps<{
	id: IWorkflowDb['id'];
	tags: readonly string[];
	name: IWorkflowDb['name'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	description?: IWorkflowDb['description'];
}>();

const $style = useCssModule();

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();
const projectsStore = useProjectsStore();
const collaborationStore = useCollaborationStore();
const sourceControlStore = useSourceControlStore();
const foldersStore = useFoldersStore();
const i18n = useI18n();

const router = useRouter();
const route = useRoute();

const locale = useI18n();
const message = useMessage();
const toast = useToast();
const documentTitle = useDocumentTitle();
const workflowId = useInjectWorkflowId();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsDropdownMenu>>('actionsMenu');

const isNewWorkflow = computed(() => {
	return !workflowsStore.isWorkflowSaved[props.id];
});

const workflowPermissions = computed(
	() => getResourcePermissions(workflowDocumentStore?.value?.scopes).workflow,
);

const readOnly = computed(
	() => sourceControlStore.preferences.branchReadOnly || collaborationStore.shouldBeReadOnly,
);

const readOnlyActions = computed(() => {
	if (isNewWorkflow.value) return readOnly.value;
	return readOnly.value || props.isArchived || !workflowPermissions.value.update;
});

const currentFolderForBreadcrumbs = computed(() => {
	if (!isNewWorkflow.value && props.currentFolder) {
		return props.currentFolder;
	}
	const folderId = route.query.parentFolderId as string;

	if (folderId) {
		return foldersStore.getCachedFolder(folderId);
	}
	return null;
});

watch(
	() => props.id,
	() => {
		renameInput.value?.forceCancel();
	},
);

const renameInput = useTemplateRef('renameInput');
function onNameToggle() {
	if (renameInput.value?.forceFocus) {
		renameInput.value.forceFocus();
	}
}

function onNameSubmit(name: string) {
	const newName = name.trim();
	if (!newName) {
		toast.showMessage({
			title: locale.baseText('renameAction.emptyName.title'),
			message: locale.baseText('renameAction.emptyName.message'),
			type: 'error',
		});

		renameInput.value?.forceCancel();
		return;
	}

	if (newName === props.name) {
		renameInput.value?.forceCancel();
		return;
	}

	// Update workflow name in store and mark state as dirty
	workflowDocumentStore?.value?.setName(newName);
	uiStore.markStateDirty('metadata');

	documentTitle.setDocumentTitle(newName, 'IDLE');
	renameInput.value?.forceCancel();
}

async function handleArchiveWorkflow() {
	if (workflowDocumentStore?.value?.active) {
		const archiveConfirmed = await message.confirm(
			locale.baseText('mainSidebar.confirmMessage.workflowArchive.message', {
				interpolate: { workflowName: props.name },
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
		const expectedChecksum =
			props.id === workflowId.value ? workflowDocumentStore?.value?.checksum : undefined;
		await workflowsStore.archiveWorkflow(props.id, expectedChecksum);
		workflowDocumentStore?.value?.setActiveState({
			activeVersionId: null,
			activeVersion: null,
		});
	} catch (error) {
		toast.showError(error, locale.baseText('generic.archiveWorkflowError'));
		return;
	}

	uiStore.markStateClean();
	const archivedWorkflowId = props.id;
	const archivedWorkflowName = props.name;
	const archiveToast = toast.showToast({
		title: locale.baseText('mainSidebar.showMessage.handleArchive.title', {
			interpolate: { workflowName: archivedWorkflowName },
		}),
		message: `<a href="#" data-test-id="archive-toast-delete-permanently-link">${locale.baseText('mainSidebar.showMessage.handleArchive.message')}</a>`,
		onClick: (event) => {
			if (event?.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				void deleteArchivedWorkflow(archivedWorkflowId, archivedWorkflowName, archiveToast);
			}
		},
		type: 'success',
	});

	// Navigate to the home of the workflow's context (personal or team project)
	const homeProject = workflowDocumentStore?.value?.homeProject;
	if (homeProject) {
		await router.push({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: homeProject.id },
		});
	} else {
		await router.push({ name: VIEWS.WORKFLOWS });
	}
}

async function deleteArchivedWorkflow(
	id: IWorkflowDb['id'],
	name: IWorkflowDb['name'],
	archiveToast: NotificationHandle,
) {
	const deleteConfirmed = await message.confirm(
		locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
			interpolate: { workflowName: name },
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
		await workflowsListStore.deleteWorkflow(id);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
		return;
	}

	// Dismiss the archive toast so its now-stale 'Delete permanently' CTA
	// disappears immediately instead of lingering until its duration elapses.
	archiveToast.close();

	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleSelect1.title', {
			interpolate: { workflowName: name },
		}),
		type: 'success',
	});
}

async function handleUnarchiveWorkflow() {
	await workflowsStore.unarchiveWorkflow(props.id);
	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleUnarchive.title', {
			interpolate: { workflowName: props.name },
		}),
		type: 'success',
	});
}

async function handleDeleteWorkflow() {
	const deleteConfirmed = await message.confirm(
		locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
			interpolate: { workflowName: props.name },
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

	// Get workflow's home project before deletion to know which project to navigate to
	const homeProject = workflowDocumentStore?.value?.homeProject;

	try {
		await workflowsListStore.deleteWorkflow(props.id);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
		return;
	}
	uiStore.markStateClean();
	// Reset tab title since workflow is deleted.
	documentTitle.reset();
	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleSelect1.title', {
			interpolate: { workflowName: props.name },
		}),
		type: 'success',
	});

	// Navigate to the home of the workflow's context (personal or team project)
	if (homeProject) {
		await router.push({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: homeProject.id },
		});
	} else {
		await router.push({ name: VIEWS.WORKFLOWS });
	}
}

const onBreadcrumbsItemSelected = (item: PathItem) => {
	if (item.href) {
		void router.push(item.href).catch((error) => {
			toast.showError(error, i18n.baseText('folders.open.error.title'));
		});
	}
};

const handleImportWorkflowFromFile = () => {
	if (actionsMenuRef.value?.importFileRef) {
		actionsMenuRef.value.importFileRef.click();
	}
};

onMounted(() => {
	nodeViewEventBus.on('importWorkflowFromFile', handleImportWorkflowFromFile);
	nodeViewEventBus.on('archiveWorkflow', handleArchiveWorkflow);
	nodeViewEventBus.on('unarchiveWorkflow', handleUnarchiveWorkflow);
	nodeViewEventBus.on('deleteWorkflow', handleDeleteWorkflow);
	nodeViewEventBus.on('renameWorkflow', onNameToggle);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('importWorkflowFromFile', handleImportWorkflowFromFile);
	nodeViewEventBus.off('archiveWorkflow', handleArchiveWorkflow);
	nodeViewEventBus.off('unarchiveWorkflow', handleUnarchiveWorkflow);
	nodeViewEventBus.off('deleteWorkflow', handleDeleteWorkflow);
	nodeViewEventBus.off('renameWorkflow', onNameToggle);
});
</script>

<template>
	<div :class="$style.container">
		<div class="name-container" data-test-id="canvas-breadcrumbs">
			<FolderBreadcrumbs
				:current-folder="currentFolderForBreadcrumbs"
				:current-folder-as-link="true"
				@item-selected="onBreadcrumbsItemSelected"
			>
				<template #append>
					<span
						v-if="projectsStore.currentProject ?? projectsStore.personalProject"
						:class="$style['path-separator']"
						>/</span
					>
					<N8nInlineTextEdit
						ref="renameInput"
						:key="id"
						placeholder="Workflow name"
						data-test-id="workflow-name-input"
						class="name"
						:model-value="name"
						:max-length="MAX_WORKFLOW_NAME_LENGTH"
						max-width="100%"
						:read-only="readOnlyActions"
						:disabled="readOnlyActions"
						@update:model-value="onNameSubmit"
					/>
				</template>
			</FolderBreadcrumbs>
		</div>
		<ActionsDropdownMenu
			:id="id"
			ref="actionsMenu"
			:workflow-permissions="workflowPermissions"
			:is-new-workflow="isNewWorkflow"
			:is-archived="isArchived"
			:name="name"
			:tags="tags"
			:current-folder="currentFolderForBreadcrumbs ?? undefined"
		/>
		<span class="spacer">
			<span :class="$style['header-controls']">
				<N8nBadge
					v-if="isArchived"
					class="ml-3xs"
					theme="tertiary"
					bold
					data-test-id="workflow-archived-tag"
				>
					{{ locale.baseText('workflows.item.archived') }}
				</N8nBadge>
			</span>
		</span>

		<ConnectionTracker class="actions">
			<WorkflowHeaderDraftPublishActions
				:id="id"
				:is-archived="isArchived"
				:is-new-workflow="isNewWorkflow"
				:workflow-permissions="workflowPermissions"
			/>
		</ConnectionTracker>
	</div>
</template>

<style scoped lang="scss">
$--header-spacing: 20px;

.name-container {
	margin-right: var(--spacing--sm);
	min-width: 0;

	:deep(.el-input) {
		padding: 0;
	}

	:deep([data-test-id='folder-breadcrumbs'] > div) {
		min-width: 0;
	}

	:deep([data-test-id='home-project']) {
		flex-shrink: 0;
	}
}

.name {
	color: $custom-font-dark;
	font-size: var(--font-size--sm);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
	min-width: 0;
}

.spacer {
	display: flex;
	align-items: center;
	width: 100%;
	flex: 1;
	min-width: 0;
	margin-right: $--header-spacing;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: nowrap;
	flex-shrink: 0;
}
</style>

<style module lang="scss">
.container {
	position: relative;
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--md);
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	container-type: inline-size;
	container-name: workflow-header;
}

.path-separator {
	font-size: var(--font-size--xl);
	color: var(--color--foreground);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
}

@container workflow-header (max-width: 480px) {
	.path-separator {
		display: none;
	}

	.container :global([data-test-id='home-project']),
	.container :global(.n8n-breadcrumbs) ul {
		display: none;
	}
}

.closeNodeViewDiscovery {
	position: absolute;
	right: var(--spacing--xs);
	top: var(--spacing--xs);
	cursor: pointer;
}

.header-controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	width: 100%;
	flex: 1;
	margin: 0 var(--spacing--md);
}
</style>
