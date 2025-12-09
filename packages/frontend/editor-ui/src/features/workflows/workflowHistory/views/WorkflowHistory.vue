<script setup lang="ts">
import { onBeforeMount, ref, watchEffect, computed, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IWorkflowDb, UserAction } from '@/Interface';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import {
	VIEWS,
	WORKFLOW_HISTORY_VERSION_RESTORE,
	WORKFLOW_HISTORY_VERSION_UNPUBLISH,
	WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
} from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import type {
	WorkflowHistoryActionTypes,
	WorkflowVersionId,
	WorkflowHistoryRequestParams,
	WorkflowHistory,
	WorkflowVersion,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowHistoryList from '../components/WorkflowHistoryList.vue';
import WorkflowHistoryContent from '../components/WorkflowHistoryContent.vue';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { telemetry } from '@/app/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { getResourcePermissions } from '@n8n/permissions';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import type { IUser } from 'n8n-workflow';

import { N8nBadge, N8nButton, N8nHeading } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import type { WorkflowHistoryVersionUnpublishModalEventBusEvents } from '../components/WorkflowHistoryVersionUnpublishModal.vue';
import type { WorkflowHistoryPublishModalEventBusEvents } from '../components/WorkflowHistoryPublishModal.vue';
import { IS_DRAFT_PUBLISH_ENABLED } from '@/app/constants';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

type WorkflowHistoryActionRecord = {
	[K in Uppercase<WorkflowHistoryActionTypes[number]>]: Lowercase<K>;
};

const enum WorkflowHistoryVersionRestoreModalActions {
	restore = 'restore',
	deactivateAndRestore = 'deactivateAndRestore',
	cancel = 'cancel',
}

const workflowHistoryActionTypes: WorkflowHistoryActionTypes = [
	'restore',
	'publish',
	'unpublish',
	'clone',
	'open',
	'download',
];
const WORKFLOW_HISTORY_ACTIONS = workflowHistoryActionTypes.reduce(
	(record, key) => ({ ...record, [key.toUpperCase()]: key }),
	{} as WorkflowHistoryActionRecord,
);

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const pageRedirectionHelper = usePageRedirectionHelper();
const workflowHistoryStore = useWorkflowHistoryStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowActivate = useWorkflowActivate();
const canRender = ref(true);
const isListLoading = ref(true);
const requestNumberOfItems = ref(20);
const lastReceivedItemsLength = ref(0);
const activeWorkflow = ref<IWorkflowDb | null>(null);
const workflowHistory = ref<WorkflowHistory[]>([]);
const selectedWorkflowVersion = ref<WorkflowVersion | null>(null);

const workflowId = computed(() => normalizeSingleRouteParam('workflowId'));
const versionId = computed(() => normalizeSingleRouteParam('versionId'));
const editorRoute = computed(() => ({
	name: VIEWS.WORKFLOW,
	params: {
		name: workflowId.value,
	},
}));
const workflowPermissions = computed(
	() => getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow,
);

const workflowActiveVersionId = computed(() => {
	return workflowsStore.getWorkflowById(workflowId.value)?.activeVersion?.versionId;
});

const isDraftPublishEnabled = IS_DRAFT_PUBLISH_ENABLED;

const actions = computed<Array<UserAction<IUser>>>(() =>
	workflowHistoryActionTypes
		.filter((value) => !(value === 'publish' && activeWorkflow.value?.isArchived))
		.map((value) => ({
			label: i18n.baseText(`workflowHistory.item.actions.${value}`),
			disabled:
				(value === 'clone' && !workflowPermissions.value.create) ||
				(value === 'restore' && !workflowPermissions.value.update) ||
				((value === 'publish' || value === 'unpublish') && !workflowPermissions.value.update),
			value,
		})),
);

const isFirstItemShown = computed(() => workflowHistory.value[0]?.versionId === versionId.value);
const evaluatedPruneDays = computed(() => Math.floor(workflowHistoryStore.evaluatedPruneTime / 24));

const sendTelemetry = (event: string) => {
	telemetry.track(event, {
		instance_id: useRootStore().instanceId,
		workflow_id: workflowId.value,
	});
};

const loadMore = async (queryParams: WorkflowHistoryRequestParams) => {
	const history = await workflowHistoryStore.getWorkflowHistory(workflowId.value, queryParams);
	lastReceivedItemsLength.value = history.length;
	workflowHistory.value = workflowHistory.value.concat(history);
};

onBeforeMount(async () => {
	sendTelemetry('User opened workflow history');
	try {
		const [workflow] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId.value),
			loadMore({ take: requestNumberOfItems.value }),
		]);
		activeWorkflow.value = workflow;
		isListLoading.value = false;

		if (!versionId.value && workflowHistory.value.length) {
			await router.replace({
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowId.value,
					versionId: workflowHistory.value[0].versionId,
				},
			});
		}
	} catch (error) {
		canRender.value = false;
		toast.showError(error, i18n.baseText('workflowHistory.title'));
	}
});

