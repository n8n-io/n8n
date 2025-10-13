<script lang="ts" setup>
import BreakpointsObserver from '@/components/BreakpointsObserver.vue';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import FolderBreadcrumbs from '@/features/folders/components/FolderBreadcrumbs.vue';
import CollaborationPane from '@/features/collaboration/components/CollaborationPane.vue';
import WorkflowHistoryButton from '@/components/MainHeader/WorkflowHistoryButton.vue';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import SaveButton from '@/components/SaveButton.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import WorkflowProductionChecklist from '@/components/WorkflowProductionChecklist.vue';
import WorkflowTagsContainer from '@/components/WorkflowTagsContainer.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import {
	DUPLICATE_MODAL_KEY,
	EnterpriseEditionFeature,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	MAX_WORKFLOW_NAME_LENGTH,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	PROJECT_MOVE_RESOURCE_MODAL,
	VIEWS,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import { ResourceType } from '@/features/projects/projects.utils';

import { useProjectsStore } from '@/features/projects/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useMessage } from '@/composables/useMessage';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { nodeViewEventBus } from '@/event-bus';
import type { ActionDropdownItem, IWorkflowDb, IWorkflowToShare } from '@/Interface';
import type { FolderShortInfo } from '@/features/folders/folders.types';
import { useFoldersStore } from '@/features/folders/folders.store';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { ProjectTypes } from '@/features/projects/projects.types';
import { sanitizeFilename } from '@/utils/fileUtils';
import { hasPermission } from '@/utils/rbac/permissions';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { createEventBus } from '@n8n/utils/event-bus';
import { saveAs } from 'file-saver';
import { computed, ref, useCssModule, useTemplateRef, watch } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import {
	N8nActionDropdown,
	N8nBadge,
	N8nButton,
	N8nInlineTextEdit,
	N8nTooltip,
} from '@n8n/design-system';
const WORKFLOW_NAME_BP_TO_WIDTH: { [key: string]: number } = {
	XS: 150,
	SM: 200,
	MD: 250,
	LG: 500,
	XL: 1000,
};

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	scopes: IWorkflowDb['scopes'];
	active: IWorkflowDb['active'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
}>();

const $style = useCssModule();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const sourceControlStore = useSourceControlStore();
const tagsStore = useTagsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const foldersStore = useFoldersStore();
const npsSurveyStore = useNpsSurveyStore();
const i18n = useI18n();

const router = useRouter();
const route = useRoute();

const locale = useI18n();
const telemetry = useTelemetry();
const message = useMessage();
const toast = useToast();
const documentTitle = useDocumentTitle();
const workflowSaving = useWorkflowSaving({ router });
const workflowHelpers = useWorkflowHelpers();
const pageRedirectionHelper = usePageRedirectionHelper();

const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);
const importFileRef = ref<HTMLInputElement | undefined>();

const tagsEventBus = createEventBus();
const changeOwnerEventBus = createEventBus();

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const isNewWorkflow = computed(() => {
	return !props.id || props.id === PLACEHOLDER_EMPTY_WORKFLOW_ID || props.id === 'new';
});

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
});

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

const workflowPermissions = computed(() => getResourcePermissions(props.scopes).workflow);

const workflowMenuItems = computed<Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>>>(() => {
	const actions: Array<ActionDropdownItem<WORKFLOW_MENU_ACTIONS>> = [
		{
			id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
			label: locale.baseText('menuActions.download'),
			disabled: !onWorkflowPage.value,
		},
	];

	if (workflowPermissions.value.move && projectsStore.isTeamProjectFeatureEnabled) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.CHANGE_OWNER,
			label: locale.baseText('workflows.item.changeOwner'),
			disabled: isNewWorkflow.value,
		});
	}

	if (!props.readOnly && !props.isArchived) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.RENAME,
			label: locale.baseText('generic.rename'),
			disabled: !onWorkflowPage.value || workflowPermissions.value.update !== true,
		});
	}

	if (
		(workflowPermissions.value.delete === true && !props.readOnly && !props.isArchived) ||
		isNewWorkflow.value
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
		disabled: !onWorkflowPage.value || isNewWorkflow.value,
	});

	if ((workflowPermissions.value.delete === true && !props.readOnly) || isNewWorkflow.value) {
		if (props.isArchived) {
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.UNARCHIVE,
				label: locale.baseText('menuActions.unarchive'),
				disabled: !onWorkflowPage.value || isNewWorkflow.value,
			});
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.DELETE,
				label: locale.baseText('menuActions.delete'),
				disabled: !onWorkflowPage.value || isNewWorkflow.value,
				customClass: $style.deleteItem,
				divided: true,
			});
		} else {
			actions.push({
				id: WORKFLOW_MENU_ACTIONS.ARCHIVE,
				label: locale.baseText('menuActions.archive'),
				disabled: !onWorkflowPage.value || isNewWorkflow.value,
				customClass: $style.deleteItem,
				divided: true,
			});
		}
	}

	return actions;
});

const isWorkflowHistoryFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const workflowTagIds = computed(() => {
	return (props.tags ?? []).map((tag) => (typeof tag === 'string' ? tag : tag.id));
});

const currentProjectName = computed(() => {
	if (projectsStore.currentProject?.type === ProjectTypes.Personal) {
		return locale.baseText('projects.menu.personal');
	}
	return projectsStore.currentProject?.name;
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
		isTagsEditEnabled.value = false;
		renameInput.value?.forceCancel();
	},
);

function getWorkflowId(): string | undefined {
	let id: string | undefined = undefined;
	if (props.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		id = props.id;
	} else if (route.params.name && route.params.name !== 'new') {
		id = route.params.name as string;
	}

	return id;
}

async function onSaveButtonClick() {
	// If the workflow is saving, do not allow another save
	if (isWorkflowSaving.value) {
		return;
	}

	const id = getWorkflowId();

	const name = props.name;
	const tags = props.tags as string[];

	const saved = await workflowSaving.saveCurrentWorkflow({
		id,
		name,
		tags,
	});

	if (saved) {
		showCreateWorkflowSuccessToast(id);

		await npsSurveyStore.fetchPromptsData();

		if (route.name === VIEWS.EXECUTION_DEBUG) {
			await router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: props.id },
			});
		}
	}
}

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

function onTagsEditEnable() {
	appliedTagIds.value = (props.tags ?? []) as string[];
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		// allow name update to occur before disabling name edit
		renameInput.value?.forceCancel();
		tagsEventBus.emit('focus');
	}, 0);
}

