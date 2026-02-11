<script lang="ts" setup>
import { computed, ref, useCssModule } from 'vue';
import { type ActionDropdownItem, N8nActionDropdown } from '@n8n/design-system';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client';
import { useToast } from '@/app/composables/useToast';
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
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import type { IWorkflowToShare, IWorkflowDb } from '@/Interface';
import { telemetry } from '@/app/plugins/telemetry';
import router from '@/app/router';
import { sanitizeFilename } from '@n8n/utils';
import saveAs from 'file-saver';
import { nodeViewEventBus } from '@/app/event-bus';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { getWorkflowId } from '@/app/components/MainHeader/utils';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';

const props = defineProps<{
	workflowPermissions: PermissionsRecord['workflow'];
	isNewWorkflow: boolean;
	isArchived: IWorkflowDb['isArchived'];
	id: IWorkflowDb['id'];
	name: IWorkflowDb['name'];
	tags: readonly string[];
	currentFolder?: FolderShortInfo;
	meta: IWorkflowDb['meta'];
}>();

const importFileRef = ref<HTMLInputElement | undefined>();
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
const workflowHelpers = useWorkflowHelpers();
const changeOwnerEventBus = createEventBus();
const workflowTelemetry = useTelemetry();

const onWorkflowPage = computed(() => {
	return route.meta && (route.meta.nodeView || route.meta.keepWorkflowAlive === true);
});

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
	const actions: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [
		{
			id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
			label: locale.baseText('menuActions.download'),
			disabled: !onWorkflowPage.value,
		},
	];

	if (isSharingEnabled.value) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.SHARE,
			label: locale.baseText('workflowDetails.share'),
			disabled: !onWorkflowPage.value,
		});
	}

	if (props.workflowPermissions.move && projectsStore.isTeamProjectFeatureEnabled) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.CHANGE_OWNER,
			label: locale.baseText('workflows.item.changeOwner'),
			disabled: props.isNewWorkflow,
		});
	}

	if (
		!collaborationReadOnly.value &&
		!props.isArchived &&
		!sourceControlStore.preferences.branchReadOnly
	) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.RENAME,
			label: locale.baseText('generic.rename'),
			disabled: !onWorkflowPage.value || props.workflowPermissions.update !== true,
		});
	}

	if (
		(props.workflowPermissions.update === true &&
			!collaborationReadOnly.value &&
			!props.isArchived &&
			!sourceControlStore.preferences.branchReadOnly) ||
		props.isNewWorkflow
	) {
		actions.unshift({
			id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
			label: locale.baseText('menuActions.duplicate'),
			disabled: !onWorkflowPage.value || !props.id,
		});
		actions.unshift({
			id: WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION,
			label: locale.baseText('menuActions.editDescription'),
			disabled: !onWorkflowPage.value || !props.id,
		});

		actions.push(
			{
				id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
				label: locale.baseText('menuActions.importFromUrl'),
				disabled: !onWorkflowPage.value || onExecutionsTab.value,
			},
			{
				id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
				label: locale.baseText('menuActions.importFromFile'),
				disabled: !onWorkflowPage.value || onExecutionsTab.value,
			},
		);
	}

	if (hasPermission(['rbac'], { rbac: { scope: 'sourceControl:push' } })) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.PUSH,
			label: locale.baseText('menuActions.push'),
			disabled:
				!sourceControlStore.isEnterpriseSourceControlEnabled ||
				!onWorkflowPage.value ||
				onExecutionsTab.value ||
				sourceControlStore.preferences.branchReadOnly,
		});
	}

	actions.push({
		id: WORKFLOW_MENU_ACTIONS.SETTINGS,
		label: locale.baseText('generic.settings'),
		disabled: !onWorkflowPage.value || props.isNewWorkflow,
	});

	if (
		(props.workflowPermissions.delete === true &&
			!collaborationReadOnly.value &&
			!sourceControlStore.preferences.branchReadOnly) ||
		props.isNewWorkflow
	) {
		if (props.isArchived) {
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.UNARCHIVE,
				label: locale.baseText('menuActions.unarchive'),
				disabled: !onWorkflowPage.value || props.isNewWorkflow,
			});
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.DELETE,
				label: locale.baseText('menuActions.delete'),
				disabled: !onWorkflowPage.value || props.isNewWorkflow,
				customClass: $style.deleteItem,
				divided: true,
			});
		} else {
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.ARCHIVE,
				label: locale.baseText('menuActions.archive'),
				disabled: !onWorkflowPage.value || props.isNewWorkflow,
				customClass: $style.deleteItem,
				divided: true,
			});
		}
	}

	return actions;
});

async function onWorkflowMenuSelect(action: WORKFLOW_MENU_ACTIONS): Promise<void> {
	switch (action) {
		case WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION: {
			const workflowId = getWorkflowId(props.id, route.params.name);
			if (!workflowId) return;

			const workflowDescription = workflowsListStore.getWorkflowById(workflowId).description;
			uiStore.openModalWithData({
				name: WORKFLOW_DESCRIPTION_MODAL_KEY,
				data: {
					workflowId,
					workflowDescription,
				},
			});
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
		case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
			const workflowData = await workflowHelpers.getWorkflowDataToSave();
			const { tags, ...data } = workflowData;
			const exportData: IWorkflowToShare = {
				...data,
				meta: {
					...props.meta,
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
							locale.baseText('settings.sourceControl.error.not.connected.message'),
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
		case WORKFLOW_MENU_ACTIONS.CHANGE_OWNER: {
			const workflowId = getWorkflowId(props.id, route.params.name);
			if (!workflowId) {
				return;
			}
			changeOwnerEventBus.once(
				'resource-moved',
				async () => await router.push({ name: VIEWS.WORKFLOWS }),
			);

			uiStore.openModalWithData({
				name: PROJECT_MOVE_RESOURCE_MODAL,
				data: {
					resource: workflowsListStore.workflowsById[workflowId],
					resourceType: ResourceType.Workflow,
					resourceTypeLabel: locale.baseText('generic.workflow').toLowerCase(),
					eventBus: changeOwnerEventBus,
				},
			});
			break;
		}
		default:
			break;
	}
}

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
		<N8nActionDropdown
			:items="workflowMenuItems"
			data-test-id="workflow-menu"
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
