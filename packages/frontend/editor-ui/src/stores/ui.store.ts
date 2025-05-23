import * as onboardingApi from '@/api/workflow-webhooks';
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
	IMPORT_CURL_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	LOG_STREAM_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	NODE_PINNING_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	ANNOTATION_TAGS_MANAGER_MODAL_KEY,
	NPS_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	VIEWS,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	SOURCE_CONTROL_PULL_MODAL_KEY,
	DEBUG_PAYWALL_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_RESTORE,
	SETUP_CREDENTIALS_MODAL_KEY,
	PROJECT_MOVE_RESOURCE_MODAL,
	NEW_ASSISTANT_SESSION_MODAL,
	PROMPT_MFA_CODE_MODAL_KEY,
	COMMUNITY_PLUS_ENROLLMENT_MODAL,
	API_KEY_CREATE_OR_EDIT_MODAL_KEY,
	DELETE_FOLDER_MODAL_KEY,
	MOVE_FOLDER_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	FROM_AI_PARAMETERS_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type {
	XYPosition,
	Modals,
	NewCredentialsModal,
	ThemeOption,
	NotificationOptions,
	ModalState,
	ModalKey,
	AppliedThemeOption,
} from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { dismissBannerPermanently } from '@/api/ui';
import type { BannerName } from '@n8n/api-types';
import {
	addThemeToBody,
	getPreferredTheme,
	getThemeOverride,
	isValidTheme,
	updateTheme,
} from './ui.utils';
import { computed, ref } from 'vue';
import type { Connection } from '@vue-flow/core';
import { useLocalStorage } from '@vueuse/core';
import type { EventBus } from '@n8n/utils/event-bus';

let savedTheme: ThemeOption = 'system';

try {
	const value = getThemeOverride();
	if (isValidTheme(value)) {
		savedTheme = value;
		addThemeToBody(value);
	}
} catch (e) {}

type UiStore = ReturnType<typeof useUIStore>;

