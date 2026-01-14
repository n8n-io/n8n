<script lang="ts" setup>
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { WORKFLOW_PUBLISH_MODAL_KEY, AutoSaveState } from '@/app/constants';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRouter } from 'vue-router';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import {
	getLastPublishedVersion,
	generateVersionName,
} from '@/features/workflows/workflowHistory/utils';
import { nodeViewEventBus } from '@/app/event-bus';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';
import TimeAgo from '../TimeAgo.vue';

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
		!props.workflowPermissions.update ||
		!props.workflowPermissions.publish
	);
});

const shouldHidePublishButton = computed(() => {
	return props.readOnly || props.isArchived || !props.workflowPermissions.update;
});

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const router = useRouter();

const autosaveStore = useWorkflowAutosaveStore();
const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router });

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
	let saved = false;
	if (autosaveStore.autoSaveState === AutoSaveState.InProgress && autosaveStore.pendingAutoSave) {
		autoSaveForPublish.value = true;
		try {
			await autosaveStore.pendingAutoSave;
			saved = true;
		} catch {
			// Autosave failed, will attempt manual save below
		} finally {
			autoSaveForPublish.value = false;
		}
	} else if (autosaveStore.autoSaveState === AutoSaveState.Scheduled) {
		cancelAutoSave();
	}

	if (!saved || uiStore.stateIsDirty || props.isNewWorkflow) {
		autoSaveForPublish.value = true;
		saved = await saveCurrentWorkflow({}, true);
		autoSaveForPublish.value = false;
	}

	return saved;
};

const onPublishButtonClick = async () => {
	// If there are unsaved changes, save the workflow first
	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		const saved = await saveBeforePublish();
		if (!saved) {
			// If save failed, don't open the modal
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

onMounted(() => {
	nodeViewEventBus.on('publishWorkflow', onPublishButtonClick);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('publishWorkflow', onPublishButtonClick);
});

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<CollaborationPane v-if="!isNewWorkflow" />
		<div v-if="!shouldHidePublishButton" :class="$style.publishButtonWrapper">
			<N8nTooltip
				:disabled="
					workflowPublishState === 'not-published-eligible' && props.workflowPermissions.publish
				"
				:show-after="300"
			>
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
					type="secondary"
					data-test-id="workflow-open-publish-modal-button"
					@click="onPublishButtonClick"
				>
					<div :class="[$style.flex]">
						<span
							v-if="publishButtonConfig.showIndicator"
							:class="{
								[$style.indicatorDot]: true,
								[$style.indicatorPublished]: publishButtonConfig.indicatorClass === 'published',
								[$style.indicatorChanges]: publishButtonConfig.indicatorClass === 'changes',
								[$style.indicatorIssues]: publishButtonConfig.indicatorClass === 'error',
							}"
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
	display: contents;
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
</style>
