import { applyForOnboardingCall, fetchNextOnboardingPrompt, submitEmailOnSignup } from '@/api/workflow-webhooks';
import {
	ABOUT_MODAL_KEY,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_LIST_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_OPEN_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	VIEWS,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	FAKE_DOOR_FEATURES,
	COMMUNITY_PACKAGE_MANAGE_ACTIONS,
} from '@/constants';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import {
	IFakeDoor,
	IFakeDoorLocation,
	IRootState,
	IRunDataDisplayMode,
	IUiState,
	XYPosition,
} from '../Interface';

const module: Module<IUiState, IRootState> = {
	namespaced: true,
	state: {
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
			[CREDENTIAL_LIST_MODAL_KEY]: {
				open: false,
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
			[WORKFLOW_OPEN_MODAL_KEY]: {
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
	},
	getters: {
		areExpressionsDisabled(state: IUiState) {
			return state.currentView === VIEWS.DEMO;
		},
		isVersionsOpen: (state: IUiState) => {
			return state.modals[VERSIONS_MODAL_KEY].open;
		},
		isModalOpen: (state: IUiState) => {
			return (name: string) => state.modals[name].open;
		},
		isModalActive: (state: IUiState) => {
			return (name: string) => state.modalStack.length > 0 && name === state.modalStack[0];
		},
		getModalActiveId: (state: IUiState) => {
			return (name: string) => state.modals[name].activeId;
		},
		getModalMode: (state: IUiState) => {
			return (name: string) => state.modals[name].mode;
		},
		sidebarMenuCollapsed: (state: IUiState): boolean => state.sidebarMenuCollapsed,
		ndvSessionId: (state: IUiState): string => state.ndv.sessionId,
		getPanelDisplayMode: (state: IUiState)  => {
			return (panel: 'input' | 'output') => state.ndv[panel].displayMode;
		},
		inputPanelDisplayMode: (state: IUiState) => state.ndv.input.displayMode,
		outputPanelDisplayMode: (state: IUiState) => state.ndv.output.displayMode,
		outputPanelEditMode: (state: IUiState): IUiState['ndv']['output']['editMode'] => state.ndv.output.editMode,
		mainPanelPosition: (state: IUiState) => state.mainPanelPosition,
		getFakeDoorFeatures: (state: IUiState) => state.fakeDoorFeatures,
		getFakeDoorByLocation: (state: IUiState) => (location: IFakeDoorLocation) => {
			return state.fakeDoorFeatures.filter(fakeDoor => fakeDoor.uiLocations.includes(location));
		},
		getFakeDoorById: (state: IUiState) => (id: string) => {
			return state.fakeDoorFeatures.find(fakeDoor => fakeDoor.id.toString() === id);
		},
		focusedMappableInput: (state: IUiState) => state.ndv.focusedMappableInput,
		isDraggableDragging: (state: IUiState) => state.draggable.isDragging,
		draggableType: (state: IUiState) => state.draggable.type,
		draggableData: (state: IUiState) => state.draggable.data,
		canDraggableDrop: (state: IUiState) => state.draggable.canDrop,
		draggableStickyPos: (state: IUiState) => state.draggable.stickyPosition,
		mappingTelemetry: (state: IUiState) => state.ndv.mappingTelemetry,
	},
	mutations: {
		setMode: (state: IUiState, params: {name: string, mode: string}) => {
			const { name, mode } = params;
			Vue.set(state.modals[name], 'mode', mode);
		},
		setActiveId: (state: IUiState, params: {name: string, id: string}) => {
			const { name, id } = params;
			Vue.set(state.modals[name], 'activeId', id);
		},
		openModal: (state: IUiState, name: string) => {
			Vue.set(state.modals[name], 'open', true);
			state.modalStack = [name].concat(state.modalStack);
		},
		closeModal: (state: IUiState, name: string) => {
			Vue.set(state.modals[name], 'open', false);
			state.modalStack = state.modalStack.filter((openModalName: string) => {
				return name !== openModalName;
			});
		},
		closeAllModals: (state: IUiState) => {
			Object.keys(state.modals).forEach((name: string) => {
				if (state.modals[name].open) {
					Vue.set(state.modals[name], 'open', false);
				}
			});
			state.modalStack = [];
		},
		toggleSidebarMenuCollapse: (state: IUiState) => {
			state.sidebarMenuCollapsed = !state.sidebarMenuCollapsed;
		},
		setCurrentView: (state: IUiState, currentView: string) => {
			state.currentView = currentView;
		},
		setNDVSessionId: (state: IUiState) => {
			Vue.set(state.ndv, 'sessionId', `ndv-${Math.random().toString(36).slice(-8)}`);
		},
		resetNDVSessionId: (state: IUiState) => {
			Vue.set(state.ndv, 'sessionId', '');
		},
		setPanelDisplayMode: (state: IUiState, params: {pane: 'input' | 'output', mode: IRunDataDisplayMode}) => {
			Vue.set(state.ndv[params.pane], 'displayMode', params.mode);
		},
		setOutputPanelEditModeEnabled: (state: IUiState, payload: boolean) => {
			Vue.set(state.ndv.output.editMode, 'enabled', payload);
		},
		setOutputPanelEditModeValue: (state: IUiState, payload: string) => {
			Vue.set(state.ndv.output.editMode, 'value', payload);
		},
		setMainPanelRelativePosition(state: IUiState, relativePosition: number) {
			state.mainPanelPosition = relativePosition;
		},
		setMappableNDVInputFocus(state: IUiState, paramName: string) {
			Vue.set(state.ndv, 'focusedMappableInput', paramName);
		},
		draggableStartDragging(state: IUiState, {type, data}: {type: string, data: string}) {
			state.draggable = {
				isDragging: true,
				type,
				data,
				canDrop: false,
				stickyPosition: null,
			};
		},
		draggableStopDragging(state: IUiState) {
			state.draggable = {
				isDragging: false,
				type: '',
				data: '',
				canDrop: false,
				stickyPosition: null,
			};
		},
		setDraggableStickyPos(state: IUiState, position: XYPosition | null) {
			Vue.set(state.draggable, 'stickyPosition', position);
		},
		setDraggableCanDrop(state: IUiState, canDrop: boolean) {
			Vue.set(state.draggable, 'canDrop', canDrop);
		},
		setMappingTelemetry(state: IUiState, telemetry: {[key: string]: string | number | boolean}) {
			state.ndv.mappingTelemetry = {...state.ndv.mappingTelemetry, ...telemetry};
		},
		resetMappingTelemetry(state: IUiState) {
			state.ndv.mappingTelemetry = {};
		},
	},
	actions: {
		openModal: async (context: ActionContext<IUiState, IRootState>, modalKey: string) => {
			context.commit('openModal', modalKey);
		},
		openDeleteUserModal: async (context: ActionContext<IUiState, IRootState>, { id }: {id: string}) => {
			context.commit('setActiveId', { name: DELETE_USER_MODAL_KEY, id });
			context.commit('openModal', DELETE_USER_MODAL_KEY);
		},
		openExisitngCredential: async (context: ActionContext<IUiState, IRootState>, { id }: {id: string}) => {
			context.commit('setActiveId', { name: CREDENTIAL_EDIT_MODAL_KEY, id });
			context.commit('setMode', { name: CREDENTIAL_EDIT_MODAL_KEY, mode: 'edit' });
			context.commit('openModal', CREDENTIAL_EDIT_MODAL_KEY);
		},
		openNewCredential: async (context: ActionContext<IUiState, IRootState>, { type }: {type: string}) => {
			context.commit('setActiveId', { name: CREDENTIAL_EDIT_MODAL_KEY, id: type });
			context.commit('setMode', { name: CREDENTIAL_EDIT_MODAL_KEY, mode: 'new' });
			context.commit('openModal', CREDENTIAL_EDIT_MODAL_KEY);
		},
		getNextOnboardingPrompt: async (context: ActionContext<IUiState, IRootState>) => {
			const instanceId = context.rootGetters.instanceId;
			const currentUser = context.rootGetters['users/currentUser'];
			return await fetchNextOnboardingPrompt(instanceId, currentUser);
		},
		applyForOnboardingCall: async (context: ActionContext<IUiState, IRootState>, { email }) => {
			const instanceId = context.rootGetters.instanceId;
			const currentUser = context.rootGetters['users/currentUser'];
			return await applyForOnboardingCall(instanceId, currentUser, email);
		},
		submitContactEmail: async (context: ActionContext<IUiState, IRootState>, { email, agree }) => {
			const instanceId = context.rootGetters.instanceId;
			const currentUser = context.rootGetters['users/currentUser'];

			return await submitEmailOnSignup(instanceId, currentUser, email || currentUser.email, agree);
		},
		async openCommunityPackageUninstallConfirmModal(context: ActionContext<IUiState, IRootState>, packageName: string) {
			context.commit('setActiveId', { name: COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,  id: packageName});
			context.commit('setMode', { name: COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, mode: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL });
			context.commit('openModal', COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
		},
		async openCommunityPackageUpdateConfirmModal(context: ActionContext<IUiState, IRootState>, packageName: string) {
			context.commit('setActiveId', { name: COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,  id: packageName});
			context.commit('setMode', { name: COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, mode: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE });
			context.commit('openModal', COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
		},
	},
};

export default module;
