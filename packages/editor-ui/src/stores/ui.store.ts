import {
	applyForOnboardingCall,
	fetchNextOnboardingPrompt,
	submitEmailOnSignup,
} from '@/api/workflow-webhooks';
import {
	ABOUT_MODAL_KEY,
	ASK_AI_MODAL_KEY,
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
	LOG_STREAM_MODAL_KEY,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	STORES,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	VIEWS,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	VERSION_CONTROL_PUSH_MODAL_KEY,
} from '@/constants';
import type {
	CurlToJSONResponse,
	IFakeDoorLocation,
	IMenuItem,
	INodeUi,
	IOnboardingCallPrompt,
	IUser,
	UIState,
	XYPosition,
} from '@/Interface';
import Vue from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRoot.store';
import { getCurlToJson } from '@/api/curlHelper';
import { useWorkflowsStore } from './workflows.store';
import { useSettingsStore } from './settings.store';
import { useCloudPlanStore } from './cloudPlan.store';
import type { BaseTextKey } from '@/plugins/i18n';
import { i18n as locale } from '@/plugins/i18n';
import { useTelemetryStore } from '@/stores/telemetry.store';

export const useUIStore = defineStore(STORES.UI, {
	state: (): UIState => ({
		activeActions: [],
		activeCredentialType: null,
		modals: {
			[ABOUT_MODAL_KEY]: {
				open: false,
			},
			[ASK_AI_MODAL_KEY]: {
				open: false,
			},
			[CHANGE_PASSWORD_MODAL_KEY]: {
				open: false,
			},
			[CONTACT_PROMPT_MODAL_KEY]: {
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
			[WORKFLOW_SHARE_MODAL_KEY]: {
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
			[LOG_STREAM_MODAL_KEY]: {
				open: false,
				data: undefined,
			},
			[CREDENTIAL_EDIT_MODAL_KEY]: {
				open: false,
				mode: '',
				activeId: null,
				showAuthSelector: false,
			},
			[VERSION_CONTROL_PUSH_MODAL_KEY]: {
				open: false,
			},
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
		isPageLoading: true,
		currentView: '',
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
				id: FAKE_DOOR_FEATURES.SSO,
				featureName: 'fakeDoor.settings.sso.name',
				icon: 'key',
				actionBoxTitle: 'fakeDoor.settings.sso.actionBox.title',
				actionBoxDescription: 'fakeDoor.settings.sso.actionBox.description',
				linkURL: 'https://n8n-community.typeform.com/to/l7QOrERN#f=sso',
				uiLocations: ['settings/users'],
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
		nodeViewInitialized: false,
		addFirstStepOnLoad: false,
		executionSidebarAutoRefresh: true,
	}),
	getters: {
		contextBasedTranslationKeys() {
			const settingsStore = useSettingsStore();
			const deploymentType = settingsStore.deploymentType;

			let contextKey = '';
			if (deploymentType === 'cloud') {
				contextKey = '.cloud';
			} else if (deploymentType === 'desktop_mac' || deploymentType === 'desktop_win') {
				contextKey = '.desktop';
			}

			return {
				upgradeLinkUrl: `contextual.upgradeLinkUrl${contextKey}`,
				credentials: {
					sharing: {
						unavailable: {
							title: `contextual.credentials.sharing.unavailable.title${contextKey}`,
							description: `contextual.credentials.sharing.unavailable.description${contextKey}`,
							action: `contextual.credentials.sharing.unavailable.action${contextKey}`,
							button: `contextual.credentials.sharing.unavailable.button${contextKey}`,
						},
					},
				},
				workflows: {
					sharing: {
						title: 'contextual.workflows.sharing.title',
						unavailable: {
							title: `contextual.workflows.sharing.unavailable.title${contextKey}`,
							description: {
								modal: `contextual.workflows.sharing.unavailable.description.modal${contextKey}`,
								tooltip: `contextual.workflows.sharing.unavailable.description.tooltip${contextKey}`,
							},
							action: `contextual.workflows.sharing.unavailable.action${contextKey}`,
							button: `contextual.workflows.sharing.unavailable.button${contextKey}`,
						},
					},
				},
				variables: {
					unavailable: {
						title: `contextual.variables.unavailable.title${contextKey}`,
						description: 'contextual.variables.unavailable.description',
						action: `contextual.variables.unavailable.action${contextKey}`,
						button: `contextual.variables.unavailable.button${contextKey}`,
					},
				},
				users: {
					settings: {
						unavailable: {
							title: `contextual.users.settings.unavailable.title${contextKey}`,
							description: `contextual.users.settings.unavailable.description${contextKey}`,
							button: `contextual.users.settings.unavailable.button${contextKey}`,
						},
					},
				},
			};
		},
		getLastSelectedNode(): INodeUi | null {
			const workflowsStore = useWorkflowsStore();
			if (this.lastSelectedNode) {
				return workflowsStore.getNodeByName(this.lastSelectedNode);
			}
			return null;
		},
		getCurlCommand(): string | undefined {
			return this.modals[IMPORT_CURL_MODAL_KEY].curlCommand;
		},
		getHttpNodeParameters(): string | undefined {
			return this.modals[IMPORT_CURL_MODAL_KEY].httpNodeParameters;
		},
		areExpressionsDisabled(): boolean {
			return this.currentView === VIEWS.DEMO;
		},
		isVersionsOpen(): boolean {
			return this.modals[VERSIONS_MODAL_KEY].open;
		},
		isModalOpen() {
			return (name: string) => this.modals[name].open;
		},
		isModalActive() {
			return (name: string) => this.modalStack.length > 0 && name === this.modalStack[0];
		},
		getModalActiveId() {
			return (name: string) => this.modals[name].activeId;
		},
		getModalMode() {
			return (name: string) => this.modals[name].mode;
		},
		getModalData() {
			return (name: string) => this.modals[name].data;
		},
		getFakeDoorByLocation() {
			return (location: IFakeDoorLocation) =>
				this.fakeDoorFeatures.filter((fakeDoor) => fakeDoor.uiLocations.includes(location));
		},
		getFakeDoorById() {
			return (id: string) =>
				this.fakeDoorFeatures.find((fakeDoor) => fakeDoor.id.toString() === id);
		},
		isReadOnlyView(): boolean {
			return ![VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW].includes(this.currentView as VIEWS);
		},
		isNodeView(): boolean {
			return [
				VIEWS.NEW_WORKFLOW.toString(),
				VIEWS.WORKFLOW.toString(),
				VIEWS.WORKFLOW_EXECUTIONS.toString(),
			].includes(this.currentView);
		},
		isActionActive() {
			return (action: string) => this.activeActions.includes(action);
		},
		getSelectedNodes(): INodeUi[] {
			const seen = new Set();
			return this.selectedNodes.filter((node: INodeUi) => {
				// dedupe for instances when same node is selected in different ways
				if (!seen.has(node.id)) {
					seen.add(node.id);
					return true;
				}
				return false;
			});
		},
		isNodeSelected() {
			return (nodeName: string): boolean => {
				let index;
				for (index in this.selectedNodes) {
					if (this.selectedNodes[index].name === nodeName) {
						return true;
					}
				}
				return false;
			};
		},
		upgradeLinkUrl() {
			return (source: string, utm_campaign: string): string => {
				const linkUrlTranslationKey = this.contextBasedTranslationKeys
					.upgradeLinkUrl as BaseTextKey;
				let linkUrl = locale.baseText(linkUrlTranslationKey);

				if (linkUrlTranslationKey.endsWith('.upgradeLinkUrl')) {
					linkUrl = `${linkUrl}?ref=${source}`;
				} else if (linkUrlTranslationKey.endsWith('.desktop')) {
					linkUrl = `${linkUrl}&utm_campaign=${utm_campaign || source}`;
				}

				return linkUrl;
			};
		},
	},
	actions: {
		setMode(name: string, mode: string): void {
			Vue.set(this.modals[name], 'mode', mode);
		},
		setActiveId(name: string, id: string): void {
			Vue.set(this.modals[name], 'activeId', id);
		},
		setShowAuthSelector(name: string, show: boolean) {
			Vue.set(this.modals[name], 'showAuthSelector', show);
		},
		setModalData(payload: { name: string; data: Record<string, unknown> }) {
			Vue.set(this.modals[payload.name], 'data', payload.data);
		},
		openModal(name: string): void {
			Vue.set(this.modals[name], 'open', true);
			this.modalStack = [name].concat(this.modalStack);
		},
		openModalWithData(payload: { name: string; data: Record<string, unknown> }): void {
			this.setModalData(payload);
			this.openModal(payload.name);
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
		openDeleteUserModal(id: string): void {
			this.setActiveId(DELETE_USER_MODAL_KEY, id);
			this.openModal(DELETE_USER_MODAL_KEY);
		},
		openExistingCredential(id: string): void {
			this.setActiveId(CREDENTIAL_EDIT_MODAL_KEY, id);
			this.setMode(CREDENTIAL_EDIT_MODAL_KEY, 'edit');
			this.openModal(CREDENTIAL_EDIT_MODAL_KEY);
		},
		openNewCredential(type: string, showAuthOptions = false): void {
			this.setActiveId(CREDENTIAL_EDIT_MODAL_KEY, type);
			this.setShowAuthSelector(CREDENTIAL_EDIT_MODAL_KEY, showAuthOptions);
			this.setMode(CREDENTIAL_EDIT_MODAL_KEY, 'new');
			this.openModal(CREDENTIAL_EDIT_MODAL_KEY);
		},
		async getNextOnboardingPrompt(): Promise<IOnboardingCallPrompt> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return fetchNextOnboardingPrompt(instanceId, currentUser);
		},
		async applyForOnboardingCall(email: string): Promise<string> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return applyForOnboardingCall(instanceId, currentUser, email);
		},
		async submitContactEmail(email: string, agree: boolean): Promise<string> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			// TODO: current USER
			const currentUser = {} as IUser;
			return submitEmailOnSignup(instanceId, currentUser, email || currentUser.email, agree);
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
		setCurlCommand(payload: { name: string; command: string }): void {
			Vue.set(this.modals[payload.name], 'curlCommand', payload.command);
		},
		setHttpNodeParameters(payload: { name: string; parameters: string }): void {
			Vue.set(this.modals[payload.name], 'httpNodeParameters', payload.parameters);
		},
		toggleSidebarMenuCollapse(): void {
			this.sidebarMenuCollapsed = !this.sidebarMenuCollapsed;
		},
		async getCurlToJson(curlCommand: string): Promise<CurlToJSONResponse> {
			const rootStore = useRootStore();
			return getCurlToJson(rootStore.getRestApiContext, curlCommand);
		},
		goToUpgrade(source: string, utm_campaign: string, mode: 'open' | 'redirect' = 'open'): void {
			const { usageLeft, trialDaysLeft, userIsTrialing } = useCloudPlanStore();
			const { executionsLeft, workflowsLeft } = usageLeft;
			useTelemetryStore().track('User clicked upgrade CTA', {
				source,
				isTrial: userIsTrialing,
				deploymentType: useSettingsStore().deploymentType,
				trialDaysLeft,
				executionsLeft,
				workflowsLeft,
			});
			if (mode === 'open') {
				window.open(this.upgradeLinkUrl(source, utm_campaign), '_blank');
			} else {
				location.href = this.upgradeLinkUrl(source, utm_campaign);
			}
		},
	},
});
