<script lang="ts" setup>
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	AutoSaveState,
	WORKFLOW_HISTORY_VERSION_UNPUBLISH,
	WORKFLOW_SAVE_DRAFT_MODAL_KEY,
} from '@/app/constants';
import { N8nButton, N8nTooltip, N8nDropdownMenu, N8nIconButton } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';

import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRouter, useRoute } from 'vue-router';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import {
	getLastPublishedVersion,
	generateVersionName,
} from '@/features/workflows/workflowHistory/utils';
import { nodeViewEventBus } from '@/app/event-bus';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';
import TimeAgo from '../TimeAgo.vue';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useToast } from '@/app/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import { getWorkflowId } from '@/app/components/MainHeader/utils';

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	isNewWorkflow: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsDropdownMenu>>('actionsMenu');

const readOnlyForPublish = computed(() => {
	if (props.isNewWorkflow) return props.readOnly;
	return (
		props.readOnly ||
		props.isArchived ||
		(!props.workflowPermissions.update && !props.workflowPermissions.publish)
	);
});

const shouldHidePublishButton = computed(() => {
	return (
		props.readOnly ||
		props.isArchived ||
		(!props.workflowPermissions.publish && !props.workflowPermissions.update)
	);
});

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const autosaveStore = useWorkflowAutosaveStore();
const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router });
const workflowActivate = useWorkflowActivate();

const autoSaveForPublish = ref(false);

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

type WorkflowPublishState =
	| 'not-published-not-eligible' // No trigger nodes or has errors
	| 'not-published-eligible' // Can be published for first time
	| 'published-no-changes' // Published and up to date
	| 'published-with-changes' // Published but has unpublished changes
	| 'published-node-issues' // Published but has node issues
	| 'published-invalid-trigger'; // Published but no trigger nodes

const workflowPublishState = computed((): WorkflowPublishState => {
	const hasBeenPublished = !!workflowsStore.workflow.activeVersion;
	const hasChanges =
		workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId ||
		uiStore.stateIsDirty;

	// Not published states
	if (!hasBeenPublished) {
		const canPublish = containsTrigger.value && !workflowsStore.nodesIssuesExist;
		return canPublish ? 'not-published-eligible' : 'not-published-not-eligible';
	}

	// Published states
	if (!containsTrigger.value) {
		return 'published-invalid-trigger';
	}

	if (workflowsStore.nodesIssuesExist) {
		return 'published-node-issues';
	}

	return hasChanges ? 'published-with-changes' : 'published-no-changes';
});

/**
 * Cancel autosave if scheduled or wait for it to finish if in progress
 * Save immediately if autosave idle or cancelled
 */
const saveBeforePublish = async () => {
	if (autosaveStore.autoSaveState === AutoSaveState.InProgress && autosaveStore.pendingAutoSave) {
		autoSaveForPublish.value = true;
		try {
			await autosaveStore.pendingAutoSave;
		} finally {
			autoSaveForPublish.value = false;
		}
	} else if (autosaveStore.autoSaveState === AutoSaveState.Scheduled) {
		cancelAutoSave();
	}

	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		autoSaveForPublish.value = true;
		try {
			const saved = await saveCurrentWorkflow({}, true);
			if (!saved) {
				throw new Error('Failed to save workflow before publish');
			}
		} finally {
			autoSaveForPublish.value = false;
		}
	}
};

const onPublishButtonClick = async () => {
	// If there are unsaved changes, save the workflow first
	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		try {
			await saveBeforePublish();
		} catch {
			return;
		}
	}

	uiStore.openModalWithData({
		name: WORKFLOW_PUBLISH_MODAL_KEY,
		data: {},
	});
};

