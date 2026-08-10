<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, useTemplateRef } from 'vue';
import { type ActionDropdownItem, N8nActionDropdown } from '@n8n/design-system';
import WorkflowProductionChecklist from '@/app/components/WorkflowProductionChecklist.vue';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	WORKFLOW_MENU_ACTIONS,
	VIEWS,
	DUPLICATE_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	EnterpriseEditionFeature,
	WORKFLOW_DESCRIPTION_MODAL_KEY,
} from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { PermissionsRecord } from '@n8n/permissions';
import { useUIStore } from '@/app/stores/ui.store';
import type { IWorkflowToShare, IWorkflowDb } from '@/Interface';
import { telemetry } from '@/app/plugins/telemetry';
import router from '@/app/router';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import saveAs from 'file-saver';
import { nodeViewEventBus } from '@/app/event-bus';
import type { FolderShortInfo, WorkflowListEventMap } from '@/features/core/folders/folders.types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { getWorkflowId } from '@/app/components/MainHeader/utils';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import { useMoveResourceToProjectToast } from '@/features/collaboration/projects/composables/useMoveResourceToProjectToast';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const props = defineProps<{
	workflowPermissions: PermissionsRecord['workflow'];
	isNewWorkflow: boolean;
	isArchived: IWorkflowDb['isArchived'];
	id: IWorkflowDb['id'];
	name: IWorkflowDb['name'];
	tags: readonly string[];
	currentFolder?: FolderShortInfo;
}>();

const importFileRef = ref<HTMLInputElement | undefined>();
const productionChecklistRef =
	useTemplateRef<InstanceType<typeof WorkflowProductionChecklist>>('productionChecklist');
const toast = useToast();
const locale = useI18n();
const route = useRoute();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const collaborationStore = useCollaborationStore();
const workflowsListStore = useWorkflowsListStore();
const uiStore = useUIStore();
const $style = useCssModule();
const rootStore = useRootStore();
const tagsStore = useTagsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const moveWorkflowEventBus = createEventBus<WorkflowListEventMap>();
const { showMoveToProjectToast } = useMoveResourceToProjectToast();
const workflowTelemetry = useTelemetry();
const favoritesStore = useFavoritesStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const onExecutionsTab = computed(() => {
	return [
		VIEWS.EXECUTION_HOME.toString(),
		VIEWS.WORKFLOW_EXECUTIONS.toString(),
		VIEWS.EXECUTION_PREVIEW,
	].includes((route.name as string) || '');
});

const collaborationReadOnly = computed(() => collaborationStore.shouldBeReadOnly);

const isSharingEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);

function handleFileImport() {
	const inputRef = importFileRef.value;
	if (inputRef?.files && inputRef.files.length !== 0) {
		const reader = new FileReader();
		reader.onload = () => {
			let workflowData: WorkflowDataUpdate;
			try {
				workflowData = JSON.parse(reader.result as string);
			} catch (error) {
				toast.showMessage({
					title: locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
					message: locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
					type: 'error',
				});
				return;
			} finally {
				reader.onload = null;
				inputRef.value = '';
			}

			nodeViewEventBus.emit('importWorkflowData', { data: workflowData });
		};
		reader.readAsText(inputRef.files[0]);
	}
}

