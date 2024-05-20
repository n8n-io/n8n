import {
	applyForOnboardingCall,
	fetchNextOnboardingPrompt,
	submitEmailOnSignup,
} from '@/api/workflow-webhooks';
import {
	ABOUT_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_PACKAGE_MANAGE_ACTIONS,
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	FAKE_DOOR_FEATURES,
	IMPORT_CURL_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	LOG_STREAM_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	STORES,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	VIEWS,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_LM_CHAT_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	SOURCE_CONTROL_PULL_MODAL_KEY,
	DEBUG_PAYWALL_MODAL_KEY,
	N8N_PRICING_PAGE_URL,
	WORKFLOW_HISTORY_VERSION_RESTORE,
	SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY,
	SETUP_CREDENTIALS_MODAL_KEY,
	GENERATE_CURL_MODAL_KEY,
} from '@/constants';
import type {
	CloudUpdateLinkSourceType,
	CurlToJSONResponse,
	IFakeDoorLocation,
	INodeUi,
	IOnboardingCallPrompt,
	UIState,
	UTMCampaign,
	XYPosition,
	Modals,
	NewCredentialsModal,
	ThemeOption,
	AppliedThemeOption,
	SuggestedTemplates,
	NotificationOptions,
	ModalState,
} from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/n8nRoot.store';
import { getCurlToJson } from '@/api/curlHelper';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from '@/rbac/permissions';
import { useTelemetryStore } from '@/stores/telemetry.store';
import { useUsersStore } from '@/stores/users.store';
import { dismissBannerPermanently } from '@/api/ui';
import type { BannerName } from 'n8n-workflow';
import {
	addThemeToBody,
	getPreferredTheme,
	getThemeOverride,
	isValidTheme,
	updateTheme,
} from './ui.utils';

let savedTheme: ThemeOption = 'system';
try {
	const value = getThemeOverride();
	if (isValidTheme(value)) {
		savedTheme = value;
		addThemeToBody(value);
	}
} catch (e) {}

export type UiStore = ReturnType<typeof useUIStore>;