const publishButtonConfig = computed(() => {
	// Handle permission-denied state first
	if (!props.workflowPermissions.publish) {
		return {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: false,
			indicatorClass: '',
			tooltip: i18n.baseText('workflows.publish.permissionDenied'),
			showVersionInfo: false,
		};
	}

	// Handle new workflow state
	if (props.isNewWorkflow) {
		return {
			text: i18n.baseText('workflows.publish'),
			enabled: containsTrigger.value && !workflowsStore.nodesIssuesExist,
			showIndicator: false,
			indicatorClass: '',
			tooltip: !containsTrigger.value
				? i18n.baseText('workflows.publishModal.noTriggerMessage')
				: workflowsStore.nodesIssuesExist
					? i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
							interpolate: { count: workflowsStore.nodesWithIssues.length },
							adjustToNumber: workflowsStore.nodesWithIssues.length,
						})
					: '',
			showVersionInfo: false,
		};
	}

	// Map workflow state to UI configuration
	const configs = {
		'not-published-not-eligible': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: false,
			indicatorClass: '',
			tooltip: !containsTrigger.value
				? i18n.baseText('workflows.publishModal.noTriggerMessage')
				: i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
						interpolate: { count: workflowsStore.nodesWithIssues.length },
						adjustToNumber: workflowsStore.nodesWithIssues.length,
					}),
			showVersionInfo: false,
		},
		'not-published-eligible': {
			text: i18n.baseText('workflows.publish'),
			enabled: true,
			showIndicator: false,
			indicatorClass: '',
			tooltip: '',
			showVersionInfo: false,
		},
		'published-no-changes': {
			text: i18n.baseText('generic.published'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'published',
			tooltip: '',
			showVersionInfo: true,
		},
		'published-with-changes': {
			text: i18n.baseText('workflows.publish'),
			enabled: true,
			showIndicator: true,
			indicatorClass: 'changes',
			tooltip: i18n.baseText('workflows.publishModal.changes'),
			showVersionInfo: false,
		},
		'published-node-issues': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'error',
			tooltip: i18n.baseText(
				'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title',
				{
					interpolate: { count: workflowsStore.nodesWithIssues.length },
					adjustToNumber: workflowsStore.nodesWithIssues.length,
				},
			),
			showVersionInfo: true,
		},
		'published-invalid-trigger': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'changes',
			tooltip: i18n.baseText('workflows.publishModal.noTriggerMessage'),
			showVersionInfo: true,
		},
	};

	return configs[workflowPublishState.value];
});

const activeVersion = computed(() => workflowsStore.workflow.activeVersion);

const activeVersionName = computed(() => {
	if (!activeVersion.value) {
		return '';
	}
	return activeVersion.value.name ?? generateVersionName(activeVersion.value.versionId);
});

const latestPublishDate = computed(() => {
	const latestPublish = getLastPublishedVersion(activeVersion.value?.workflowPublishHistory ?? []);
	return latestPublish?.createdAt;
});

// Dropdown menu items
const dropdownMenuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const items: Array<DropdownMenuItemProps<string>> = [
		{
			id: 'publish',
			label: i18n.baseText('workflows.publish'),
			disabled: !publishButtonConfig.value.enabled || readOnlyForPublish.value,
		},
		{
			id: 'save-draft',
			label: i18n.baseText('workflows.saveDraft'),
			disabled:
				readOnlyForPublish.value ||
				props.isNewWorkflow ||
				(!uiStore.stateIsDirty &&
					workflowsStore.workflow.versionId === workflowsStore.workflow.activeVersion?.versionId),
		},
	];

	// Only show unpublish if there's an active version and user has permission
	if (activeVersion.value && props.workflowPermissions.publish && !props.readOnly) {
		items.push({
			id: 'unpublish',
			label: i18n.baseText('menuActions.unpublish'),
			disabled: false,
			divided: true,
		});
	}

	return items;
});

const onDropdownMenuSelect = async (action: string) => {
	switch (action) {
		case 'publish':
			await onPublishButtonClick();
			break;
		case 'save-draft':
			await onSaveDraftClick();
			break;
		case 'unpublish':
			await onUnpublishWorkflow();
			break;
		default:
			break;
	}
};

