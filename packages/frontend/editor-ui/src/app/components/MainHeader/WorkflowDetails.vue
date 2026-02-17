<script lang="ts" setup>
import BreakpointsObserver from '@/app/components/BreakpointsObserver.vue';
import FolderBreadcrumbs from '@/features/core/folders/components/FolderBreadcrumbs.vue';
import ConnectionTracker from '@/app/components/ConnectionTracker.vue';
import WorkflowProductionChecklist from '@/app/components/WorkflowProductionChecklist.vue';
import WorkflowTagsContainer from '@/features/shared/tags/components/WorkflowTagsContainer.vue';
import WorkflowTagsDropdown from '@/features/shared/tags/components/WorkflowTagsDropdown.vue';
import { MAX_WORKFLOW_NAME_LENGTH, MODAL_CONFIRM, VIEWS } from '@/app/constants';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { nodeViewEventBus } from '@/app/event-bus';
import type { IWorkflowDb } from '@/Interface';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	computed,
	inject,
	onBeforeUnmount,
	onMounted,
	ref,
	useCssModule,
	useTemplateRef,
	watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nBadge, N8nInlineTextEdit } from '@n8n/design-system';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

const WORKFLOW_NAME_BP_TO_WIDTH: { [key: string]: number } = {
	XS: 150,
	SM: 200,
	MD: 250,
	LG: 500,
	XL: 1000,
};

const props = defineProps<{
	id: IWorkflowDb['id'];
	tags: readonly string[];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	scopes: IWorkflowDb['scopes'];
	active: IWorkflowDb['active'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	description?: IWorkflowDb['description'];
}>();

const $style = useCssModule();

const settingsStore = useSettingsStore();
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
const telemetry = useTelemetry();
const message = useMessage();
const toast = useToast();
const documentTitle = useDocumentTitle();
const workflowState = injectWorkflowState();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const workflowHeaderActionsRef =
	useTemplateRef<InstanceType<typeof WorkflowHeaderDraftPublishActions>>('workflowHeaderActions');
const tagsEventBus = createEventBus();

const hasChanged = (prev: readonly string[], curr: readonly string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const isNewWorkflow = computed(() => {
	return !workflowsStore.isWorkflowSaved[props.id];
});

const workflowPermissions = computed(() => getResourcePermissions(props.scopes).workflow);

const readOnly = computed(
	() => sourceControlStore.preferences.branchReadOnly || collaborationStore.shouldBeReadOnly,
);

// For workflow name and tags editing: needs update permission and not archived
const readOnlyActions = computed(() => {
	if (isNewWorkflow.value) return readOnly.value;
	return readOnly.value || props.isArchived || !workflowPermissions.value.update;
});

const workflowTagIds = computed(() => props.tags);

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
		isTagsEditEnabled.value = false;
		renameInput.value?.forceCancel();
	},
);

function onTagsEditEnable() {
	if (readOnlyActions.value) {
		return;
	}

	appliedTagIds.value = [...props.tags];
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		// allow name update to occur before disabling name edit
		renameInput.value?.forceCancel();
		tagsEventBus.emit('focus');
	}, 0);
}

function onTagsBlur() {
	const current = props.tags;
	const tags = appliedTagIds.value;
	if (!hasChanged(current, tags)) {
		isTagsEditEnabled.value = false;

		return;
	}

	if (readOnlyActions.value) {
		isTagsEditEnabled.value = false;
		return;
	}

	collaborationStore.requestWriteAccess();

	if (workflowDocumentStore?.value) {
		workflowDocumentStore.value.setTags(tags);
	}
	workflowState.setWorkflowTagIds(tags);
	uiStore.markStateDirty('metadata');

	telemetry.track('User edited workflow tags', {
		workflow_id: props.id,
		new_tag_count: tags.length,
	});

	isTagsEditEnabled.value = false;
}

function onTagsEditEsc() {
	isTagsEditEnabled.value = false;
}

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
	workflowState.setWorkflowName({ newName, setStateDirty: true });

	documentTitle.setDocumentTitle(newName, 'IDLE');
	renameInput.value?.forceCancel();
}