export const useUIStore = defineStore(STORES.UI, {
	state: (): UIState => ({
		activeActions: [],
		activeCredentialType: null,
		theme: savedTheme,
		modals: {
			...Object.fromEntries(
				[
					ABOUT_MODAL_KEY,
					CHAT_EMBED_MODAL_KEY,
					CHANGE_PASSWORD_MODAL_KEY,
					CONTACT_PROMPT_MODAL_KEY,
					CREDENTIAL_SELECT_MODAL_KEY,
					DUPLICATE_MODAL_KEY,
					ONBOARDING_CALL_SIGNUP_MODAL_KEY,
					PERSONALIZATION_MODAL_KEY,
					INVITE_USER_MODAL_KEY,
					TAGS_MANAGER_MODAL_KEY,
					VALUE_SURVEY_MODAL_KEY,
					VERSIONS_MODAL_KEY,
					WORKFLOW_LM_CHAT_MODAL_KEY,
					WORKFLOW_SETTINGS_MODAL_KEY,
					WORKFLOW_SHARE_MODAL_KEY,
					WORKFLOW_ACTIVE_MODAL_KEY,
					COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
					MFA_SETUP_MODAL_KEY,
					SOURCE_CONTROL_PUSH_MODAL_KEY,
					SOURCE_CONTROL_PULL_MODAL_KEY,
					EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
					DEBUG_PAYWALL_MODAL_KEY,
					WORKFLOW_HISTORY_VERSION_RESTORE,
					SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY,
					SETUP_CREDENTIALS_MODAL_KEY,
				].map((modalKey) => [modalKey, { open: false }]),
			),
			[DELETE_USER_MODAL_KEY]: {
				open: false,
				activeId: null,
			},
			[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: {
				open: false,
				mode: '',
				activeId: null,
			},
			[IMPORT_CURL_MODAL_KEY]: {
				open: false,
				data: {
					curlCommand: '',
				},
			},
			[GENERATE_CURL_MODAL_KEY]: {
				open: false,
				data: {
					service: '',
					request: '',
				},
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
			} as ModalState,
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
		isPageLoading: true,
		currentView: '',
		mainPanelPosition: 0.5,
		fakeDoorFeatures: [
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
		lastSelectedNodeEndpointUuid: null,
		nodeViewOffsetPosition: [0, 0],
		nodeViewMoveInProgress: false,
		selectedNodes: [],
		nodeViewInitialized: false,
		addFirstStepOnLoad: false,
		bannersHeight: 0,
		bannerStack: [],
		suggestedTemplates: undefined,
		// Notifications that should show when a view is initialized
		// This enables us to set a queue of notifications form outside (another component)
		// and then show them when the view is initialized
		pendingNotificationsForViews: {},
	}),
	getters: {
		appliedTheme(): AppliedThemeOption {
			return this.theme === 'system' ? getPreferredTheme() : this.theme;
		},
		logo(): string {
			const { releaseChannel } = useSettingsStore().settings;
			const suffix = this.appliedTheme === 'dark' ? '-dark.svg' : '.svg';
			return `static/logo/${
				releaseChannel === 'stable' ? 'expanded' : `channel/${releaseChannel}`
			}${suffix}`;
		},
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
				feature: {
					unavailable: {
						title: `contextual.feature.unavailable.title${contextKey}`,
					},
				},
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
			return ![VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.EXECUTION_DEBUG].includes(
				this.currentView as VIEWS,
			);
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
			return async (source: string, utm_campaign: string, deploymentType: string) => {
				let linkUrl = '';

				const searchParams = new URLSearchParams();

				if (deploymentType === 'cloud' && hasPermission(['instanceOwner'])) {
					const adminPanelHost = new URL(window.location.href).host.split('.').slice(1).join('.');
					const { code } = await useCloudPlanStore().getAutoLoginCode();
					linkUrl = `https://${adminPanelHost}/login`;
					searchParams.set('code', code);
					searchParams.set('returnPath', '/account/change-plan');
				} else {
					linkUrl = N8N_PRICING_PAGE_URL;
				}

				if (utm_campaign) {
					searchParams.set('utm_campaign', utm_campaign);
				}

				if (source) {
					searchParams.set('source', source);
				}
				return `${linkUrl}?${searchParams.toString()}`;
			};
		},
		headerHeight() {
			const style = getComputedStyle(document.body);
			return Number(style.getPropertyValue('--header-height'));
		},
		isAnyModalOpen(): boolean {
			return this.modalStack.length > 0;
		},
	},
	actions: {
		setTheme(theme: ThemeOption): void {
			this.theme = theme;
			updateTheme(theme);
		},
		setMode(name: keyof Modals, mode: string): void {
			this.modals[name] = {
				...this.modals[name],
				mode,
			};
		},
		setActiveId(name: keyof Modals, activeId: string): void {
			this.modals[name] = {
				...this.modals[name],
				activeId,
			};
		},
		setShowAuthSelector(name: keyof Modals, showAuthSelector: boolean) {
			this.modals[name] = {
				...this.modals[name],
				showAuthSelector,
			} as NewCredentialsModal;
		},
		setModalData(payload: { name: keyof Modals; data: Record<string, unknown> }) {
			this.modals[payload.name] = {
				...this.modals[payload.name],
				data: payload.data,
			};
		},
		openModal(name: keyof Modals): void {
			this.modals[name] = {
				...this.modals[name],
				open: true,
			};
			this.modalStack = [name].concat(this.modalStack) as string[];
		},
		openModalWithData(payload: { name: keyof Modals; data: Record<string, unknown> }): void {
			this.setModalData(payload);
			this.openModal(payload.name);
		},
		closeModal(name: keyof Modals): void {
			this.modals[name] = {
				...this.modals[name],
				open: false,
			};
			this.modalStack = this.modalStack.filter((openModalName: string) => {
				return name !== openModalName;
			});
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
			this.draggable = {
				...this.draggable,
				stickyPosition: position,
			};
		},
		setDraggableCanDrop(canDrop: boolean): void {
			this.draggable = {
				...this.draggable,
				canDrop,
			};
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
		async getNextOnboardingPrompt(): Promise<IOnboardingCallPrompt | null> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			const { currentUser } = useUsersStore();
			if (currentUser) {
				return await fetchNextOnboardingPrompt(instanceId, currentUser);
			}
			return null;
		},
		async applyForOnboardingCall(email: string): Promise<string | null> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			const { currentUser } = useUsersStore();
			if (currentUser) {
				return await applyForOnboardingCall(instanceId, currentUser, email);
			}
			return null;
		},
		async submitContactEmail(email: string, agree: boolean): Promise<string | null> {
			const rootStore = useRootStore();
			const instanceId = rootStore.instanceId;
			const { currentUser } = useUsersStore();
			if (currentUser) {
				return await submitEmailOnSignup(
					instanceId,
					currentUser,
					email ?? currentUser?.email,
					agree,
				);
			}
			return null;
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
			const isAlreadySelected = this.selectedNodes.some((n) => n.name === node.name);
			if (!isAlreadySelected) {
				this.selectedNodes.push(node);
			}
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
			this.selectedNodes = [];
		},
		setCurlCommand(payload: { name: string; command: string }): void {
			this.modals[payload.name] = {
				...this.modals[payload.name],
				curlCommand: payload.command,
			};
		},
		toggleSidebarMenuCollapse(): void {
			this.sidebarMenuCollapsed = !this.sidebarMenuCollapsed;
		},
		async getCurlToJson(curlCommand: string): Promise<CurlToJSONResponse> {
			const rootStore = useRootStore();
			const parameters = await getCurlToJson(rootStore.getRestApiContext, curlCommand);

			// Normalize placeholder values
			if (parameters['parameters.url']) {
				parameters['parameters.url'] = parameters['parameters.url']
					.replaceAll('%7B', '{')
					.replaceAll('%7D', '}');
			}

			return parameters;
		},
		async goToUpgrade(
			source: CloudUpdateLinkSourceType,
			utm_campaign: UTMCampaign,
			mode: 'open' | 'redirect' = 'open',
		): Promise<void> {
			const { usageLeft, trialDaysLeft, userIsTrialing } = useCloudPlanStore();
			const { executionsLeft, workflowsLeft } = usageLeft;
			const deploymentType = useSettingsStore().deploymentType;

			useTelemetryStore().track('User clicked upgrade CTA', {
				source,
				isTrial: userIsTrialing,
				deploymentType,
				trialDaysLeft,
				executionsLeft,
				workflowsLeft,
			});

			const upgradeLink = await this.upgradeLinkUrl(source, utm_campaign, deploymentType);

			if (mode === 'open') {
				window.open(upgradeLink, '_blank');
			} else {
				location.href = upgradeLink;
			}
		},
		async dismissBanner(
			name: BannerName,
			type: 'temporary' | 'permanent' = 'temporary',
		): Promise<void> {
			if (type === 'permanent') {
				await dismissBannerPermanently(useRootStore().getRestApiContext, {
					bannerName: name,
					dismissedBanners: useSettingsStore().permanentlyDismissedBanners,
				});
				this.removeBannerFromStack(name);
				return;
			}
			this.removeBannerFromStack(name);
		},
		updateBannersHeight(newHeight: number): void {
			this.bannersHeight = newHeight;
		},
		pushBannerToStack(name: BannerName) {
			if (this.bannerStack.includes(name)) return;
			this.bannerStack.push(name);
		},
		removeBannerFromStack(name: BannerName) {
			this.bannerStack = this.bannerStack.filter((bannerName) => bannerName !== name);
		},
		clearBannerStack() {
			this.bannerStack = [];
		},
		setSuggestedTemplates(templates: SuggestedTemplates) {
			this.suggestedTemplates = templates;
		},
		deleteSuggestedTemplates() {
			this.suggestedTemplates = undefined;
		},
		getNotificationsForView(view: VIEWS): NotificationOptions[] {
			return this.pendingNotificationsForViews[view] ?? [];
		},
		setNotificationsForView(view: VIEWS, notifications: NotificationOptions[]) {
			this.pendingNotificationsForViews[view] = notifications;
		},
		deleteNotificationsForView(view: VIEWS) {
			delete this.pendingNotificationsForViews[view];
		},
	},
});

/**
 * Helper function for listening to credential changes in the store
 */
export const listenForModalChanges = (opts: {
	store: UiStore;
	onModalOpened?: (name: keyof Modals) => void;
	onModalClosed?: (name: keyof Modals) => void;
}) => {
	const { store, onModalClosed, onModalOpened } = opts;
	const listeningForActions = ['openModal', 'openModalWithData', 'closeModal'];

	return store.$onAction((result) => {
		const { name, after, args } = result;
		after(async () => {
			if (!listeningForActions.includes(name)) {
				return;
			}

			switch (name) {
				case 'openModal': {
					const modalName = args[0];
					onModalOpened?.(modalName);
					break;
				}

				case 'openModalWithData': {
					const { name: modalName } = args[0] ?? {};
					onModalOpened?.(modalName);
					break;
				}

				case 'closeModal': {
					const modalName = args[0];
					onModalClosed?.(modalName);
					break;
				}
			}
		});
	});
};