const normalizeSingleRouteParam = (name: string): string => {
	const param = route.params[name];
	if (typeof param === 'string') return param;
	return param?.[0] ?? '';
};

const openInNewTab = (id: WorkflowVersionId) => {
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: workflowId.value,
			versionId: id,
		},
	});
	window.open(href, '_blank');
};

const openRestorationModal = async (
	isWorkflowActivated: boolean,
	formattedCreatedAt: string,
): Promise<WorkflowHistoryVersionRestoreModalActions> => {
	return await new Promise((resolve, reject) => {
		const buttons = [
			{
				text: i18n.baseText('workflowHistory.action.restore.modal.button.cancel'),
				type: 'tertiary',
				action: () => {
					resolve(WorkflowHistoryVersionRestoreModalActions.cancel);
				},
			},
		];

		if (isWorkflowActivated && !isDraftPublishEnabled) {
			buttons.push({
				text: i18n.baseText('workflowHistory.action.restore.modal.button.deactivateAndRestore'),
				type: 'tertiary',
				action: () => {
					resolve(WorkflowHistoryVersionRestoreModalActions.deactivateAndRestore);
				},
			});
		}

		buttons.push({
			text: i18n.baseText('workflowHistory.action.restore.modal.button.restore'),
			type: 'primary',
			action: () => {
				resolve(WorkflowHistoryVersionRestoreModalActions.restore);
			},
		});

		try {
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_VERSION_RESTORE,
				data: {
					beforeClose: () => {
						resolve(WorkflowHistoryVersionRestoreModalActions.cancel);
					},
					isWorkflowActivated,
					formattedCreatedAt,
					buttons,
				},
			});
		} catch (error) {
			reject(error);
		}
	});
};

const cloneWorkflowVersion = async (
	id: WorkflowVersionId,
	data: { formattedCreatedAt: string },
) => {
	const clonedWorkflow = await workflowHistoryStore.cloneIntoNewWorkflow(
		workflowId.value,
		id,
		data,
	);
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW,
		params: {
			name: clonedWorkflow.id,
		},
	});

	toast.showMessage({
		title: i18n.baseText('workflowHistory.action.clone.success.title'),
		message: h(
			'a',
			{ href, target: '_blank' },
			i18n.baseText('workflowHistory.action.clone.success.message'),
		),
		type: 'success',
		duration: 10000,
	});
};

const restoreWorkflowVersion = async (
	id: WorkflowVersionId,
	data: { formattedCreatedAt: string },
) => {
	const workflow = await workflowsStore.fetchWorkflow(workflowId.value);
	let deactivateAndRestore = false;

	if (!isDraftPublishEnabled) {
		const modalAction = await openRestorationModal(workflow.active, data.formattedCreatedAt);
		if (modalAction === WorkflowHistoryVersionRestoreModalActions.cancel) {
			return;
		}
		deactivateAndRestore =
			modalAction === WorkflowHistoryVersionRestoreModalActions.deactivateAndRestore;
	}

	const versionIdBeforeRestore = workflow.versionId;
	activeWorkflow.value = await workflowHistoryStore.restoreWorkflow(
		workflowId.value,
		id,
		deactivateAndRestore,
	);

	if (activeWorkflow.value.versionId === versionIdBeforeRestore) {
		toast.showMessage({
			title: i18n.baseText('workflowHistory.action.restore.alreadyRestored'),
			type: 'info',
		});
		return;
	}

	if (workflowId.value === workflowsStore.workflowId && activeWorkflow.value.checksum) {
		workflowsStore.setWorkflowChecksum(activeWorkflow.value.checksum);
	}

	const history = await workflowHistoryStore.getWorkflowHistory(workflowId.value, {
		take: 1,
	});
	workflowHistory.value = history.concat(workflowHistory.value);
	toast.showMessage({
		title: i18n.baseText('workflowHistory.action.restore.success.title'),
		type: 'success',
	});
};

