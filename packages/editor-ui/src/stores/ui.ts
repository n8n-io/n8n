import {
	applyForOnboardingCall,
	fetchNextOnboardingPrompt,
	submitEmailOnSignup,
} from "@/api/workflow-webhooks";
import {
	ABOUT_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_PACKAGE_MANAGE_ACTIONS,
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	FAKE_DOOR_FEATURES,
	IMPORT_CURL_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	STORES,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	VIEWS,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from "@/constants";
import {
	IExecutionsCurrentSummaryExtended,
	IFakeDoorLocation,
	IMenuItem,
	INodeUi,
	IOnboardingCallPromptResponse,
	IPushDataExecutionFinished,
	IRunDataDisplayMode,
	IUser,
	uiState,
	XYPosition,
} from "@/Interface";
import Vue from "vue";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";

export const useUIStore = defineStore(STORES.UI, {
	state: (): uiState => ({
		activeExecutions: [],
		activeWorkflows: [],
		activeActions: [],
		activeNode: null,
		activeCredentialType: null,
		modals: {
			[ABOUT_MODAL_KEY]: {
				open: false,
			},
			[CHANGE_PASSWORD_MODAL_KEY]: {
				open: false,
			},
			[CONTACT_PROMPT_MODAL_KEY]: {
				open: false,
			},
			[CREDENTIAL_EDIT_MODAL_KEY]: {
				open: false,
				mode: '',
				activeId: null,
			},
			[CREDENTIAL_SELECT_MODAL_KEY]: {
				open: false,
			},
			[DELETE_USER_MODAL_KEY]: {
				open: false,
				activeId: null,
			},
			[DUPLICATE_MODAL_KEY]: {
				open: false,
			},
			[ONBOARDING_CALL_SIGNUP_MODAL_KEY]: {
				open: false,
			},
			[PERSONALIZATION_MODAL_KEY]: {
				open: false,
			},
			[INVITE_USER_MODAL_KEY]: {
				open: false,
			},
			[TAGS_MANAGER_MODAL_KEY]: {
				open: false,
			},
			[VALUE_SURVEY_MODAL_KEY]: {
				open: false,
			},
			[VERSIONS_MODAL_KEY]: {
				open: false,
			},
			[WORKFLOW_SETTINGS_MODAL_KEY]: {
				open: false,
			},
			[EXECUTIONS_MODAL_KEY]: {
				open: false,
			},
			[WORKFLOW_ACTIVE_MODAL_KEY]: {
				open: false,
			},
			[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]: {
				open: false,
			},
			[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: {
				open: false,
				mode: '',
				activeId: null,
			},
			[IMPORT_CURL_MODAL_KEY]: {
				open: false,
				curlCommand: '',
				httpNodeParameters: '',
			},
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
		isPageLoading: true,
		currentView: '',
		ndv: {
			sessionId: '',
			input: {
				displayMode: 'table',
			},
			output: {
				displayMode: 'table',
				editMode: {
					enabled: false,
					value: '',
				},
			},
			focusedMappableInput: '',
			mappingTelemetry: {},
		},
		mainPanelPosition: 0.5,
		fakeDoorFeatures: [
			{
				id: FAKE_DOOR_FEATURES.ENVIRONMENTS,
				featureName: 'fakeDoor.settings.environments.name',
				icon: 'server',
				infoText: 'fakeDoor.settings.environments.infoText',
				actionBoxTitle: 'fakeDoor.settings.environments.actionBox.title',
				actionBoxDescription: 'fakeDoor.settings.environments.actionBox.description',
				linkURL: 'https://n8n-community.typeform.com/to/l7QOrERN#f=environments',
				uiLocations: ['settings'],
			},
			{
				id: FAKE_DOOR_FEATURES.LOGGING,
				featureName: 'fakeDoor.settings.logging.name',
				icon: 'sign-in-alt',
				infoText: 'fakeDoor.settings.logging.infoText',
				actionBoxTitle: 'fakeDoor.settings.logging.actionBox.title',
				actionBoxDescription: 'fakeDoor.settings.logging.actionBox.description',
				linkURL: 'https://n8n-community.typeform.com/to/l7QOrERN#f=logging',
				uiLocations: ['settings'],
			},
			{
				id: FAKE_DOOR_FEATURES.SHARING,
				featureName: 'fakeDoor.credentialEdit.sharing.name',
				actionBoxTitle: 'fakeDoor.credentialEdit.sharing.actionBox.title',
				actionBoxDescription: 'fakeDoor.credentialEdit.sharing.actionBox.description',
				linkURL: 'https://n8n-community.typeform.com/to/l7QOrERN#f=sharing',
				uiLocations: ['credentialsModal'],
			},
		],
		draggable: {
			isDragging: false,
			type: '',
			data: '',
			canDrop: false,
			stickyPosition: null,
		},
		stateIsDirty: false,
		lastSelectedNode: null,
		lastSelectedNodeOutputIndex: null,
		nodeViewOffsetPosition: [0, 0],
		nodeViewMoveInProgress: false,
		selectedNodes: [],
		sidebarMenuItems: [],
	}),
	getters: {
		areExpressionsDisabled(state: uiState): boolean {
			return state.currentView === VIEWS.DEMO;
		},
		isVersionsOpen: (state: uiState): boolean => {
			return state.modals[VERSIONS_MODAL_KEY].open;
		},
		isModalOpen: (state: uiState) => {
			return (name: string) =>  state.modals[name].open;
		},
		isModalActive: (state: uiState) => {
			return (name: string) => state.modalStack.length > 0 && name === state.modalStack[0];
		},
		getModalActiveId: (state: uiState) => {
			return (name: string) => state.modals[name].activeId;
		},
		getModalMode: (state: uiState) => {
			return (name: string) => state.modals[name].mode;
		},
		getModalData: (state: uiState) => {
			return (name: string) => state.modals[name].data;
		},
		getPanelDisplayMode: (state: uiState)  => {
			return (panel: 'input' | 'output') => state.ndv[panel].displayMode;
		},
		getFakeDoorByLocation: (state: uiState) => (location: IFakeDoorLocation) => {
			return state.fakeDoorFeatures.filter(fakeDoor => fakeDoor.uiLocations.includes(location));
		},
		getFakeDoorById: (state: uiState) => (id: string) => {
			return state.fakeDoorFeatures.find(fakeDoor => fakeDoor.id.toString() === id);
		},
	},
	actions: {
		setMode(name: string, mode: string):  void {
			Vue.set(this.modals[name], 'mode', mode);
		},
		setActiveId(name: string, id: string): void {
			Vue.set(this.modals[name], 'activeId', id);
		},
		openModal(name: string): void {
			Vue.set(this.modals[name], 'open', true);
			this.modalStack = [name].concat(this.modalStack);
		},
		closeModal(name: string): void {
			Vue.set(this.modals[name], 'open', false);
			this.modalStack = this.modalStack.filter((openModalName: string) => {
				return name !== openModalName;
			});
		},
		closeAllModals(): void {
			Object.keys(this.modals).forEach((name: string) => {
				if (this.modals[name].open) {
					Vue.set(this.modals[name], 'open', false);
				}
			});
			this.modalStack = [];
		},
		setNDVSessionId(): void {
			Vue.set(this.ndv, 'sessionId', `ndv-${Math.random().toString(36).slice(-8)}`);
		},
		resetNDVSessionId(): void {
			Vue.set(this.ndv, 'sessionId', '');
		},
		setPanelDisplayMode(pane: 'input' | 'output', mode: IRunDataDisplayMode): void {
			Vue.set(this.ndv[pane], 'displayMode', mode);
		},
		setOutputPanelEditModeEnabled(isEnabled: boolean): void {
			Vue.set(this.ndv.output.editMode, 'enabled', isEnabled);
		},
		setOutputPanelEditModeValue(value: string): void {
			Vue.set(this.ndv.output.editMode, 'value', value);
		},
		setMappableNDVInputFocus(paramName: string): void {
			Vue.set(this.ndv, 'focusedMappableInput', paramName);
		},
		draggableStartDragging(type: string, data: string): void {
			this.draggable = {
				isDragging: true,
				type,
				data,
				canDrop: false,
				stickyPosition: null,
			};
		},
		draggableStopDragging(): void {
			this.draggable = {
				isDragging: false,
				type: '',
				data: '',
				canDrop: false,
				stickyPosition: null,
			};
		},
		setDraggableStickyPos(position: XYPosition): void {
			Vue.set(this.draggable, 'stickyPosition', position);
		},
		setDraggableCanDrop(canDrop: boolean): void {
			Vue.set(this.draggable, 'canDrop', canDrop);
		},
		setMappingTelemetry(telemetry: {[key: string]: string | number | boolean}): void {
			this.ndv.mappingTelemetry = { ...this.ndv.mappingTelemetry, ...telemetry };
		},
		resetMappingTelemetry(): void {
			this.ndv.mappingTelemetry = {};
		},
		openDeleteUserModal(id: string): void {
			this.setActiveId(DELETE_USER_MODAL_KEY, id);
			this.openModal(DELETE_USER_MODAL_KEY);
		},
		openExistingCredential(id: string): void {
			this.setActiveId(CREDENTIAL_EDIT_MODAL_KEY, id);
			this.setMode(CREDENTIAL_EDIT_MODAL_KEY, 'edit');
			this.openModal(CREDENTIAL_EDIT_MODAL_KEY);
		},
		openNewCredential(id: string): void {
			this.setActiveId(CREDENTIAL_EDIT_MODAL_KEY, id);
			this.setMode(CREDENTIAL_EDIT_MODAL_KEY, 'new');
			this.openModal(CREDENTIAL_EDIT_MODAL_KEY);
		},
		async getNextOnboardingPrompt(): Promise<IOnboardingCallPromptResponse> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return await fetchNextOnboardingPrompt(instanceId, currentUser);
		},
		async applyForOnboardingCall(email: string): Promise<string> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return await applyForOnboardingCall(instanceId, currentUser, email);
		},
		async submitContactEmail(email: string, agree: boolean): Promise<string> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return await submitEmailOnSignup(instanceId, currentUser, email || currentUser.email, agree);
		},
		openCommunityPackageUninstallConfirmModal(packageName: string) {
			this.setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
			this.setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL);
			this.openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
		},
		openCommunityPackageUpdateConfirmModal(packageName: string) {
			this.setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
			this.setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE);
			this.openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
		},
		addActiveAction(action: string): void {
			if (!this.activeActions.includes(action)) {
				this.activeActions.push(action);
			}
		},
		removeActiveAction(action: string): void {
			const actionIndex = this.activeActions.indexOf(action);
			if (actionIndex !== -1) {
				this.activeActions.splice(actionIndex, 1);
			}
		},
		addActiveExecution(newActiveExecution: IExecutionsCurrentSummaryExtended): void {
			// Check if the execution exists already
			const activeExecution = this.activeExecutions.find(execution => {
				return execution.id === newActiveExecution.id;
			});

			if (activeExecution !== undefined) {
				// Exists already so no need to add it again
				if (activeExecution.workflowName === undefined) {
					activeExecution.workflowName = newActiveExecution.workflowName;
				}
				return;
			}
			this.activeExecutions.unshift(newActiveExecution);
		},
		finishActiveExecution(finishedActiveExecution: IPushDataExecutionFinished): void {
			// Find the execution to set to finished
			const activeExecution = this.activeExecutions.find(execution => {
				return execution.id === finishedActiveExecution.executionId;
			});

			if (activeExecution === undefined) {
				// The execution could not be found
				return;
			}

			if (finishedActiveExecution.executionId !== undefined) {
				Vue.set(activeExecution, 'id', finishedActiveExecution.executionId);
			}
			Vue.set(activeExecution, 'finished', finishedActiveExecution.data.finished);
			Vue.set(activeExecution, 'stoppedAt', finishedActiveExecution.data.stoppedAt);
		},
		setWorkflowActive(workflowId: string): void {
			this.stateIsDirty = false;
			const index = this.activeWorkflows.indexOf(workflowId);
			if (index !== -1) {
				this.activeWorkflows.push(workflowId);
			}
		},
		setWorkflowInactive(workflowId: string): void {
			const index = this.activeWorkflows.indexOf(workflowId);
			if (index !== -1) {
				this.activeWorkflows.splice(index, 1);
			}
		},
		addSelectedNode(node: INodeUi): void {
			this.selectedNodes.push(node);
		},
		removeNodeFromSelection(node: INodeUi): void {
			let index;
			for (index in this.selectedNodes) {
				if (this.selectedNodes[index].name === node.name) {
					this.selectedNodes.splice(parseInt(index, 10), 1);
					break;
				}
			}
		},
		resetSelectedNodes(): void {
			Vue.set(this, 'selectedNodes', []);
		},
		addSidebarMenuItems(menuItems: IMenuItem[]) {
			const updated = this.sidebarMenuItems.concat(menuItems);
			Vue.set(this, 'sidebarMenuItems', updated);
		},
	},
});
