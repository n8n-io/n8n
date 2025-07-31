<script setup lang="ts">
import { onBeforeMount, ref, watchEffect, computed, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IWorkflowDb, UserAction } from '@/Interface';
import { VIEWS, WORKFLOW_HISTORY_VERSION_RESTORE } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import type {
	WorkflowHistoryActionTypes,
	WorkflowVersionId,
	WorkflowHistoryRequestParams,
	WorkflowHistory,
	WorkflowVersion,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import WorkflowHistoryContent from '@/components/WorkflowHistory/WorkflowHistoryContent.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { telemetry } from '@/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getResourcePermissions } from '@n8n/permissions';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import type { IUser } from 'n8n-workflow';

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

const canRender = ref(true);
const isListLoading = ref(true);
const requestNumberOfItems = ref(20);
const lastReceivedItemsLength = ref(0);
const activeWorkflow = ref<IWorkflowDb | null>(null);
const workflowHistory = ref<WorkflowHistory[]>([]);
const activeWorkflowVersion = ref<WorkflowVersion | null>(null);

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
const actions = computed<Array<UserAction<IUser>>>(() =>
	workflowHistoryActionTypes.map((value) => ({
		label: i18n.baseText(`workflowHistory.item.actions.${value}`),
		disabled:
			(value === 'clone' && !workflowPermissions.value.create) ||
			(value === 'restore' && !workflowPermissions.value.update),
		value,
	})),
);

const isFirstItemShown = computed(() => workflowHistory.value[0]?.versionId === versionId.value);
const evaluatedPruneTime = computed(() => Math.floor(workflowHistoryStore.evaluatedPruneTime / 24));

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

		if (isWorkflowActivated) {
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
	const modalAction = await openRestorationModal(workflow.active, data.formattedCreatedAt);
	if (modalAction === WorkflowHistoryVersionRestoreModalActions.cancel) {
		return;
	}
	activeWorkflow.value = await workflowHistoryStore.restoreWorkflow(
		workflowId.value,
		id,
		modalAction === WorkflowHistoryVersionRestoreModalActions.deactivateAndRestore,
	);
	const history = await workflowHistoryStore.getWorkflowHistory(workflowId.value, {
		take: 1,
	});
	workflowHistory.value = history.concat(workflowHistory.value);
	toast.showMessage({
		title: i18n.baseText('workflowHistory.action.restore.success.title'),
		type: 'success',
	});
};

const onAction = async ({
	action,
	id,
	data,
}: {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: { formattedCreatedAt: string };
}) => {
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
		activeWorkflowVersion.value = await workflowHistoryStore.getWorkflowVersion(
			workflowId.value,
			versionId.value,
		);
		sendTelemetry('User selected version');
	} catch (error) {
		toast.showError(
			new Error(`${error.message} "${versionId.value}"&nbsp;`),
			i18n.baseText('workflowHistory.title'),
		);
	}

	try {
		activeWorkflow.value = await workflowsStore.fetchWorkflow(workflowId.value);
	} catch (error) {
		canRender.value = false;
		toast.showError(error, i18n.baseText('workflowHistory.title'));
	}
});
</script>
<template>
	<div :class="$style.view">
		<div :class="$style.header">
			<n8n-heading tag="h2" size="medium">
				{{ activeWorkflow?.name }}
			</n8n-heading>
			<span v-if="activeWorkflow?.isArchived">
				<N8nBadge class="ml-s" theme="tertiary" bold data-test-id="workflow-archived-tag">
					{{ i18n.baseText('workflows.item.archived') }}
				</N8nBadge>
			</span>
		</div>
		<div :class="$style.corner">
			<n8n-heading tag="h2" size="medium" bold>
				{{ i18n.baseText('workflowHistory.title') }}
			</n8n-heading>
			<router-link :to="editorRoute" data-test-id="workflow-history-close-button">
				<n8n-button type="tertiary" icon="x" size="small" text square />
			</router-link>
		</div>
		<div :class="$style.listComponentWrapper">
			<WorkflowHistoryList
				v-if="canRender"
				:items="workflowHistory"
				:last-received-items-length="lastReceivedItemsLength"
				:active-item="activeWorkflowVersion"
				:actions="actions"
				:request-number-of-items="requestNumberOfItems"
				:should-upgrade="workflowHistoryStore.shouldUpgrade"
				:evaluated-prune-time="evaluatedPruneTime"
				:is-list-loading="isListLoading"
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
				:workflow-version="activeWorkflowVersion"
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
	background-color: var(--color-background-xlight);
}

.header {
	grid-area: header;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing-l);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.corner {
	grid-area: corner;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing-3xs) 0 var(--spacing-s);
	background-color: var(--color-background-lighter);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.contentComponentWrapper {
	grid-area: content;
	position: relative;
}

.listComponentWrapper {
	grid-area: list;
	position: relative;

	&::before {
		content: '';
		display: block;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: var(--border-width-base);
		background-color: var(--color-foreground-base);
	}
}
</style>