const workflowMenuItems = computed<Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>>>(() => {
	const canEdit =
		(props.workflowPermissions.update === true &&
			!collaborationReadOnly.value &&
			!props.isArchived &&
			!sourceControlStore.preferences.branchReadOnly) ||
		props.isNewWorkflow;

	const nameAndMetadata: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [];

	if (
		!collaborationReadOnly.value &&
		!props.isArchived &&
		!sourceControlStore.preferences.branchReadOnly
	) {
		nameAndMetadata.push({
			id: WORKFLOW_MENU_ACTIONS.RENAME,
			label: locale.baseText('generic.rename'),
			disabled: props.workflowPermissions.update !== true,
		});
	}

	if (canEdit) {
		nameAndMetadata.push({
			id: WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION,
			label: locale.baseText('menuActions.editDescriptionAndTags'),
			disabled: !props.id,
		});
	}

	nameAndMetadata.push({
		id: WORKFLOW_MENU_ACTIONS.FAVORITE,
		label: favoritesStore.isFavorite(props.id, 'workflow')
			? locale.baseText('favorites.remove')
			: locale.baseText('favorites.add'),
		disabled: props.isNewWorkflow,
	});

	const organization: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [];

	if (props.workflowPermissions.move && projectsStore.isTeamProjectFeatureEnabled) {
		organization.push({
			id: WORKFLOW_MENU_ACTIONS.CHANGE_OWNER,
			label: locale.baseText('workflows.item.changeOwner'),
			disabled: props.isNewWorkflow,
		});
	}

	if (canEdit) {
		organization.push({
			id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
			label: locale.baseText('menuActions.duplicate'),
			disabled: !props.id,
		});
	}

	if (isSharingEnabled.value && props.workflowPermissions.share) {
		organization.push({
			id: WORKFLOW_MENU_ACTIONS.SHARE,
			label: locale.baseText('workflowDetails.share'),
		});
	}

	const importExport: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [
		{
			id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
			label: locale.baseText('menuActions.exportJson'),
		},
	];

	if (canEdit) {
		importExport.push({
			id: WORKFLOW_MENU_ACTIONS.IMPORT,
			label: locale.baseText('menuActions.import'),
			disabled: onExecutionsTab.value,
			children: [
				{
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
					label: locale.baseText('menuActions.importFromUrl'),
					disabled: onExecutionsTab.value,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
					label: locale.baseText('menuActions.importFromFile'),
					disabled: onExecutionsTab.value,
				},
			],
		});
	}

	if (hasPermission(['rbac'], { rbac: { scope: 'sourceControl:push' } })) {
		importExport.push({
			id: WORKFLOW_MENU_ACTIONS.PUSH,
			label: locale.baseText('menuActions.push'),
			disabled:
				!sourceControlStore.isEnterpriseSourceControlEnabled ||
				onExecutionsTab.value ||
				sourceControlStore.preferences.branchReadOnly,
		});
	}

	const workflowTools: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [
		{
			id: WORKFLOW_MENU_ACTIONS.VERSION_HISTORY,
			label: locale.baseText('menuActions.versionHistory'),
			disabled: props.isNewWorkflow,
		},
		{
			id: WORKFLOW_MENU_ACTIONS.SETTINGS,
			label: locale.baseText('generic.settings'),
			disabled: props.isNewWorkflow,
		},
	];

	if (!props.isNewWorkflow && productionChecklistRef.value?.hasActions) {
		workflowTools.push({
			id: WORKFLOW_MENU_ACTIONS.PRODUCTION_CHECKLIST,
			label: locale.baseText('menuActions.productionChecklist'),
		});
	}

	const lifecycle: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [];

	if (
		(props.workflowPermissions.delete === true &&
			!collaborationReadOnly.value &&
			!sourceControlStore.preferences.branchReadOnly) ||
		props.isNewWorkflow
	) {
		if (props.isArchived) {
			lifecycle.push({
				id: WORKFLOW_MENU_ACTIONS.UNARCHIVE,
				label: locale.baseText('menuActions.unarchive'),
				disabled: props.isNewWorkflow,
			});
			lifecycle.push({
				id: WORKFLOW_MENU_ACTIONS.DELETE,
				label: locale.baseText('menuActions.delete'),
				disabled: props.isNewWorkflow,
				customClass: $style.deleteItem,
			});
		} else {
			lifecycle.push({
				id: WORKFLOW_MENU_ACTIONS.ARCHIVE,
				label: locale.baseText('menuActions.archive'),
				disabled: props.isNewWorkflow,
				customClass: $style.deleteItem,
			});
		}
	}

	const groups = [nameAndMetadata, organization, importExport, workflowTools, lifecycle].filter(
		(group) => group.length > 0,
	);

	// A separator above the first item of every group but the first.
	return groups.flatMap((group, index) =>
		index === 0 ? group : group.map((item, i) => (i === 0 ? { ...item, divided: true } : item)),
	);
});

function openDescriptionAndTagsModal(): void {
	const workflowId = getWorkflowId(props.id, route.params.workflowId);
	if (!workflowId) return;

	const workflowDescription =
		workflowDocumentStore?.value?.description ??
		workflowsListStore.getWorkflowById(workflowId)?.description;
	uiStore.openModalWithData({
		name: WORKFLOW_DESCRIPTION_MODAL_KEY,
		data: {
			workflowId,
			workflowName: props.name,
			workflowDescription,
			workflowTags: [...props.tags],
			isNewWorkflow: props.isNewWorkflow,
		},
	});
}

