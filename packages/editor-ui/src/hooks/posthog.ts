// version 0.1.0

import {
	hooksPosthogAppendNoCapture,
	hooksPosthogIdentify,
	HooksPosthogIdentifyMetadata,
	hooksPosthogLog,
	hooksPosthogSetMetadata,
	hooksPosthogTrack,
} from '@/hooks/posthog/index';
import { ComponentPublicInstance } from 'vue';
import { ITelemetryTrackProperties } from 'n8n-workflow';
import { IPersonalizationLatestVersion } from '@/Interface';

window.featureFlag = {
	/**
	 * @returns string[]
	 */
	getAll() {
		return window.posthog.feature_flags.getFlags();
	},

	/**
	 * @returns boolean | undefined
	 */
	get(flagName: string) {
		return window.posthog.getFeatureFlag(flagName);
	},

	/**
	 * By default, this function will send a `$feature_flag_called` event
	 * to your instance every time it's called so you're able to do analytics.
	 * You can disable this by passing `{ send_event: false }` as second arg.
	 *
	 * https://posthog.com/docs/integrate/client/js
	 *
	 * @returns boolean | undefined
	 */
	isEnabled(flagName: string): boolean | undefined {
		// PostHog's `isFeatureEnabled` misleadingly returns `false`
		// for non-existent flag, so ensure `undefined`
		if (this.get(flagName) === undefined) return undefined;

		return window.posthog.isFeatureEnabled(flagName);
	},

	reload() {
		window.posthog.reloadFeatureFlags();
	},
};

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

