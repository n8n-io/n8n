<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import { computed, ref, useCssModule } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nButton, N8nTooltip } from '@n8n/design-system';
import type { ActionDropdownItem, IWorkflowDb, IWorkflowToShare } from '@/Interface';
import {
	EnterpriseEditionFeature,
	WORKFLOW_SHARE_MODAL_KEY,
	VIEWS,
	DUPLICATE_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from '@/constants';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import { nodeViewEventBus } from '@/event-bus';
import SaveButton from '@/components/SaveButton.vue';
import { I18nT } from 'vue-i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRoute, useRouter } from 'vue-router';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useRootStore } from '@n8n/stores/useRootStore';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import { sanitizeFilename } from '@/utils/fileUtils';
import { hasPermission } from '@/utils/rbac/permissions';
import saveAs from 'file-saver';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { useToast } from '@/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import { useTagsStore } from '@/stores/tags.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants/workflows';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

const i18n = useI18n();
const uiStore = useUIStore();
const tagsStore = useTagsStore();
const workflowsStore = useWorkflowsStore();
const toast = useToast();
const telemetry = useTelemetry();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const route = useRoute();
const router = useRouter();
const pageRedirectionHelper = usePageRedirectionHelper();
const workflowHelpers = useWorkflowHelpers();
const locale = useI18n();
const importFileRef = ref<HTMLInputElement | undefined>();
const changeOwnerEventBus = createEventBus();
const $style = useCssModule();

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	active: boolean;
	currentFolder?: FolderShortInfo;
	isArchived: boolean;
	isNewWorkflow: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	'workflow:deactivated': [];
	'workflow:saved': [];
}>();

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

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
});

const onWorkflowActiveToggle = async (value: { id: string; active: boolean }) => {
	if (!value.active) {
		emit('workflow:deactivated');
	}
};

function onShareButtonClick() {
	uiStore.openModalWithData({
		name: WORKFLOW_SHARE_MODAL_KEY,
		data: { id: props.id },
	});

	telemetry.track('User opened sharing modal', {
		workflow_id: props.id,
		user_id_sharer: usersStore.currentUser?.id,
		sub_view: route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
	});
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
}

// TODO: can we not duplicate this?
function getWorkflowId(): string | undefined {
	let id: string | undefined = undefined;
	if (props.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		id = props.id;
	} else if (route.params.name && route.params.name !== 'new') {
		id = route.params.name as string;
	}

	return id;
}

async function onWorkflowMenuSelect(action: WORKFLOW_MENU_ACTIONS): Promise<void> {
	switch (action) {
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
				emit('workflow:saved');

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
			const workflowId = getWorkflowId();
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
					resource: workflowsStore.workflowsById[workflowId],
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

	if (props.workflowPermissions.move && projectsStore.isTeamProjectFeatureEnabled) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.CHANGE_OWNER,
			label: locale.baseText('workflows.item.changeOwner'),
			disabled: props.isNewWorkflow,
		});
	}

	if (!props.readOnly && !props.isArchived) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.RENAME,
			label: locale.baseText('generic.rename'),
			disabled: !onWorkflowPage.value || props.workflowPermissions.update !== true,
		});
	}

	if (
		(props.workflowPermissions.delete === true && !props.readOnly && !props.isArchived) ||
		props.isNewWorkflow
	) {
		actions.unshift({
			id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
			label: locale.baseText('menuActions.duplicate'),
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

	if ((props.workflowPermissions.delete === true && !props.readOnly) || props.isNewWorkflow) {
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

defineExpose({
	importFileRef,
});
</script>
<template>
	<span :class="[$style.activator, $style.group]">
		<WorkflowActivator
			:is-archived="isArchived"
			:workflow-active="active"
			:workflow-id="id"
			:workflow-permissions="workflowPermissions"
			@update:workflow-active="onWorkflowActiveToggle"
		/>
	</span>
	<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]">
		<div :class="$style.group">
			<CollaborationPane v-if="!isNewWorkflow" />
			<N8nButton type="secondary" data-test-id="workflow-share-button" @click="onShareButtonClick">
				{{ i18n.baseText('workflowDetails.share') }}
			</N8nButton>
		</div>
		<template #fallback>
			<N8nTooltip>
				<N8nButton type="secondary" :class="['mr-2xs', $style.disabledShareButton]">
					{{ i18n.baseText('workflowDetails.share') }}
				</N8nButton>
				<template #content>
					<I18nT
						:keypath="
							uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description.tooltip
						"
						tag="span"
						scope="global"
					>
						<template #action>
							<a @click="goToUpgrade">
								{{
									i18n.baseText(
										uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable
											.button as BaseTextKey,
									)
								}}
							</a>
						</template>
					</I18nT>
				</template>
			</N8nTooltip>
		</template>
	</EnterpriseEdition>
	<div :class="$style.group">
		<SaveButton
			type="primary"
			:saved="!uiStore.stateIsDirty && !isNewWorkflow"
			:disabled="
				isWorkflowSaving ||
				readOnly ||
				isArchived ||
				(!isNewWorkflow && !workflowPermissions.update)
			"
			:is-saving="isWorkflowSaving"
			:with-shortcut="!readOnly && !isArchived && workflowPermissions.update"
			:shortcut-tooltip="i18n.baseText('saveWorkflowButton.hint')"
			data-test-id="workflow-save-button"
			@click="$emit('workflow:saved')"
		/>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
	</div>
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

<style module lang="scss">
$--text-line-height: 24px;
.activator {
	color: $custom-font-dark;
	font-weight: var(--font-weight--regular);
	font-size: 13px;
	line-height: $--text-line-height;
	align-items: center;

	> span {
		margin-right: 5px;
	}
}

.group {
	display: flex;
	gap: var(--spacing--xs);
}

.hiddenInput {
	display: none;
}

.deleteItem {
	color: var(--color--danger);
}

.disabledShareButton {
	cursor: not-allowed;
}
</style>