const publishWorkflowVersion = (id: WorkflowVersionId, data: WorkflowHistoryAction['data']) => {
	const publishEventBus = createEventBus<WorkflowHistoryPublishModalEventBusEvents>();

	publishEventBus.once('publish', (publishData) => {
		// Refresh the active workflow to get the updated activeVersion with workflowPublishHistory
		activeWorkflow.value = workflowsStore.getWorkflowById(workflowId.value);

		// Update the history list with the new name, description, and workflowPublishHistory
		const historyItem = workflowHistory.value.find(
			(item) => item.versionId === publishData.versionId,
		);
		if (historyItem) {
			historyItem.name = publishData.name;
			historyItem.description = publishData.description;
			// Update workflowPublishHistory from the store's activeVersion
			if (activeWorkflow.value?.activeVersion?.workflowPublishHistory) {
				historyItem.workflowPublishHistory =
					activeWorkflow.value.activeVersion.workflowPublishHistory;
			}
		}

		// Refresh the selected workflow version if it's the one that was published
		if (selectedWorkflowVersion.value?.versionId === publishData.versionId) {
			selectedWorkflowVersion.value = {
				...selectedWorkflowVersion.value,
				name: publishData.name,
				description: publishData.description,
				workflowPublishHistory:
					activeWorkflow.value?.activeVersion?.workflowPublishHistory ??
					selectedWorkflowVersion.value.workflowPublishHistory,
			};
		}

		sendTelemetry('User published version from history');
	});

	uiStore.openModalWithData({
		name: WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
		data: {
			versionId: id,
			workflowId: workflowId.value,
			formattedCreatedAt: data.formattedCreatedAt,
			versionName: data.versionName,
			description: data.description,
			eventBus: publishEventBus,
		},
	});
};

const unpublishWorkflowVersion = (id: WorkflowVersionId, data: WorkflowHistoryAction['data']) => {
	if (workflowActiveVersionId.value !== id) {
		return;
	}

	const unpublishEventBus = createEventBus<WorkflowHistoryVersionUnpublishModalEventBusEvents>();

	unpublishEventBus.once('unpublish', async () => {
		const success = await workflowActivate.unpublishWorkflowFromHistory(workflowId.value);
		uiStore.closeModal(WORKFLOW_HISTORY_VERSION_UNPUBLISH);

		if (!success) {
			return;
		}

		activeWorkflow.value = workflowsStore.getWorkflowById(workflowId.value);

		toast.showMessage({
			title: i18n.baseText('workflowHistory.action.unpublish.success.title'),
			type: 'success',
		});

		sendTelemetry('User unpublished workflow from history');
	});

	uiStore.openModalWithData({
		name: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
		data: {
			versionName: data.versionName,
			eventBus: unpublishEventBus,
		},
	});
};

const onAction = async ({ action, id, data }: WorkflowHistoryAction) => {
	try {
		switch (action) {
			case WORKFLOW_HISTORY_ACTIONS.OPEN:
				openInNewTab(id);
				sendTelemetry('User opened version in new tab');
				break;
			case WORKFLOW_HISTORY_ACTIONS.DOWNLOAD:
				await workflowHistoryStore.downloadVersion(workflowId.value, id, data);
				sendTelemetry('User downloaded version');
				break;
			case WORKFLOW_HISTORY_ACTIONS.CLONE:
				await cloneWorkflowVersion(id, data);
				sendTelemetry('User cloned version');
				break;
			case WORKFLOW_HISTORY_ACTIONS.RESTORE:
				await restoreWorkflowVersion(id, data);
				sendTelemetry('User restored version');
				break;
			case WORKFLOW_HISTORY_ACTIONS.PUBLISH:
				publishWorkflowVersion(id, data);
				break;
			case WORKFLOW_HISTORY_ACTIONS.UNPUBLISH:
				unpublishWorkflowVersion(id, data);
				break;
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('workflowHistory.action.error.title', {
				interpolate: {
					action: i18n.baseText(`workflowHistory.item.actions.${action}`).toLowerCase(),
				},
			}),
		);
	}
};