export const n8nPosthogHooks = {
	copyInput: {
		mounted: [
			(meta: { copyInputValueRef: HTMLElement }) => {
				hooksPosthogLog('copyInput.mounted');

				const { value } = meta.copyInputValueRef.classList;
				meta.copyInputValueRef.classList.value = hooksPosthogAppendNoCapture(value);
			},
		],
	},

	userInfo: {
		mounted: [
			(meta: { userInfoRef: HTMLElement }) => {
				hooksPosthogLog('userInfo.mounted');

				const { value } = meta.userInfoRef.classList;
				meta.userInfoRef.classList.value = hooksPosthogAppendNoCapture(value);
			},
		],
	},

	mainSidebar: {
		mounted: [
			(meta: { userRef: HTMLElement }) => {
				hooksPosthogLog('mainSidebar.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksPosthogAppendNoCapture(value);
			},
		],
	},

	settingsPersonalView: {
		mounted: [
			(meta: { userRef: HTMLElement }) => {
				hooksPosthogLog('settingsPersonalView.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksPosthogAppendNoCapture(value);
			},
		],
	},

	workflowOpen: {
		mounted: [
			(meta: { tableRef: ComponentPublicInstance }) => {
				hooksPosthogLog('workflowOpen.mounted');

				// workflow names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.name')) {
					item.classList.value = hooksPosthogAppendNoCapture(item.classList.value);
				}
			},
		],
	},

	credentialsList: {
		mounted: [
			(meta: { tableRef: ComponentPublicInstance }) => {
				alert('yas');
				hooksPosthogLog('credentialsList.mounted');

				// credential names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.el-table_1_column_1 > .cell')) {
					item.classList.value = hooksPosthogAppendNoCapture(item.classList.value);
				}
			},
		],
	},

	sticky: {
		mounted: [
			(meta: { stickyRef: HTMLElement }) => {
				hooksPosthogLog('sticky.mounted');

				meta.stickyRef.classList.value = hooksPosthogAppendNoCapture(
					meta.stickyRef.classList.value,
				);
			},
		],
	},

	executionsList: {
		created: [
			(meta: { filtersRef: HTMLElement; tableRef: ComponentPublicInstance }) => {
				hooksPosthogLog('executionsList.created');

				const { filtersRef, tableRef } = meta;

				// workflow names in filters dropdown
				for (const item of filtersRef.querySelectorAll('li')) {
					item.classList.value = hooksPosthogAppendNoCapture(item.classList.value);
				}

				// workflow names in table body
				const tableBody = tableRef.$refs.bodyWrapper as HTMLElement;
				for (const item of tableBody.querySelectorAll('.workflow-name')) {
					item.classList.value = hooksPosthogAppendNoCapture(item.classList.value);
				}
			},
		],
	},

	runData: {
		updated: [
			(meta: { elements: HTMLElement[] }) => {
				hooksPosthogLog('runData.updated');

				for (const element of meta.elements) {
					element.classList.value = hooksPosthogAppendNoCapture(element.classList.value);
				}
			},
		],
		onTogglePinData: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('runData.onTogglePinData');

				const eventData = {
					eventName: 'User clicked pin data icon',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],

		onDataPinningSuccess: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('runData.onDataPinningSuccess');

				const eventData = {
					eventName: 'Ndv data pinning success',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
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
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('nodeView.onRunNode');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],

		addNodeButton: [
			(meta: { nodeTypeName: string }) => {
				hooksPosthogLog('nodeView.addNodeButton');

				const eventData = {
					eventName: 'User added node to workflow canvas',
					properties: {
						node_type: meta.nodeTypeName,
						nodes_panel_session_id: postHogUserNodesPanelSession.sessionId,
					},
				};

				hooksPosthogTrack(eventData);
			},
		],

		onRunWorkflow: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('nodeView.onRunWorkflow');

				const eventData = {
					eventName: 'User clicked execute workflow button',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	credentialsSelectModal: {
		openCredentialType: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('credentialsSelectModal.openCredentialType');

				const eventData = {
					eventName: 'User opened Credential modal',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	nodeExecuteButton: {
		onClick: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('nodeExecuteButton.onClick');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	credentialEdit: {
		saveCredential: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('credentialEdit.saveCredential');

				const eventData = {
					eventName: 'User saved credentials',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	variableSelectorItem: {
		mounted: [
			(meta: { variableSelectorItemRef: HTMLElement }) => {
				hooksPosthogLog('variableSelectorItem.mounted');

				const { value } = meta.variableSelectorItemRef.classList;

				meta.variableSelectorItemRef.classList.value = hooksPosthogAppendNoCapture(value);
			},
		],
	},

	expressionEdit: {
		closeDialog: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('expressionEdit.closeDialog');

				const eventData = {
					eventName: 'User closed Expression Editor',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],

		mounted: [
			(meta: { expressionInputRef: HTMLElement; expressionOutputRef: HTMLElement }) => {
				hooksPosthogLog('expressionEdit.mounted');

				meta.expressionInputRef.classList.value = hooksPosthogAppendNoCapture(
					meta.expressionInputRef.classList.value,
				);
				meta.expressionOutputRef.classList.value = hooksPosthogAppendNoCapture(
					meta.expressionOutputRef.classList.value,
				);
			},
		],
	},

	parameterInput: {
		modeSwitch: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('parameterInput.modeSwitch');

				const eventData = {
					eventName: 'User switched parameter mode',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
		updated: [
			(meta: { remoteParameterOptions: HTMLElement[] }) => {
				hooksPosthogLog('parameterInput.updated');

				for (const option of meta.remoteParameterOptions) {
					option.classList.value = hooksPosthogAppendNoCapture(option.classList.value);
				}
			},
		],
	},

	personalizationModal: {
		onSubmit: [
			(meta: IPersonalizationLatestVersion) => {
				hooksPosthogLog('personalizationModal.onSubmit');

				hooksPosthogSetMetadata(meta, 'user');
			},
		],
	},

	telemetry: {
		currentUserIdChanged: [
			(meta: HooksPosthogIdentifyMetadata) => {
				hooksPosthogLog('telemetry.currentUserIdChanged');

				hooksPosthogIdentify(meta);
			},
		],
	},

	workflowActivate: {
		updateWorkflowActivation: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('workflowActivate.updateWorkflowActivation');

				const eventData = {
					eventName: 'User set workflow active status',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	templatesWorkflowView: {
		openWorkflow: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('templatesWorkflowView.openWorkflow');

				const eventData = {
					eventName: 'User inserted workflow template',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	templatesCollectionView: {
		onUseWorkflow: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('templatesCollectionView.onUseWorkflow');

				const eventData = {
					eventName: 'User inserted workflow template',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},

	runDataTable: {
		onDragEnd: [
			(meta: ITelemetryTrackProperties) => {
				hooksPosthogLog('runDataTable.onDragEnd');

				const eventData = {
					eventName: 'User dragged data for mapping',
					properties: meta,
				};

				hooksPosthogTrack(eventData);
			},
		],
	},
};