const onSaveDraftClick = async () => {
	// Save any pending changes first
	if (uiStore.stateIsDirty) {
		try {
			await saveBeforePublish();
		} catch {
			return;
		}
	}

	// Open save draft modal
	uiStore.openModalWithData({
		name: WORKFLOW_SAVE_DRAFT_MODAL_KEY,
		data: {
			workflowId: props.id,
			versionId: workflowsStore.workflow.versionId,
		},
	});
};

const onUnpublishWorkflow = async () => {
	const workflowId = getWorkflowId(props.id, route.params.name);

	if (!workflowId || !activeVersion.value) {
		toast.showMessage({
			title: i18n.baseText('workflowHistory.action.unpublish.notAvailable'),
			type: 'warning',
		});
		return;
	}

	const unpublishEventBus = createEventBus();
	unpublishEventBus.once('unpublish', async () => {
		const success = await workflowActivate.unpublishWorkflowFromHistory(workflowId);
		uiStore.closeModal(WORKFLOW_HISTORY_VERSION_UNPUBLISH);
		if (success) {
			toast.showMessage({
				title: i18n.baseText('workflowHistory.action.unpublish.success.title'),
				type: 'success',
			});
		}
	});

	uiStore.openModalWithData({
		name: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
		data: {
			versionName: activeVersion.value.name,
			eventBus: unpublishEventBus,
		},
	});
};

// Track dropdown open state
const dropdownOpen = ref(false);

// Get shortcut label for dropdown item
const getShortcutForItem = (itemId: string): string => {
	const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const cmdKey = isMac ? '⌘' : 'Ctrl';

	switch (itemId) {
		case 'publish':
			return 'P';
		case 'save-draft':
			return `${cmdKey} S`;
		case 'unpublish':
			return `${cmdKey} U`;
		default:
			return '';
	}
};

// Keyboard shortcuts
const handleKeyboardShortcut = (event: KeyboardEvent) => {
	// Don't handle shortcuts if user is typing in an input/textarea
	const target = event.target as HTMLElement;
	if (
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.contentEditable === 'true'
	) {
		return;
	}

	// Prevent default for our shortcuts
	if (event.key === 'p' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
		event.preventDefault();
		if (
			!publishButtonConfig.value.enabled ||
			readOnlyForPublish.value ||
			shouldHidePublishButton.value
		) {
			return;
		}
		void onPublishButtonClick();
	} else if (event.key === 's' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
		event.preventDefault();
		const saveDraftItem = dropdownMenuItems.value.find((item) => item.id === 'save-draft');
		if (saveDraftItem && !saveDraftItem.disabled && !shouldHidePublishButton.value) {
			void onDropdownMenuSelect('save-draft');
		}
	} else if (event.key === 'u' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
		event.preventDefault();
		const unpublishItem = dropdownMenuItems.value.find((item) => item.id === 'unpublish');
		if (unpublishItem && !unpublishItem.disabled && !shouldHidePublishButton.value) {
			void onDropdownMenuSelect('unpublish');
		}
	}
};