export const useUIStore = defineStore(STORES.UI, () => {
	const activeActions = ref<string[]>([]);
	const activeCredentialType = ref<string | null>(null);
	const theme = ref<ThemeOption>(savedTheme);
	const modalsById = ref<Record<string, ModalState>>({
		...Object.fromEntries(
			[
				ABOUT_MODAL_KEY,
				CHAT_EMBED_MODAL_KEY,
				CHANGE_PASSWORD_MODAL_KEY,
				CONTACT_PROMPT_MODAL_KEY,
				CREDENTIAL_SELECT_MODAL_KEY,
				DUPLICATE_MODAL_KEY,
				PERSONALIZATION_MODAL_KEY,
				NODE_PINNING_MODAL_KEY,
				INVITE_USER_MODAL_KEY,
				TAGS_MANAGER_MODAL_KEY,
				ANNOTATION_TAGS_MANAGER_MODAL_KEY,
				NPS_SURVEY_MODAL_KEY,
				VERSIONS_MODAL_KEY,
				WORKFLOW_SETTINGS_MODAL_KEY,
				WORKFLOW_SHARE_MODAL_KEY,
				WORKFLOW_ACTIVE_MODAL_KEY,
				COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
				MFA_SETUP_MODAL_KEY,
				PROMPT_MFA_CODE_MODAL_KEY,
				SOURCE_CONTROL_PUSH_MODAL_KEY,
				SOURCE_CONTROL_PULL_MODAL_KEY,
				EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
				DEBUG_PAYWALL_MODAL_KEY,
				WORKFLOW_HISTORY_VERSION_RESTORE,
				SETUP_CREDENTIALS_MODAL_KEY,
				PROJECT_MOVE_RESOURCE_MODAL,
				NEW_ASSISTANT_SESSION_MODAL,
				IMPORT_WORKFLOW_URL_MODAL_KEY,
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
		[LOG_STREAM_MODAL_KEY]: {
			open: false,
			data: undefined,
		},
		[API_KEY_CREATE_OR_EDIT_MODAL_KEY]: {
			open: false,
			data: {
				activeId: null,
				mode: '',
			},
		},
		[CREDENTIAL_EDIT_MODAL_KEY]: {
			open: false,
			mode: '',
			activeId: null,
			showAuthSelector: false,
		} as ModalState,
		[DELETE_FOLDER_MODAL_KEY]: {
			open: false,
			activeId: null,
			data: {
				workflowListEventBus: undefined,
				content: {
					workflowCount: 0,
					subFolderCount: 0,
				},
			},
		},
		[MOVE_FOLDER_MODAL_KEY]: {
			open: false,
			activeId: null,
			data: {
				workflowListEventBus: undefined,
			},
		},
		[COMMUNITY_PLUS_ENROLLMENT_MODAL]: {
			open: false,
			data: {
				customHeading: undefined,
			},
		},
		[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY]: {
			open: false,
			data: {
				workflowName: '',
				workflowId: '',
				webhookPath: '',
				node: '',
			},
		},
		[FROM_AI_PARAMETERS_MODAL_KEY]: {
			open: false,
			data: {
				nodeName: undefined,
			},
		},
		[IMPORT_WORKFLOW_URL_MODAL_KEY]: {
			open: false,
			data: {
				url: '',
			},
		},
	});

	const modalStack = ref<string[]>([]);
	const sidebarMenuCollapsedPreference = useLocalStorage<boolean>('sidebar.collapsed', false);
	const sidebarMenuCollapsed = ref<boolean>(sidebarMenuCollapsedPreference.value);
	const currentView = ref<string>('');
	const stateIsDirty = ref<boolean>(false);
	const lastSelectedNode = ref<string | null>(null);
	const nodeViewOffsetPosition = ref<[number, number]>([0, 0]);
	const nodeViewInitialized = ref<boolean>(false);
	const addFirstStepOnLoad = ref<boolean>(false);
	const bannersHeight = ref<number>(0);
	const bannerStack = ref<BannerName[]>([]);
	const pendingNotificationsForViews = ref<{ [key in VIEWS]?: NotificationOptions[] }>({});
	const processingExecutionResults = ref<boolean>(false);

	const appGridDimensions = ref<{ width: number; height: number }>({ width: 0, height: 0 });

	// Last interacted with - Canvas v2 specific
	const lastInteractedWithNodeConnection = ref<Connection | undefined>();
	const lastInteractedWithNodeHandle = ref<string | null>(null);
	const lastInteractedWithNodeId = ref<string | undefined>();
	const lastCancelledConnectionPosition = ref<XYPosition | undefined>();

	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const userStore = useUsersStore();

	// Keep track of the preferred theme and update it when the system preference changes
	const preferredTheme = getPreferredTheme();
	const preferredSystemTheme = ref<AppliedThemeOption>(preferredTheme.theme);
	preferredTheme.mediaQuery?.addEventListener('change', () => {
		preferredSystemTheme.value = getPreferredTheme().theme;
	});

	const appliedTheme = computed(() => {
		return theme.value === 'system' ? preferredSystemTheme.value : theme.value;
	});

	const contextBasedTranslationKeys = computed(() => {
		const deploymentType = settingsStore.deploymentType;

		let contextKey: '' | '.cloud' = '';
		if (deploymentType === 'cloud') {
			contextKey = '.cloud';
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
		} as const;
	});

	const lastInteractedWithNode = computed(() => {
		if (lastInteractedWithNodeId.value) {
			return workflowsStore.getNodeById(lastInteractedWithNodeId.value);
		}

		return null;
	});

	const isModalActiveById = computed(() =>
		Object.keys(modalsById.value).reduce((acc: { [key: string]: boolean }, name) => {
			acc[name] = name === modalStack.value[0];
			return acc;
		}, {}),
	);

	const activeModals = computed(() => modalStack.value.map((modalName) => modalName));

	const isReadOnlyView = computed(() => {
		return ![
			VIEWS.WORKFLOW.toString(),
			VIEWS.NEW_WORKFLOW.toString(),
			VIEWS.EXECUTION_DEBUG.toString(),
		].includes(currentView.value);
	});

	const isActionActive = computed(() =>
		activeActions.value.reduce((acc: { [action: string]: boolean }, action) => {
			acc[action] = true;
			return acc;
		}, {}),
	);

	const headerHeight = computed(() => {
		const style = getComputedStyle(document.body);
		return Number(style.getPropertyValue('--header-height'));
	});

	const isAnyModalOpen = computed(() => {
		return modalStack.value.length > 0;
	});

	/**
	 * Whether we are currently in the process of fetching and deserializing
	 * the full execution data and loading it to the store.
	 */
	const isProcessingExecutionResults = computed(() => processingExecutionResults.value);

	// Methods

	const setTheme = (newTheme: ThemeOption): void => {
		theme.value = newTheme;
		updateTheme(newTheme);
	};

	const setMode = (name: keyof Modals, mode: string): void => {
		modalsById.value[name] = {
			...modalsById.value[name],
			mode,
		};
	};

	const setActiveId = (name: keyof Modals, activeId: string | null): void => {
		modalsById.value[name] = {
			...modalsById.value[name],
			activeId,
		};
	};

	const setShowAuthSelector = (name: keyof Modals, showAuthSelector: boolean): void => {
		modalsById.value[name] = {
			...modalsById.value[name],
			showAuthSelector,
		} as NewCredentialsModal;
	};

	const setModalData = (payload: { name: keyof Modals; data: Record<string, unknown> }) => {
		modalsById.value[payload.name] = {
			...modalsById.value[payload.name],
			data: payload.data,
		};
	};

	const openModal = (name: ModalKey) => {
		modalsById.value[name] = {
			...modalsById.value[name],
			open: true,
		};
		modalStack.value = [name].concat(modalStack.value) as string[];
	};

	const openModalWithData = (payload: { name: ModalKey; data: Record<string, unknown> }) => {
		setModalData(payload);
		openModal(payload.name);
	};

	const closeModal = (name: ModalKey) => {
		modalsById.value[name] = {
			...modalsById.value[name],
			open: false,
		};
		modalStack.value = modalStack.value.filter((openModalName) => name !== openModalName);
	};

	const openDeleteUserModal = (id: string) => {
		setActiveId(DELETE_USER_MODAL_KEY, id);
		openModal(DELETE_USER_MODAL_KEY);
	};

	const openExistingCredential = (id: string) => {
		setActiveId(CREDENTIAL_EDIT_MODAL_KEY, id);
		setMode(CREDENTIAL_EDIT_MODAL_KEY, 'edit');
		openModal(CREDENTIAL_EDIT_MODAL_KEY);
	};

	const openNewCredential = (type: string, showAuthOptions = false) => {
		setActiveId(CREDENTIAL_EDIT_MODAL_KEY, type);
		setShowAuthSelector(CREDENTIAL_EDIT_MODAL_KEY, showAuthOptions);
		setMode(CREDENTIAL_EDIT_MODAL_KEY, 'new');
		openModal(CREDENTIAL_EDIT_MODAL_KEY);
	};

	const submitContactEmail = async (email: string, agree: boolean) => {
		const instanceId = rootStore.instanceId;
		const { currentUser } = userStore;
		if (currentUser) {
			return await onboardingApi.submitEmailOnSignup(
				instanceId,
				currentUser,
				email ?? currentUser.email,
				agree,
			);
		}
		return null;
	};

	const openCommunityPackageUninstallConfirmModal = (packageName: string) => {
		setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL);
		setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
		openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
	};

	const openCommunityPackageUpdateConfirmModal = (packageName: string) => {
		setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE);
		setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
		openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
	};

	const openDeleteFolderModal = (
		id: string,
		workflowListEventBus: EventBus,
		content: { workflowCount: number; subFolderCount: number },
	) => {
		setActiveId(DELETE_FOLDER_MODAL_KEY, id);
		openModalWithData({ name: DELETE_FOLDER_MODAL_KEY, data: { workflowListEventBus, content } });
	};

	const openMoveToFolderModal = (
		resourceType: 'folder' | 'workflow',
		resource: { id: string; name: string; parentFolderId?: string },
		workflowListEventBus: EventBus,
	) => {
		openModalWithData({
			name: MOVE_FOLDER_MODAL_KEY,
			data: { resourceType, resource, workflowListEventBus },
		});
	};

	const addActiveAction = (action: string) => {
		if (!activeActions.value.includes(action)) {
			activeActions.value.push(action);
		}
	};

	const removeActiveAction = (action: string) => {
		const actionIndex = activeActions.value.indexOf(action);
		if (actionIndex !== -1) {
			activeActions.value.splice(actionIndex, 1);
		}
	};

	const toggleSidebarMenuCollapse = () => {
		const newCollapsedState = !sidebarMenuCollapsed.value;
		sidebarMenuCollapsedPreference.value = newCollapsedState;
		sidebarMenuCollapsed.value = newCollapsedState;
	};

	const removeBannerFromStack = (name: BannerName) => {
		bannerStack.value = bannerStack.value.filter((bannerName) => bannerName !== name);
	};

	const dismissBanner = async (name: BannerName, type: 'temporary' | 'permanent' = 'temporary') => {
		if (type === 'permanent') {
			await dismissBannerPermanently(rootStore.restApiContext, {
				bannerName: name,
				dismissedBanners: settingsStore.permanentlyDismissedBanners,
			});
			removeBannerFromStack(name);
			return;
		}
		removeBannerFromStack(name);
	};

	const updateBannersHeight = (newHeight: number) => {
		bannersHeight.value = newHeight;
	};

	const pushBannerToStack = (name: BannerName) => {
		if (bannerStack.value.includes(name)) return;
		bannerStack.value.push(name);
	};

	const clearBannerStack = () => {
		bannerStack.value = [];
	};

	const setNotificationsForView = (view: VIEWS, notifications: NotificationOptions[]) => {
		pendingNotificationsForViews.value[view] = notifications;
	};

	function resetLastInteractedWith() {
		lastInteractedWithNodeConnection.value = undefined;
		lastInteractedWithNodeHandle.value = null;
		lastInteractedWithNodeId.value = undefined;
		lastCancelledConnectionPosition.value = undefined;
	}

	/**
	 * Set whether we are currently in the process of fetching and deserializing
	 * the full execution data and loading it to the store.
	 */
	const setProcessingExecutionResults = (value: boolean) => {
		processingExecutionResults.value = value;
	};

	return {
		appGridDimensions,
		appliedTheme,
		contextBasedTranslationKeys,
		isModalActiveById,
		isReadOnlyView,
		isActionActive,
		activeActions,
		headerHeight,
		stateIsDirty,
		activeCredentialType,
		lastSelectedNode,
		bannersHeight,
		lastInteractedWithNodeConnection,
		lastInteractedWithNodeHandle,
		lastInteractedWithNodeId,
		lastInteractedWithNode,
		lastCancelledConnectionPosition,
		nodeViewOffsetPosition,
		nodeViewInitialized,
		addFirstStepOnLoad,
		sidebarMenuCollapsed,
		sidebarMenuCollapsedPreference,
		bannerStack,
		theme,
		modalsById,
		currentView,
		isAnyModalOpen,
		pendingNotificationsForViews,
		activeModals,
		isProcessingExecutionResults,
		setTheme,
		setModalData,
		openModalWithData,
		openModal,
		closeModal,
		openDeleteUserModal,
		openExistingCredential,
		openNewCredential,
		submitContactEmail,
		openCommunityPackageUninstallConfirmModal,
		openCommunityPackageUpdateConfirmModal,
		addActiveAction,
		removeActiveAction,
		toggleSidebarMenuCollapse,
		dismissBanner,
		updateBannersHeight,
		pushBannerToStack,
		clearBannerStack,
		setNotificationsForView,
		resetLastInteractedWith,
		setProcessingExecutionResults,
		openDeleteFolderModal,
		openMoveToFolderModal,
	};
});

/**
 * Helper function for listening to model opening and closings in the store
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