async function onWorkflowMenuSelect(action: WORKFLOW_MENU_ACTIONS): Promise<void> {
	switch (action) {
		case WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION: {
			openDescriptionAndTagsModal();
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DUPLICATE: {
			uiStore.openModalWithData({
				name: DUPLICATE_MODAL_KEY,
				data: {
					id: props.id,
					name: props.name,
					tags: props.tags,
					parentFolderId: props.currentFolder?.id,
				},
			});
			break;
		}
		case WORKFLOW_MENU_ACTIONS.RENAME: {
			nodeViewEventBus.emit('renameWorkflow');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.PRODUCTION_CHECKLIST: {
			// Defer until the dropdown has closed and restored focus to its trigger;
			// opening in the same tick lets that focus restore land "outside" the
			// popover, which would immediately dismiss it.
			setTimeout(() => productionChecklistRef.value?.open(), 0);
			break;
		}
		case WORKFLOW_MENU_ACTIONS.VERSION_HISTORY: {
			void router.push({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId: props.id },
			});
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
			if (!workflowDocumentStore?.value) {
				throw new Error('Cannot download workflow: workflow document store is unavailable');
			}
			const workflowData = workflowDocumentStore.value.serialize();
			const { tags, ...data } = workflowData;
			const exportData: IWorkflowToShare = {
				...data,
				meta: {
					...data.meta,
					instanceId: rootStore.instanceId,
				},
				tags: (tags ?? []).map((tagId) => {
					const { usageCount, ...tag } = tagsStore.tagsById[tagId];

					return tag;
				}),
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json;charset=utf-8',
			});

			let name = props.name || 'unsaved_workflow';
			name = sanitizeFilename(name);

			telemetry.track('User exported workflow', { workflow_id: workflowData.id });
			saveAs(blob, name + '.json');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL: {
			uiStore.openModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
			nodeViewEventBus.emit('importWorkflowFromFile');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.PUSH: {
			try {
				// Navigate to route with sourceControl param - modal will handle data loading and loading states
				void router.push({
					query: {
						...route.query,
						sourceControl: 'push',
					},
				});
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				switch (error.message) {
					case 'source_control_not_connected':
						toast.showError(
							{ ...error, message: '' },
							locale.baseText('settings.sourceControl.error.not.connected.title'),
							{ message: locale.baseText('settings.sourceControl.error.not.connected.message') },
						);
						break;
					default:
						toast.showError(error, locale.baseText('error'));
				}
			}

			break;
		}
		case WORKFLOW_MENU_ACTIONS.SETTINGS: {
			uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			break;
		}
		case WORKFLOW_MENU_ACTIONS.SHARE: {
			uiStore.openModalWithData({
				name: WORKFLOW_SHARE_MODAL_KEY,
				data: { id: props.id },
			});

			workflowTelemetry.track('User opened sharing modal', {
				workflow_id: props.id,
				user_id_sharer: usersStore.currentUser?.id,
				sub_view: route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
			});
			break;
		}
		case WORKFLOW_MENU_ACTIONS.ARCHIVE: {
			nodeViewEventBus.emit('archiveWorkflow');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.UNARCHIVE: {
			nodeViewEventBus.emit('unarchiveWorkflow');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DELETE: {
			nodeViewEventBus.emit('deleteWorkflow');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.FAVORITE: {
			await favoritesStore.toggleFavorite(props.id, 'workflow');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.CHANGE_OWNER: {
			const workflowId = getWorkflowId(props.id, route.params.workflowId);
			if (!workflowId) {
				return;
			}
			const workflow = workflowsListStore.workflowsById[workflowId];

			const navigateAway = async () => await router.push({ name: VIEWS.WORKFLOWS });
			moveWorkflowEventBus.once('workflow-transferred', async (event) => {
				await navigateAway();
				showMoveToProjectToast({
					resourceType: ResourceType.Workflow,
					resourceTypeLabel: locale.baseText('generic.workflow').toLowerCase(),
					resourceName: event.source.workflow.name,
					targetProject: event.toast.targetProject,
					targetProjectName: event.toast.targetProjectName,
					destinationFolderId: event.destination.parentFolder.id,
					shareUsedCredentials: event.toast.shareUsedCredentials,
					areAllUsedCredentialsShareable: event.toast.areAllUsedCredentialsShareable,
				});
			});

			uiStore.openMoveToFolderModal(
				'workflow',
				{
					id: workflow.id,
					name: workflow.name,
					parentFolderId: props.currentFolder?.id,
					sharedWithProjects: workflow.sharedWithProjects,
					homeProjectId: workflow.homeProject?.id,
				},
				moveWorkflowEventBus,
			);
			break;
		}
		default:
			break;
	}
}

onMounted(() => {
	nodeViewEventBus.on('addTag', openDescriptionAndTagsModal);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('addTag', openDescriptionAndTagsModal);
});

defineExpose({
	importFileRef,
});
</script>
<template>
	<div :class="[$style.group]">
		<input
			ref="importFileRef"
			:class="$style.hiddenInput"
			type="file"
			data-test-id="workflow-import-input"
			@change="handleFileImport()"
		/>
		<WorkflowProductionChecklist v-if="!isNewWorkflow" ref="productionChecklist" hide-trigger />
		<N8nActionDropdown
			:items="workflowMenuItems"
			data-test-id="workflow-menu"
			max-height="var(--reka-dropdown-menu-content-available-height)"
			@select="onWorkflowMenuSelect"
		/>
	</div>
</template>
<style lang="scss" module>
.deleteItem {
	color: var(--color--danger);
}
.group {
	display: flex;
	gap: var(--spacing--xs);
}
.hiddenInput {
	display: none;
}
</style>