const onPreview = async ({ event, id }: { event: MouseEvent; id: WorkflowVersionId }) => {
	if (event.metaKey || event.ctrlKey) {
		openInNewTab(id);
		sendTelemetry('User opened version in new tab');
	} else {
		await router.push({
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: workflowId.value,
				versionId: id,
			},
		});
	}
};

const onUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('workflow-history', 'upgrade-workflow-history');
};

watchEffect(async () => {
	if (!versionId.value) {
		return;
	}

	try {
		// Fetch both in parallel and update atomically to prevent double-render flicker
		const [workflowVersion, workflow] = await Promise.all([
			workflowHistoryStore.getWorkflowVersion(workflowId.value, versionId.value),
			workflowsStore.fetchWorkflow(workflowId.value),
		]);

		// Single atomic update - prevents double render of workflow preview
		selectedWorkflowVersion.value = workflowVersion;
		activeWorkflow.value = workflow;

		sendTelemetry('User selected version');
	} catch (error) {
		// Handle workflow version fetch error
		if (error.message?.includes('version')) {
			toast.showError(
				new Error(`${error.message} "${versionId.value}"&nbsp;`),
				i18n.baseText('workflowHistory.title'),
			);
		} else {
			// Handle workflow fetch error
			canRender.value = false;
			toast.showError(error, i18n.baseText('workflowHistory.title'));
		}
	}
});
</script>
<template>
	<div :class="$style.view">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="medium">
				{{ activeWorkflow?.name }}
			</N8nHeading>
			<span v-if="activeWorkflow?.isArchived">
				<N8nBadge class="ml-s" theme="tertiary" bold data-test-id="workflow-archived-tag">
					{{ i18n.baseText('workflows.item.archived') }}
				</N8nBadge>
			</span>
		</div>
		<div :class="$style.corner">
			<N8nHeading tag="h2" size="medium" bold>
				{{ i18n.baseText('workflowHistory.title') }}
			</N8nHeading>
			<RouterLink :to="editorRoute" data-test-id="workflow-history-close-button">
				<N8nButton type="tertiary" icon="x" size="small" text square />
			</RouterLink>
		</div>
		<div :class="$style.listComponentWrapper">
			<WorkflowHistoryList
				v-if="canRender"
				:items="workflowHistory"
				:last-received-items-length="lastReceivedItemsLength"
				:selected-item="selectedWorkflowVersion"
				:actions="actions"
				:request-number-of-items="requestNumberOfItems"
				:should-upgrade="workflowHistoryStore.shouldUpgrade"
				:evaluated-prune-days="evaluatedPruneDays"
				:is-list-loading="isListLoading"
				:active-version-id="workflowActiveVersionId"
				@action="onAction"
				@preview="onPreview"
				@load-more="loadMore"
				@upgrade="onUpgrade"
			/>
		</div>
		<div :class="$style.contentComponentWrapper">
			<WorkflowHistoryContent
				v-if="canRender"
				:workflow="activeWorkflow"
				:workflow-version="selectedWorkflowVersion"
				:is-version-active="selectedWorkflowVersion?.versionId === workflowActiveVersionId"
				:actions="actions"
				:is-list-loading="isListLoading"
				:is-first-item-shown="isFirstItemShown"
				@action="onAction"
			/>
		</div>
	</div>
</template>
<style module lang="scss">
.view {
	position: relative;
	display: grid;
	width: 100%;
	grid-template-areas: 'header corner' 'content list';
	grid-template-columns: auto 330px;
	grid-template-rows: 65px auto;
	background-color: var(--color--background--light-3);
}

.header {
	grid-area: header;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--lg);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.corner {
	grid-area: corner;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--3xs) 0 var(--spacing--sm);
	background-color: var(--color--background--light-2er);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
}

.contentComponentWrapper {
	grid-area: content;
	position: relative;
}

.listComponentWrapper {
	grid-area: list;
	position: relative;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