async function onTagsBlur() {
	const current = (props.tags ?? []) as string[];
	const tags = appliedTagIds.value;
	if (!hasChanged(current, tags)) {
		isTagsEditEnabled.value = false;

		return;
	}
	if (tagsSaving.value) {
		return;
	}
	tagsSaving.value = true;

	const saved = await workflowSaving.saveCurrentWorkflow({ tags });
	telemetry.track('User edited workflow tags', {
		workflow_id: props.id,
		new_tag_count: tags.length,
	});

	tagsSaving.value = false;
	if (saved) {
		isTagsEditEnabled.value = false;
	}
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

async function onNameSubmit(name: string) {
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

	uiStore.addActiveAction('workflowSaving');
	const id = getWorkflowId();
	const saved = await workflowSaving.saveCurrentWorkflow({ name });
	if (saved) {
		showCreateWorkflowSuccessToast(id);
		documentTitle.setDocumentTitle(newName, 'IDLE');
	}
	uiStore.removeActiveAction('workflowSaving');
	renameInput.value?.forceCancel();
}

async function handleFileImport(): Promise<void> {
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
			onNameToggle();
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
			importFileRef.value?.click();
			break;
		}
		case WORKFLOW_MENU_ACTIONS.PUSH: {
			try {
				await onSaveButtonClick();

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
				await workflowsStore.archiveWorkflow(props.id);
			} catch (error) {
				toast.showError(error, locale.baseText('generic.archiveWorkflowError'));
				return;
			}

			uiStore.stateIsDirty = false;
			toast.showMessage({
				title: locale.baseText('mainSidebar.showMessage.handleArchive.title', {
					interpolate: { workflowName: props.name },
				}),
				type: 'success',
			});

			await router.push({ name: VIEWS.WORKFLOWS });

			break;
		}
		case WORKFLOW_MENU_ACTIONS.UNARCHIVE: {
			await workflowsStore.unarchiveWorkflow(props.id);
			toast.showMessage({
				title: locale.baseText('mainSidebar.showMessage.handleUnarchive.title', {
					interpolate: { workflowName: props.name },
				}),
				type: 'success',
			});
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DELETE: {
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

			try {
				await workflowsStore.deleteWorkflow(props.id);
			} catch (error) {
				toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
				return;
			}
			uiStore.stateIsDirty = false;
			// Reset tab title since workflow is deleted.
			documentTitle.reset();
			toast.showMessage({
				title: locale.baseText('mainSidebar.showMessage.handleSelect1.title', {
					interpolate: { workflowName: props.name },
				}),
				type: 'success',
			});

			await router.push({ name: VIEWS.WORKFLOWS });
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

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
}

function goToWorkflowHistoryUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow-history', 'upgrade-workflow-history');
}

function getPersonalProjectToastContent() {
	const title = locale.baseText('workflows.create.personal.toast.title');
	if (!props.currentFolder) {
		return { title };
	}

	const toastMessage = locale.baseText('workflows.create.folder.toast.title', {
		interpolate: {
			projectName: 'Personal',
			folderName: props.currentFolder.name,
		},
	});

	return { title, toastMessage };
}

function getToastContent() {
	const currentProject = projectsStore.currentProject;
	const isPersonalProject =
		!projectsStore.currentProject || currentProject?.id === projectsStore.personalProject?.id;
	const projectName = currentProjectName.value ?? '';

	if (isPersonalProject) {
		return getPersonalProjectToastContent();
	}

	const titleKey = props.currentFolder
		? 'workflows.create.folder.toast.title'
		: 'workflows.create.project.toast.title';

	const interpolateData: Record<string, string> = props.currentFolder
		? { projectName, folderName: props.currentFolder.name ?? '' }
		: { projectName };

	const title = locale.baseText(titleKey, { interpolate: interpolateData });

	const toastMessage = locale.baseText('workflows.create.project.toast.text', {
		interpolate: { projectName },
	});

	return { title, toastMessage };
}

function showCreateWorkflowSuccessToast(id?: string) {
	const shouldShowToast = !id || ['new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(id);

	if (!shouldShowToast) return;

	const { title, toastMessage } = getToastContent();

	toast.showMessage({
		title,
		message: toastMessage,
		type: 'success',
	});
}

const onBreadcrumbsItemSelected = (item: PathItem) => {
	if (item.href) {
		void router.push(item.href).catch((error) => {
			toast.showError(error, i18n.baseText('folders.open.error.title'));
		});
	}
};
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
							:read-only="readOnly || isArchived || (!isNewWorkflow && !workflowPermissions.update)"
							:disabled="readOnly || isArchived || (!isNewWorkflow && !workflowPermissions.update)"
							@update:model-value="onNameSubmit"
						/>
					</template>
				</FolderBreadcrumbs>
			</template>
		</BreakpointsObserver>
		<span class="tags" data-test-id="workflow-tags-container">
			<template v-if="settingsStore.areTagsEnabled">
				<WorkflowTagsDropdown
					v-if="
						isTagsEditEnabled &&
						!(readOnly || isArchived) &&
						(isNewWorkflow || workflowPermissions.update)
					"
					ref="dropdown"
					v-model="appliedTagIds"
					:event-bus="tagsEventBus"
					:placeholder="i18n.baseText('workflowDetails.chooseOrCreateATag')"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
					@blur="onTagsBlur"
					@esc="onTagsEditEsc"
				/>
				<div
					v-else-if="
						(tags ?? []).length === 0 &&
						!(readOnly || isArchived) &&
						(isNewWorkflow || workflowPermissions.update)
					"
				>
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

			<span class="archived">
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

		<PushConnectionTracker class="actions">
			<WorkflowProductionChecklist v-if="!isNewWorkflow" :workflow="workflowsStore.workflow" />
			<span :class="`activator ${$style.group}`">
				<WorkflowActivator
					:is-archived="isArchived"
					:workflow-active="active"
					:workflow-id="id"
					:workflow-permissions="workflowPermissions"
				/>
			</span>
			<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]">
				<div :class="$style.group">
					<CollaborationPane v-if="!isNewWorkflow" />
					<N8nButton
						type="secondary"
						data-test-id="workflow-share-button"
						@click="onShareButtonClick"
					>
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
									uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description
										.tooltip
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
					@click="onSaveButtonClick"
				/>
				<WorkflowHistoryButton
					:workflow-id="props.id"
					:is-feature-enabled="isWorkflowHistoryFeatureEnabled"
					:is-new-workflow="isNewWorkflow"
					@upgrade="goToWorkflowHistoryUpgrade"
				/>
			</div>
			<div :class="[$style.workflowMenuContainer, $style.group]">
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
		</PushConnectionTracker>
	</div>
</template>

<style scoped lang="scss">
$--text-line-height: 24px;
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

.archived {
	display: flex;
	align-items: center;
	width: 100%;
	flex: 1;
	margin-right: $--header-spacing;
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

.closeNodeViewDiscovery {
	position: absolute;
	right: var(--spacing--xs);
	top: var(--spacing--xs);
	cursor: pointer;
}
</style>
