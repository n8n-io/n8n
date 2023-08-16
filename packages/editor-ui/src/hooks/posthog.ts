import { usePostHog } from '@/stores/posthog.store';
import {
	hooksGetPosthogAppendNoCaptureClasses,
	hooksPosthogLog,
	hooksPosthogSetMetadata,
} from '@/hooks/posthog/index';
import type { ExternalHooks } from '@/mixins/externalHooks';
import type { PartialDeep } from 'type-fest';

const postHogUserNodesPanelSession = {
	sessionId: '',
	data: {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	},
};

function resetNodesPanelSession() {
	postHogUserNodesPanelSession.sessionId = `nodes_panel_session_${new Date().valueOf()}`;
	postHogUserNodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
}

export const n8nPosthogHooks: PartialDeep<ExternalHooks> = {
	copyInput: {
		mounted: [
			(meta: { copyInputValueRef: HTMLElement }) => {
				hooksPosthogLog('copyInput.mounted');

				const { value } = meta.copyInputValueRef.classList;
				meta.copyInputValueRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	userInfo: {
		mounted: [
			(meta: { userInfoRef: HTMLElement }) => {
				hooksPosthogLog('userInfo.mounted');

				const { value } = meta.userInfoRef.classList;
				meta.userInfoRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	mainSidebar: {
		mounted: [
			(meta) => {
				hooksPosthogLog('mainSidebar.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	settingsPersonalView: {
		mounted: [
			(meta) => {
				hooksPosthogLog('settingsPersonalView.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	workflowOpen: {
		mounted: [
			(meta) => {
				hooksPosthogLog('workflowOpen.mounted');

				// workflow names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.name')) {
					item.classList.value = hooksGetPosthogAppendNoCaptureClasses(item.classList.value);
				}
			},
		],
	},

	credentialsList: {
		mounted: [
			(meta) => {
				hooksPosthogLog('credentialsList.mounted');

				// credential names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.el-table_1_column_1 > .cell')) {
					item.classList.value = hooksGetPosthogAppendNoCaptureClasses(item.classList.value);
				}
			},
		],
	},

	sticky: {
		mounted: [
			(meta) => {
				hooksPosthogLog('sticky.mounted');

				meta.stickyRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(
					meta.stickyRef.classList.value,
				);
			},
		],
	},

	executionsList: {
		created: [
			(meta) => {
				hooksPosthogLog('executionsList.created');

				const { filtersRef, tableRef } = meta;

				// workflow names in filters dropdown
				for (const item of filtersRef.querySelectorAll('li')) {
					item.classList.value = hooksGetPosthogAppendNoCaptureClasses(item.classList.value);
				}

				// workflow names in table body
				const tableBody = tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.workflow-name')) {
					item.classList.value = hooksGetPosthogAppendNoCaptureClasses(item.classList.value);
				}
			},
		],
	},

	runData: {
		updated: [
			(meta) => {
				hooksPosthogLog('runData.updated');

				for (const element of meta.elements) {
					element.classList.value = hooksGetPosthogAppendNoCaptureClasses(element.classList.value);
				}
			},
		],
		onTogglePinData: [
			(meta) => {
				hooksPosthogLog('runData.onTogglePinData');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked pin data icon',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		onDataPinningSuccess: [
			(meta) => {
				hooksPosthogLog('runData.onDataPinningSuccess');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'Ndv data pinning success',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	nodeView: {
		/**
		 * This hook is used only for calling `resetNodesPanelSession()`,
		 * to set `sessionId` needed by `nodeView.addNodeButton`.
		 */
		createNodeActiveChanged: [
			() => {
				hooksPosthogLog('nodeView.createNodeActiveChanged');

				resetNodesPanelSession();
			},
		],

		onRunNode: [
			(meta) => {
				hooksPosthogLog('nodeView.onRunNode');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		addNodeButton: [
			(meta) => {
				hooksPosthogLog('nodeView.addNodeButton');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User added node to workflow canvas',
					properties: {
						node_type: meta.nodeTypeName,
						nodes_panel_session_id: postHogUserNodesPanelSession.sessionId,
					},
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		onRunWorkflow: [
			(meta) => {
				hooksPosthogLog('nodeView.onRunWorkflow');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked execute workflow button',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	credentialsSelectModal: {
		openCredentialType: [
			(meta) => {
				hooksPosthogLog('credentialsSelectModal.openCredentialType');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User opened Credential modal',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	nodeExecuteButton: {
		onClick: [
			(meta) => {
				hooksPosthogLog('nodeExecuteButton.onClick');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	credentialEdit: {
		saveCredential: [
			(meta) => {
				hooksPosthogLog('credentialEdit.saveCredential');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User saved credentials',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	variableSelectorItem: {
		mounted: [
			(meta) => {
				hooksPosthogLog('variableSelectorItem.mounted');

				const { value } = meta.variableSelectorItemRef.classList;

				meta.variableSelectorItemRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	expressionEdit: {
		closeDialog: [
			(meta) => {
				hooksPosthogLog('expressionEdit.closeDialog');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User closed Expression Editor',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		mounted: [
			(meta) => {
				hooksPosthogLog('expressionEdit.mounted');

				meta.expressionInputRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(
					meta.expressionInputRef.classList.value,
				);
				meta.expressionOutputRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(
					meta.expressionOutputRef.classList.value,
				);
			},
		],
	},

	parameterInput: {
		modeSwitch: [
			(meta) => {
				hooksPosthogLog('parameterInput.modeSwitch');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User switched parameter mode',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
		updated: [
			(meta) => {
				hooksPosthogLog('parameterInput.updated');

				for (const option of meta.remoteParameterOptions) {
					option.classList.value = hooksGetPosthogAppendNoCaptureClasses(option.classList.value);
				}
			},
		],
	},

	personalizationModal: {
		onSubmit: [
			(meta) => {
				hooksPosthogLog('personalizationModal.onSubmit');

				hooksPosthogSetMetadata(meta, 'user');
			},
		],
	},

	telemetry: {
		currentUserIdChanged: [
			() => {
				hooksPosthogLog('telemetry.currentUserIdChanged');

				const posthogStore = usePostHog();

				posthogStore.identify();
			},
		],
	},

	workflowActivate: {
		updateWorkflowActivation: [
			(meta) => {
				hooksPosthogLog('workflowActivate.updateWorkflowActivation');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User set workflow active status',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	templatesWorkflowView: {
		openWorkflow: [
			(meta) => {
				hooksPosthogLog('templatesWorkflowView.openWorkflow');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User inserted workflow template',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	templatesCollectionView: {
		onUseWorkflow: [
			(meta) => {
				hooksPosthogLog('templatesCollectionView.onUseWorkflow');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User inserted workflow template',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},

	runDataTable: {
		onDragEnd: [
			(meta) => {
				hooksPosthogLog('runDataTable.onDragEnd');

				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User dragged data for mapping',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
};