async function handleArchiveWorkflow() {
	if (props.active) {
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
			props.id === workflowsStore.workflowId ? workflowsStore.workflowChecksum : undefined;
		await workflowsStore.archiveWorkflow(props.id, expectedChecksum);
	} catch (error) {
		toast.showError(error, locale.baseText('generic.archiveWorkflowError'));
		return;
	}

	uiStore.markStateClean();
	toast.showMessage({
		title: locale.baseText('mainSidebar.showMessage.handleArchive.title', {
			interpolate: { workflowName: props.name },
		}),
		type: 'success',
	});

	// Navigate to the appropriate project's workflow list
	const workflow = workflowsListStore.getWorkflowById(props.id);
	if (workflow?.homeProject?.type === ProjectTypes.Team) {
		await router.push({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: workflow.homeProject.id },
		});
	} else {
		await router.push({ name: VIEWS.WORKFLOWS });
	}
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

	// Get workflow before deletion to know which project to navigate to
	const workflow = workflowsListStore.getWorkflowById(props.id);
	const isTeamProject = workflow?.homeProject?.type === ProjectTypes.Team;

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

	// Navigate to the appropriate project's workflow list
	if (isTeamProject && workflow?.homeProject) {
		await router.push({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: workflow.homeProject.id },
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
	if (workflowHeaderActionsRef.value?.importFileRef) {
		workflowHeaderActionsRef.value.importFileRef.click();
	}
};

onMounted(() => {
	nodeViewEventBus.on('importWorkflowFromFile', handleImportWorkflowFromFile);
	nodeViewEventBus.on('archiveWorkflow', handleArchiveWorkflow);
	nodeViewEventBus.on('unarchiveWorkflow', handleUnarchiveWorkflow);
	nodeViewEventBus.on('deleteWorkflow', handleDeleteWorkflow);
	nodeViewEventBus.on('renameWorkflow', onNameToggle);
	nodeViewEventBus.on('addTag', onTagsEditEnable);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('importWorkflowFromFile', handleImportWorkflowFromFile);
	nodeViewEventBus.off('archiveWorkflow', handleArchiveWorkflow);
	nodeViewEventBus.off('unarchiveWorkflow', handleUnarchiveWorkflow);
	nodeViewEventBus.off('deleteWorkflow', handleDeleteWorkflow);
	nodeViewEventBus.off('renameWorkflow', onNameToggle);
	nodeViewEventBus.off('addTag', onTagsEditEnable);
});
</script>

<template>
	<div :class="$style.container">
		<BreakpointsObserver
			:value-x-s="15"
			:value-s-m="25"
			:value-m-d="50"
			class="name-container"
			data-test-id="canvas-breadcrumbs"
		>
			<template #default="{ bp }">
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
							:max-width="WORKFLOW_NAME_BP_TO_WIDTH[bp]"
							:read-only="readOnlyActions"
							:disabled="readOnlyActions"
							@update:model-value="onNameSubmit"
						/>
					</template>
				</FolderBreadcrumbs>
			</template>
		</BreakpointsObserver>
		<span class="tags" data-test-id="workflow-tags-container">
			<template v-if="settingsStore.areTagsEnabled">
				<WorkflowTagsDropdown
					v-if="isTagsEditEnabled && !readOnlyActions"
					ref="dropdown"
					v-model="appliedTagIds"
					:event-bus="tagsEventBus"
					:placeholder="i18n.baseText('workflowDetails.chooseOrCreateATag')"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
					@blur="onTagsBlur"
					@esc="onTagsEditEsc"
				/>
				<div v-else-if="tags.length === 0 && !readOnlyActions">
					<span class="add-tag clickable" data-test-id="new-tag-link" @click="onTagsEditEnable">
						+ {{ i18n.baseText('workflowDetails.addTag') }}
					</span>
				</div>
				<WorkflowTagsContainer
					v-else
					:key="id"
					:tag-ids="workflowTagIds"
					:clickable="true"
					:responsive="true"
					data-test-id="workflow-tags"
					@click="onTagsEditEnable"
				/>
			</template>

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
			<WorkflowProductionChecklist v-if="!isNewWorkflow" :workflow="workflowsStore.workflow" />
			<WorkflowHeaderDraftPublishActions
				:id="id"
				ref="workflowHeaderActions"
				:tags="tags"
				:name="name"
				:meta="meta"
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

	:deep(.el-input) {
		padding: 0;
	}
}

.name {
	color: $custom-font-dark;
	font-size: var(--font-size--sm);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
}

.add-tag {
	font-size: 12px;
	padding: 20px 0; // to be more clickable
	color: $custom-font-very-light;
	font-weight: var(--font-weight--bold);
	white-space: nowrap;

	&:hover {
		color: $color-primary;
	}
}

.tags {
	display: flex;
	align-items: center;
	width: 100%;
	flex: 1;
	margin-right: $--header-spacing;
}

.tags-edit {
	min-width: 100px;
	width: 100%;
	max-width: 460px;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	flex-wrap: nowrap;
}

@include mixins.breakpoint('xs-only') {
	.name {
		:deep(input) {
			min-width: 180px;
		}
	}
}

@media (max-width: 1390px) {
	.name-container {
		margin-right: var(--spacing--xs);
	}

	.actions {
		gap: var(--spacing--xs);
	}
}

@media (max-width: 1350px) {
	.name-container {
		margin-right: var(--spacing--2xs);
	}

	.actions {
		gap: var(--spacing--2xs);
	}
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
}

.path-separator {
	font-size: var(--font-size--xl);
	color: var(--color--foreground);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
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
