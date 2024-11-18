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
	STORES,
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
} from '@/constants';
import type {
	INodeUi,
	XYPosition,
	Modals,
	NewCredentialsModal,
	ThemeOption,
	NotificationOptions,
	ModalState,
	ModalKey,
} from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';
import * as curlParserApi from '@/api/curlHelper';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
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
import { computed, ref } from 'vue';
import type { Connection } from '@vue-flow/core';

let savedTheme: ThemeOption = 'system';

try {
	const value = getThemeOverride();
	if (isValidTheme(value)) {
		savedTheme = value;
		addThemeToBody(value);
	}
} catch (e) {}

type UiStore = ReturnType<typeof useUIStore>;

type Draggable = {
	isDragging: boolean;
	type: string;
	data: string;
	canDrop: boolean;
	stickyPosition: null | XYPosition;
};

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
				COMMUNITY_PLUS_ENROLLMENT_MODAL,
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
		[CREDENTIAL_EDIT_MODAL_KEY]: {
			open: false,
			mode: '',
			activeId: null,
			showAuthSelector: false,
		} as ModalState,
	});

	const modalStack = ref<string[]>([]);
	const sidebarMenuCollapsed = ref<boolean>(true);
	const currentView = ref<string>('');
	const draggable = ref<Draggable>({
		isDragging: false,
		type: '',
		data: '',
		canDrop: false,
		stickyPosition: null,
	});

	const stateIsDirty = ref<boolean>(false);
	const lastSelectedNode = ref<string | null>(null);
	const lastSelectedNodeOutputIndex = ref<number | null>(null);
	const lastSelectedNodeEndpointUuid = ref<string | null>(null);
	const nodeViewOffsetPosition = ref<[number, number]>([0, 0]);
	const nodeViewMoveInProgress = ref<boolean>(false);
	const selectedNodes = ref<INodeUi[]>([]);
	const nodeViewInitialized = ref<boolean>(false);
	const addFirstStepOnLoad = ref<boolean>(false);
	const bannersHeight = ref<number>(0);
	const bannerStack = ref<BannerName[]>([]);
	const pendingNotificationsForViews = ref<{ [key in VIEWS]?: NotificationOptions[] }>({});

	const appGridWidth = ref<number>(0);

	// Last interacted with - Canvas v2 specific
	const lastInteractedWithNodeConnection = ref<Connection | undefined>();
	const lastInteractedWithNodeHandle = ref<string | null>(null);
	const lastInteractedWithNodeId = ref<string | undefined>();
	const lastCancelledConnectionPosition = ref<XYPosition | undefined>();

	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const userStore = useUsersStore();

	const appliedTheme = computed(() => {
		return theme.value === 'system' ? getPreferredTheme() : theme.value;
	});

	const logo = computed(() => {
		const { releaseChannel } = settingsStore.settings;
		const suffix = appliedTheme.value === 'dark' ? '-dark.svg' : '.svg';
		return `static/logo/${
			releaseChannel === 'stable' ? 'expanded' : `channel/${releaseChannel}`
		}${suffix}`;
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

	const getLastSelectedNode = computed(() => {
		if (lastSelectedNode.value) {
			return workflowsStore.getNodeByName(lastSelectedNode.value);
		}
		return null;
	});

	const lastInteractedWithNode = computed(() => {
		if (lastInteractedWithNodeId.value) {
			return workflowsStore.getNodeById(lastInteractedWithNodeId.value);
		}

		return null;
	});

	const isVersionsOpen = computed(() => {
		return modalsById.value[VERSIONS_MODAL_KEY].open;
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

	const getSelectedNodes = computed(() => {
		const seen = new Set();
		return selectedNodes.value.filter((node) => {
			// dedupe for instances when same node is selected in different ways
			if (!seen.has(node)) {
				seen.add(node);
				return true;
			}
			return false;
		});
	});

	const isNodeSelected = computed(() =>
		selectedNodes.value.reduce((acc: { [nodeName: string]: true }, node) => {
			acc[node.name] = true;
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

	const draggableStartDragging = (type: string, data: string) => {
		draggable.value = {
			isDragging: true,
			type,
			data,
			canDrop: false,
			stickyPosition: null,
		};
	};

	const draggableStopDragging = () => {
		draggable.value = {
			isDragging: false,
			type: '',
			data: '',
			canDrop: false,
			stickyPosition: null,
		};
	};

	const setDraggableStickyPos = (position: XYPosition) => {
		draggable.value = {
			...draggable.value,
			stickyPosition: position,
		};
	};

	const setDraggableCanDrop = (canDrop: boolean) => {
		draggable.value = {
			...draggable.value,
			canDrop,
		};
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

	const addSelectedNode = (node: INodeUi) => {
		const isAlreadySelected = selectedNodes.value.some((n) => n.name === node.name);
		if (!isAlreadySelected) {
			selectedNodes.value.push(node);
		}
	};

	const removeNodeFromSelection = (node: INodeUi) => {
		for (const [index] of selectedNodes.value.entries()) {
			if (selectedNodes.value[index].name === node.name) {
				selectedNodes.value.splice(Number(index), 1);
				break;
			}
		}
	};

	const resetSelectedNodes = () => {
		selectedNodes.value = [];
	};

	const setCurlCommand = (payload: { name: string; command: string }) => {
		modalsById.value[payload.name] = {
			...modalsById.value[payload.name],
			curlCommand: payload.command,
		};
	};

	const toggleSidebarMenuCollapse = () => {
		sidebarMenuCollapsed.value = !sidebarMenuCollapsed.value;
	};

	const getCurlToJson = async (curlCommand: string) => {
		const parameters = await curlParserApi.getCurlToJson(rootStore.restApiContext, curlCommand);

		// Normalize placeholder values
		if (parameters['parameters.url']) {
			parameters['parameters.url'] = parameters['parameters.url']
				.replaceAll('%7B', '{')
				.replaceAll('%7D', '}');
		}

		return parameters;
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

	const deleteNotificationsForView = (view: VIEWS) => {
		delete pendingNotificationsForViews.value[view];
	};

	function resetLastInteractedWith() {
		lastInteractedWithNodeConnection.value = undefined;
		lastInteractedWithNodeHandle.value = null;
		lastInteractedWithNodeId.value = undefined;
		lastCancelledConnectionPosition.value = undefined;
	}

	return {
		appGridWidth,
		appliedTheme,
		logo,
		contextBasedTranslationKeys,
		getLastSelectedNode,
		isVersionsOpen,
		isModalActiveById,
		isReadOnlyView,
		isActionActive,
		activeActions,
		getSelectedNodes,
		isNodeSelected,
		headerHeight,
		stateIsDirty,
		lastSelectedNodeOutputIndex,
		activeCredentialType,
		lastSelectedNode,
		selectedNodes,
		bannersHeight,
		lastSelectedNodeEndpointUuid,
		lastInteractedWithNodeConnection,
		lastInteractedWithNodeHandle,
		lastInteractedWithNodeId,
		lastInteractedWithNode,
		lastCancelledConnectionPosition,
		nodeViewOffsetPosition,
		nodeViewMoveInProgress,
		nodeViewInitialized,
		addFirstStepOnLoad,
		sidebarMenuCollapsed,
		bannerStack,
		theme,
		modalsById,
		currentView,
		isAnyModalOpen,
		pendingNotificationsForViews,
		activeModals,
		setTheme,
		setMode,
		setActiveId,
		setShowAuthSelector,
		setModalData,
		openModalWithData,
		openModal,
		closeModal,
		draggableStartDragging,
		draggableStopDragging,
		setDraggableStickyPos,
		setDraggableCanDrop,
		openDeleteUserModal,
		openExistingCredential,
		openNewCredential,
		submitContactEmail,
		openCommunityPackageUninstallConfirmModal,
		openCommunityPackageUpdateConfirmModal,
		addActiveAction,
		removeActiveAction,
		addSelectedNode,
		removeNodeFromSelection,
		resetSelectedNodes,
		setCurlCommand,
		toggleSidebarMenuCollapse,
		getCurlToJson,
		removeBannerFromStack,
		dismissBanner,
		updateBannersHeight,
		pushBannerToStack,
		clearBannerStack,
		setNotificationsForView,
		deleteNotificationsForView,
		resetLastInteractedWith,
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
