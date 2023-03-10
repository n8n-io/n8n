// version 0.1.0

import { usePostHog } from '@/stores/posthog';
import {
	hooksGetPosthogAppendNoCaptureClasses,
	hooksPosthogSetMetadata,
} from '@/hooks/posthog/index';
import { ComponentPublicInstance } from 'vue';
import { ITelemetryTrackProperties } from 'n8n-workflow';
import { IPersonalizationLatestVersion } from '@/Interface';
import { ExternalHooks } from '@/mixins/externalHooks';
import { PartialDeep } from 'type-fest';

window.featureFlag = {
	/**
	 * @returns string[]
	 */
	getAll() {
		return window.posthog?.feature_flags?.getFlags();
	},

	/**
	 * @returns boolean | undefined
	 */
	get(flagName: string) {
		return window.posthog?.getFeatureFlag?.(flagName);
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

		return window.posthog?.isFeatureEnabled?.(flagName);
	},

	reload() {
		window.posthog?.reloadFeatureFlags?.();
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

export const n8nPosthogHooks: PartialDeep<ExternalHooks> = {
	copyInput: {
		mounted: [
			(meta: { copyInputValueRef: HTMLElement }) => {
				const { value } = meta.copyInputValueRef.classList;
				meta.copyInputValueRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	userInfo: {
		mounted: [
			(meta: { userInfoRef: HTMLElement }) => {
				const { value } = meta.userInfoRef.classList;
				meta.userInfoRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	mainSidebar: {
		mounted: [
			(meta: { userRef: HTMLElement }) => {
				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	settingsPersonalView: {
		mounted: [
			(meta: { userRef: HTMLElement }) => {
				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	workflowOpen: {
		mounted: [
			(meta: { tableRef: ComponentPublicInstance }) => {
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
			(meta: { tableRef: ComponentPublicInstance }) => {
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
			(meta: { stickyRef: HTMLElement }) => {
				meta.stickyRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(
					meta.stickyRef.classList.value,
				);
			},
		],
	},

	executionsList: {
		created: [
			(meta: { filtersRef: HTMLElement; tableRef: ComponentPublicInstance }) => {
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
			(meta: { elements: HTMLElement[] }) => {
				for (const element of meta.elements) {
					element.classList.value = hooksGetPosthogAppendNoCaptureClasses(element.classList.value);
				}
			},
		],
		onTogglePinData: [
			(meta: ITelemetryTrackProperties) => {
				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked pin data icon',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		onDataPinningSuccess: [
			(meta: ITelemetryTrackProperties) => {
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
				resetNodesPanelSession();
			},
		],

		onRunNode: [
			(meta: ITelemetryTrackProperties) => {
				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		addNodeButton: [
			(meta: { nodeTypeName: string }) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: { variableSelectorItemRef: HTMLElement }) => {
				const { value } = meta.variableSelectorItemRef.classList;

				meta.variableSelectorItemRef.classList.value = hooksGetPosthogAppendNoCaptureClasses(value);
			},
		],
	},

	expressionEdit: {
		closeDialog: [
			(meta: ITelemetryTrackProperties) => {
				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User closed Expression Editor',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],

		mounted: [
			(meta: { expressionInputRef: HTMLElement; expressionOutputRef: HTMLElement }) => {
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
			(meta: ITelemetryTrackProperties) => {
				const posthogStore = usePostHog();

				const eventData = {
					eventName: 'User switched parameter mode',
					properties: meta,
				};

				posthogStore.track(eventData.eventName, eventData.properties);
			},
		],
		updated: [
			(meta: { remoteParameterOptions: HTMLElement[] }) => {
				for (const option of meta.remoteParameterOptions) {
					option.classList.value = hooksGetPosthogAppendNoCaptureClasses(option.classList.value);
				}
			},
		],
	},

	personalizationModal: {
		onSubmit: [
			(meta: IPersonalizationLatestVersion) => {
				hooksPosthogSetMetadata(meta, 'user');
			},
		],
	},

	telemetry: {
		currentUserIdChanged: [
			() => {
				const posthogStore = usePostHog();

				posthogStore.identify();
			},
		],
	},

	workflowActivate: {
		updateWorkflowActivation: [
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
			(meta: ITelemetryTrackProperties) => {
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