onMounted(() => {
	nodeViewEventBus.on('publishWorkflow', onPublishButtonClick);
	nodeViewEventBus.on('unpublishWorkflow', onUnpublishWorkflow);
	document.addEventListener('keydown', handleKeyboardShortcut);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('publishWorkflow', onPublishButtonClick);
	nodeViewEventBus.off('unpublishWorkflow', onUnpublishWorkflow);
	document.removeEventListener('keydown', handleKeyboardShortcut);
});

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<CollaborationPane v-if="!isNewWorkflow" />
		<div v-if="!shouldHidePublishButton" :class="$style.publishButtonWrapper">
			<div :class="$style.splitButton">
				<N8nTooltip :disabled="workflowPublishState === 'not-published-eligible'" :show-after="500">
					<template #content>
						<div>
							<template v-if="publishButtonConfig.tooltip">
								{{ publishButtonConfig.tooltip }} <br />
							</template>
							<template v-if="activeVersion && publishButtonConfig.showVersionInfo">
								<span data-test-id="workflow-active-version-indicator">{{ activeVersionName }}</span
								><br />{{ i18n.baseText('workflowHistory.item.active') }}
								<TimeAgo v-if="latestPublishDate" :date="latestPublishDate" />
							</template>
						</div>
					</template>
					<N8nButton
						:loading="autoSaveForPublish"
						:disabled="!publishButtonConfig.enabled || readOnlyForPublish"
						:class="$style.publish"
						type="secondary"
						size="medium"
						data-test-id="workflow-publish-button"
						@click="onPublishButtonClick"
					>
						<div :class="[$style.flex]">
							<span
								v-if="publishButtonConfig.showIndicator"
								:class="[
									$style.indicatorDot,
									publishButtonConfig.indicatorClass === 'published' && $style.indicatorPublished,
									publishButtonConfig.indicatorClass === 'changes' && $style.indicatorChanges,
									publishButtonConfig.indicatorClass === 'error' && $style.indicatorIssues,
								]"
							/>
							<span
								:class="[
									workflowPublishState === 'published-no-changes' && $style.indicatorPublishedText,
								]"
							>
								{{ publishButtonConfig.text }}
							</span>
						</div>
					</N8nButton>
				</N8nTooltip>
				<N8nDropdownMenu
					v-model="dropdownOpen"
					:items="dropdownMenuItems"
					:loading="autoSaveForPublish"
					placement="bottom"
					:teleported="true"
					:extra-popper-class="$style.publishDropdown"
					data-test-id="workflow-publish-dropdown"
					@select="onDropdownMenuSelect"
				>
					<template #trigger>
						<N8nIconButton
							icon="chevron-down"
							:disabled="readOnlyForPublish"
							:class="$style.dropdownButton"
							type="secondary"
							icon-size="large"
							aria-label="Open publish actions menu"
							data-test-id="workflow-publish-dropdown-button"
						/>
					</template>
					<template #item-trailing="{ item }">
						<span v-if="getShortcutForItem(item.id)" :class="$style.shortcut">
							{{ getShortcutForItem(item.id) }}
						</span>
					</template>
				</N8nDropdownMenu>
			</div>
		</div>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
		<ActionsDropdownMenu
			:id="id"
			ref="actionsMenu"
			:workflow-permissions="workflowPermissions"
			:is-new-workflow="isNewWorkflow"
			:read-only="props.readOnly"
			:is-archived="isArchived"
			:name="name"
			:tags="tags"
			:current-folder="currentFolder"
			:meta="meta"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.activeVersionIndicator {
	display: inline-flex;
	align-items: center;

	.icon:focus {
		outline: none;
	}
}

.publishButtonWrapper {
	position: relative;
	display: inline-block;
}

.indicatorDot {
	height: var(--spacing--2xs);
	width: var(--spacing--2xs);
	border-radius: 50%;
	display: inline-block;
	margin-right: var(--spacing--2xs);
}

.indicatorPublished {
	background-color: var(--color--mint-600);
}

.indicatorPublishedText {
	color: var(--color--text--tint-1);
}

.indicatorChanges {
	background-color: var(--color--yellow-500);
}

.indicatorIssues {
	background-color: var(--color--red-600);
}

.flex {
	display: flex;
	align-items: center;
}

.publishDropdown {
	z-index: 9999;
}

.shortcut {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	margin-left: var(--spacing--xs);
}

.publish,
.publish:disabled,
.publish:hover:disabled {
	border-bottom-right-radius: 0;
	border-top-right-radius: 0;
	border-right-color: transparent;
}

.publish:hover {
	border-right-color: inherit;
}

.dropdownButton {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.splitButton {
	display: inline-flex;
}

.splitButton:has(.publish:not(:disabled):hover) .dropdownButton {
	border-left-color: transparent;
}
</style>
