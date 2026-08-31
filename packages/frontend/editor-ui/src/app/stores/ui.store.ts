import { VIEWS, LOCAL_STORAGE_THEME, LOCAL_STORAGE_SIDEBAR_WIDTH } from '@/app/constants';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { DELETE_USER_MODAL_KEY } from '@/features/settings/users/users.constants';
import {
	DELETE_FOLDER_MODAL_KEY,
	MOVE_FOLDER_MODAL_KEY,
} from '@/features/core/folders/folders.constants';
import type { WorkflowListEventMap } from '@/features/core/folders/folders.types';
import {
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_MANAGE_ACTIONS,
} from '@/features/settings/communityNodes/communityNodes.constants';
import { STORES } from '@n8n/stores';
import type {
	XYPosition,
	Modals,
	NewCredentialsModal,
	ThemeOption,
	ModalState,
	ModalKey,
	AppliedThemeOption,
	TabOptions,
	INodeUi,
	NodeCreatorOpenSource,
} from '@/Interface';
import { defineStore } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { applyThemeToBody, getThemeOverride, isValidTheme } from './ui.utils';
import { SHELL_MODAL_INITIAL_STATE } from './defaults/modals';
import { computed, ref, watch } from 'vue';
import type { IMenuItem } from '@n8n/design-system';
import type { Connection } from '@vue-flow/core';
import { useLocalStorage, useMediaQuery } from '@vueuse/core';
import type { EventBus } from '@n8n/utils/event-bus';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import identity from 'lodash/identity';
import { modalRegistry } from '@n8n/frontend-module-sdk';
import { useTelemetry } from '@n8n/composables/useTelemetry';

let savedTheme: ThemeOption = 'system';

try {
	const value = getThemeOverride();
	if (value !== null) {
		savedTheme = value;
		applyThemeToBody(value);
	}
} catch (e) {}

type UiStore = ReturnType<typeof useUIStore>;

/** State a modal key resolves to while it is not registered. */
const CLOSED_MODAL_STATE: ModalState = Object.freeze({ open: false });

/**
 * Read-only view of `source` in which an unknown key reads as `fallback` instead
 * of `undefined`. Modals register at different points in the boot sequence (shell
 * keys eagerly, module keys post-login), so a reader can legitimately run before
 * its key exists — it should see a closed modal, not throw.
 */
function withFallback<T>(source: Record<string, T>, fallback: T): Record<string, T> {
	return new Proxy(source, {
		get: (target, key) =>
			typeof key === 'string' ? (target[key] ?? fallback) : Reflect.get(target, key),
	});
}

/**
 * Definitions (the key and the state it starts in) for every modal the app knows
 * about: the shell's own catalogue plus whatever modules have registered.
 *
 * The registry is shallow-reactive, so reading it here is enough to make callers
 * re-derive when a module registers or unregisters a modal — the store keeps no
 * mirror of it.
 *
 * `shellDefaults` is the caller's own copy of the catalogue (see `ownedCopyOf`) —
 * a definition resolved from here is handed straight to components, and several
 * of them still write to modal state in place.
 */
function modalDefinitionsById(shellDefaults: Record<string, ModalState>) {
	const definitions: Record<string, ModalState> = { ...shellDefaults };

	for (const [key, definition] of modalRegistry.getAll()) {
		definitions[key] = definition.initialState ?? CLOSED_MODAL_STATE;
	}

	return definitions;
}

/**
 * Deep copy of the initial-state catalogue, so nothing the store resolves is a
 * reference into a module-level constant that outlives every store instance.
 * `structuredClone` preserves shared references within the input, so the entries
 * that share a closed-state object still share one copy.
 */
function ownedCopyOf(catalogue: Readonly<Record<string, ModalState>>): Record<string, ModalState> {
	return structuredClone(catalogue) as Record<string, ModalState>;
}

export const useUIStore = defineStore(STORES.UI, () => {
	const telemetry = useTelemetry();
	const activeActions = ref<string[]>([]);
	const activeCredentialType = ref<string | null>(null);
	const theme = useLocalStorage<ThemeOption>(LOCAL_STORAGE_THEME, savedTheme, {
		writeDefaults: false,
		serializer: {
			read: (value) => (isValidTheme(value) ? value : savedTheme),
			write: identity,
		},
	});

	/** This store instance's copy of the shell catalogue (`ownedCopyOf`). */
	const shellModalDefaults = ownedCopyOf(SHELL_MODAL_INITIAL_STATE);

	/**
	 * Runtime modal state, keyed by modal key — only the keys actually touched at
	 * runtime (opened, closed, given data) are present. It is deliberately NOT a
	 * mirror of the definitions: those live in `modalRegistry` (module modals) and
	 * `shellModalDefaults` (shell modals), and `modalsById` below resolves the two
	 * together.
	 */
	const modalStateById = ref<Record<string, ModalState>>({});

	const modalStack = ref<string[]>([]);
	const sidebarMenuCollapsed = useLocalStorage<boolean | null>('sidebar.collapsed', null, {
		serializer: {
			read: (v) => (v === 'null' ? null : v === 'true'),
			write: (v) => String(v),
		},
	});
	const sidebarWidth = useLocalStorage(LOCAL_STORAGE_SIDEBAR_WIDTH, 200);
	const currentView = ref<string>('');
	const stateIsDirty = ref<boolean>(false);
	// This tracks only structural changes without metadata (name or tags)
	const hasUnsavedWorkflowChanges = ref<boolean>(false);
	const dirtyStateSetCount = ref<number>(0);
	const lastSelectedNode = ref<string | null>(null);
	const nodeViewOffsetPosition = ref<[number, number]>([0, 0]);
	const nodeViewInitialized = ref<boolean>(false);
	const addFirstStepOnLoad = ref<boolean>(false);
	// Optional source for the auto-opened node creator (e.g. opened from Instance
	// AI), so the 'User opened nodes panel' event is attributed to its origin.
	const addFirstStepOnLoadSource = ref<NodeCreatorOpenSource>();
	const processingExecutionResults = ref<boolean>(false);
	const isBlankRedirect = ref<boolean>(false);

	/**
	 * Modules can register their ProjectHeader tabs here
	 * Since these tabs are specific to the page they are on,
	 * we add them to separate arrays so pages can pick the right ones
	 * at render time.
	 * Module name is also added to the key so that we can check if the module is active
	 * when tabs are rendered.\
	 * @example
	 * uiStore.registerCustomTabs('overview', 'data-table', [
	 *   {
	 *     label: 'Data table',
	 *     value: 'data-table',
	 *     to: { name: 'data-table' },
	 *   },
	 * ]);
	 */
	const moduleTabs = ref<
		Record<'overview' | 'project' | 'shared', Record<string, Array<TabOptions<string>>>>
	>({
		overview: {},
		project: {},
		shared: {},
	});

	/**
	 * Settings sidebar items registry per module.
	 * Modules can register items and SettingsSidebar will render them
	 * when the corresponding module is active.
	 */
	const registeredSettingsPages = ref<Record<string, IMenuItem[]>>({});

	const appGridDimensions = ref<{ width: number; height: number }>({ width: 0, height: 0 });

	// Last interacted with - Canvas v2 specific
	const lastInteractedWithNodeConnection = ref<Connection | undefined>();
	const lastInteractedWithNodeHandle = ref<string | null>(null);
	const lastInteractedWithNodeId = ref<string | undefined>();
	const lastCancelledConnectionPosition = ref<XYPosition | undefined>();

	const settingsStore = useSettingsStore();

	const isDarkThemePreferred = useMediaQuery('(prefers-color-scheme: dark)');
	const preferredSystemTheme = computed<AppliedThemeOption>(() =>
		isDarkThemePreferred.value ? 'dark' : 'light',
	);

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

	/**
	 * The public read surface: every known modal key resolved to its current state
	 * — its definition's initial state with whatever runtime state has accumulated
	 * on top. An unknown key reads as closed rather than `undefined`, so a reader
	 * that runs before its modal registers renders nothing instead of throwing.
	 *
	 * This is the single derivation that replaced the store's copy of the registry;
	 * writes go to `modalStateById` through the actions below.
	 */
	const modalsById = computed<Record<string, ModalState>>(() => {
		const resolved = modalDefinitionsById(shellModalDefaults);

		for (const [key, runtimeState] of Object.entries(modalStateById.value)) {
			resolved[key] = key in resolved ? { ...resolved[key], ...runtimeState } : runtimeState;
		}

		return withFallback(resolved, CLOSED_MODAL_STATE);
	});

	const isModalActiveById = computed(() =>
		withFallback(
			Object.keys(modalsById.value).reduce((acc: { [key: string]: boolean }, name) => {
				acc[name] = name === modalStack.value[0];
				return acc;
			}, {}),
			false,
		),
	);

	const activeModals = computed(() => modalStack.value.map((modalName) => modalName));

	const settingsSidebarItems = computed<IMenuItem[]>(() => {
		const items: IMenuItem[] = [];
		Object.entries(registeredSettingsPages.value).forEach(([moduleName, moduleItems]) => {
			if (settingsStore.isModuleActive(moduleName)) {
				items.push(...moduleItems.map((item) => ({ available: true, ...item })));
			}
		});
		return items;
	});

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
		return Number(style.getPropertyValue('--header--height'));
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
		applyThemeToBody(newTheme);
	};

	/**
	 * Materialize a modal's runtime state on first touch. Only the fields written
	 * at runtime are stored; the rest is resolved from the definition on read, so
	 * a key that was never registered still works (dataTable builds per-row keys).
	 */
	const patchModalState = (name: ModalKey, patch: Partial<ModalState>): void => {
		modalStateById.value[name] = {
			...modalStateById.value[name],
			...patch,
		} as ModalState;
	};

	/** Discard everything runtime has accumulated for a key, open or not. */
	const forgetModalState = (name: ModalKey): void => {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete modalStateById.value[name];
		modalStack.value = modalStack.value.filter((openModalName) => name !== openModalName);
	};

	/**
	 * Runtime state lives exactly as long as the definition it accumulated under:
	 * a modal unregistered while open must not stay open, and must come back in its
	 * declared initial state if it registers again.
	 *
	 * Ad-hoc keys are told apart from unregistered ones by the registry itself —
	 * only a key that was in it can be taken out of it. dataTable's per-row keys are
	 * never registered, so they never appear in `previouslyRegistered` and are never
	 * swept. Same for the shell catalogue, whose definitions are static.
	 */
	watch(
		() => new Set(modalRegistry.getAll().keys()),
		(registered, previouslyRegistered) => {
			for (const key of previouslyRegistered) {
				if (!registered.has(key)) forgetModalState(key);
			}
		},
		{ flush: 'sync' },
	);

	const setMode = (name: keyof Modals, mode: string): void => {
		patchModalState(name, { mode });
	};

	const setActiveId = (name: keyof Modals, activeId: string | null): void => {
		patchModalState(name, { activeId });
	};

	const setShowAuthSelector = (name: keyof Modals, showAuthSelector: boolean): void => {
		patchModalState(name, { showAuthSelector } as Partial<NewCredentialsModal>);
	};

	const setModalData = (payload: { name: keyof Modals; data: Record<string, unknown> }) => {
		patchModalState(payload.name, { data: payload.data });
	};

	/**
	 * An unknown key resolves to a closed state instead of throwing, so a forgotten
	 * registration reads as "it just doesn't open". This makes that visible, and it
	 * belongs on the open path: by then the key has no `<ModalRoot>` and
	 * `DynamicModalLoader` only walks registered keys, so nothing reads it. Needs
	 * the click, so a modal nobody opens in dev stays silent.
	 */
	const warnIfUnknownModalKey = (name: ModalKey): void => {
		if (!import.meta.env.DEV) return;

		const key = String(name);
		if (key in shellModalDefaults || modalRegistry.has(key) || modalRegistry.isAdHocKey(key)) {
			return;
		}

		console.warn(
			`[modals] Opening "${key}", which nothing defines — no shell catalogue entry and no registry entry, so it will not render.\n` +
				"Register it from the owning feature's `modals.ts`, or declare its prefix with `modalRegistry.declareAdHocKeyPrefix()` if the key is minted at runtime.",
		);
	};

	const openModal = (name: ModalKey) => {
		warnIfUnknownModalKey(name);
		patchModalState(name, { open: true });
		modalStack.value = [name].concat(modalStack.value) as string[];
	};

	const openModalWithData = (payload: { name: ModalKey; data: Record<string, unknown> }) => {
		setModalData(payload);
		openModal(payload.name);
	};

	const closeModal = (name: ModalKey) => {
		patchModalState(name, { open: false });
		modalStack.value = modalStack.value.filter((openModalName) => name !== openModalName);
	};

	const closeAllModals = () => {
		for (const name of modalStack.value) {
			modalsById.value[name] = {
				...modalsById.value[name],
				open: false,
			};
		}
		modalStack.value = [];
	};

	const openDeleteUserModal = (id: string) => {
		setActiveId(DELETE_USER_MODAL_KEY, id);
		openModal(DELETE_USER_MODAL_KEY);
	};

	const openExistingCredential = (
		id: string,
		options: {
			hideAskAssistant?: boolean;
			appendToBody?: boolean;
			instanceAiCredentialHelp?: NewCredentialsModal['instanceAiCredentialHelp'];
		} = {},
	) => {
		setActiveId(CREDENTIAL_EDIT_MODAL_KEY, id);
		setMode(CREDENTIAL_EDIT_MODAL_KEY, 'edit');
		patchModalState(CREDENTIAL_EDIT_MODAL_KEY, {
			projectId: undefined,
			contextNode: undefined,
			closeOnSave: false,
			onCredentialCreated: undefined,
			hideAskAssistant: options.hideAskAssistant,
			appendToBody: options.appendToBody,
			instanceAiCredentialHelp: options.instanceAiCredentialHelp,
		} as Partial<NewCredentialsModal>);
		openModal(CREDENTIAL_EDIT_MODAL_KEY);
	};

	const openNewCredential = (
		type: string,
		showAuthOptions = false,
		forceManualMode = false,
		projectId?: string,
		suggestedName?: string,
		nodeName?: string,
		contextNode?: INodeUi,
		options: {
			hideAskAssistant?: boolean;
			appendToBody?: boolean;
			closeOnSave?: boolean;
			onCredentialCreated?: NewCredentialsModal['onCredentialCreated'];
			instanceAiCredentialHelp?: NewCredentialsModal['instanceAiCredentialHelp'];
			usageScope?: NewCredentialsModal['usageScope'];
			credentialSetupHint?: NewCredentialsModal['credentialSetupHint'];
		} = {},
	) => {
		setActiveId(CREDENTIAL_EDIT_MODAL_KEY, type);
		setShowAuthSelector(CREDENTIAL_EDIT_MODAL_KEY, showAuthOptions);
		patchModalState(CREDENTIAL_EDIT_MODAL_KEY, {
			forceManualMode,
			closeOnSave: options.closeOnSave ?? false,
			onCredentialCreated: options.onCredentialCreated,
			projectId,
			suggestedName,
			nodeName,
			contextNode,
			hideAskAssistant: options.hideAskAssistant,
			appendToBody: options.appendToBody,
			instanceAiCredentialHelp: options.instanceAiCredentialHelp,
			usageScope: options.usageScope,
			credentialSetupHint: options.credentialSetupHint,
		} as Partial<NewCredentialsModal>);
		setMode(CREDENTIAL_EDIT_MODAL_KEY, 'new');
		openModal(CREDENTIAL_EDIT_MODAL_KEY);
	};

	const openCommunityPackageUninstallConfirmModal = (packageName: string) => {
		setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL);
		setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
		openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
	};

	const openCommunityPackageUpdateConfirmModal = (packageName: string, source?: string) => {
		telemetry.track('User clicked to open community node update modal', {
			source,
			package_name: packageName,
		});
		setMode(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE);
		setActiveId(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, packageName);
		openModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
	};

	const openDeleteFolderModal = (
		id: string,
		workflowListEventBus: EventBus<WorkflowListEventMap>,
		content: { workflowCount: number; subFolderCount: number },
	) => {
		setActiveId(DELETE_FOLDER_MODAL_KEY, id);
		openModalWithData({ name: DELETE_FOLDER_MODAL_KEY, data: { workflowListEventBus, content } });
	};

	const openMoveToFolderModal = (
		resourceType: 'folder' | 'workflow',
		resource: {
			id: string;
			name: string;
			parentFolderId?: string;
			sharedWithProjects?: ProjectSharingData[];
			homeProjectId?: string;
		},
		workflowListEventBus: EventBus<WorkflowListEventMap>,
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
		sidebarMenuCollapsed.value = !sidebarMenuCollapsed.value;
		telemetry.track('User toggled sidebar', {
			expanded: !sidebarMenuCollapsed.value,
		});
	};

	function resetLastInteractedWith() {
		lastInteractedWithNodeConnection.value = undefined;
		lastInteractedWithNodeHandle.value = null;
		lastInteractedWithNodeId.value = undefined;
		lastCancelledConnectionPosition.value = undefined;
	}

	const registerCustomTabs = (
		page: 'overview' | 'project' | 'shared',
		moduleName: string,
		tabs: Array<TabOptions<string>>,
	) => {
		if (!moduleTabs.value[page]) {
			throw new Error(`Invalid page type: ${page}`);
		}
		moduleTabs.value[page][moduleName] = tabs;
	};

	const registerSettingsPages = (moduleName: string, items: IMenuItem[]) => {
		registeredSettingsPages.value[moduleName] = items;
	};

	/**
	 * Set whether we are currently in the process of fetching and deserializing
	 * the full execution data and loading it to the store.
	 */
	const setProcessingExecutionResults = (value: boolean) => {
		processingExecutionResults.value = value;
	};

	const markStateDirty = (type: 'workflow' | 'metadata' = 'workflow') => {
		dirtyStateSetCount.value++;
		stateIsDirty.value = true;
		if (type === 'workflow') {
			hasUnsavedWorkflowChanges.value = true;
		}
	};

	const markStateClean = () => {
		stateIsDirty.value = false;
		hasUnsavedWorkflowChanges.value = false;
	};

	return {
		appGridDimensions,
		settingsSidebarItems,
		appliedTheme,
		contextBasedTranslationKeys,
		isModalActiveById,
		isReadOnlyView,
		isActionActive,
		activeActions,
		headerHeight,
		dirtyStateSetCount: computed(() => dirtyStateSetCount.value),
		stateIsDirty: computed(() => stateIsDirty.value),
		hasUnsavedWorkflowChanges: computed(() => hasUnsavedWorkflowChanges.value),
		isBlankRedirect,
		activeCredentialType,
		lastSelectedNode,
		lastInteractedWithNodeConnection,
		lastInteractedWithNodeHandle,
		lastInteractedWithNodeId,
		lastCancelledConnectionPosition,
		nodeViewOffsetPosition,
		nodeViewInitialized,
		addFirstStepOnLoad,
		addFirstStepOnLoadSource,
		sidebarMenuCollapsed,
		sidebarWidth,
		theme: computed(() => theme.value),
		modalsById,
		modalStateById,
		currentView,
		isAnyModalOpen,
		activeModals,
		isProcessingExecutionResults,
		setTheme,
		setModalData,
		openModalWithData,
		openModal,
		closeModal,
		closeAllModals,
		openDeleteUserModal,
		openExistingCredential,
		openNewCredential,
		openCommunityPackageUninstallConfirmModal,
		openCommunityPackageUpdateConfirmModal,
		addActiveAction,
		removeActiveAction,
		toggleSidebarMenuCollapse,
		resetLastInteractedWith,
		setProcessingExecutionResults,
		markStateDirty,
		markStateClean,
		openDeleteFolderModal,
		openMoveToFolderModal,
		moduleTabs,
		registerCustomTabs,
		registerSettingsPages,
	};
});

/**
 * Listen for modals opening and closing.
 *
 * Derived from which modals are open, not from which actions were called: there
 * is more than one way a modal closes — `closeModal`, and its definition being
 * unregistered — and an observer keyed on action names sees only the first. That
 * shape breaks silently, with no type error, every time a close path is added.
 *
 * Returns a stop handle, and is owned by the effect scope it is created in, so a
 * caller inside `effectScope()` disposes it by stopping that scope.
 */
export const listenForModalChanges = (opts: {
	store: UiStore;
	onModalOpened?: (name: keyof Modals) => void;
	onModalClosed?: (name: keyof Modals) => void;
}) => {
	const { store, onModalClosed, onModalOpened } = opts;

	return watch(
		() => store.activeModals,
		(openList, previouslyOpenList) => {
			// Deduplicated: the same key can sit on the stack more than once (two
			// callers opening the credential modal), and that must still read as one
			// modal opening once and closing once.
			const open = new Set(openList);
			const previouslyOpen = new Set(previouslyOpenList);

			for (const name of open) {
				if (!previouslyOpen.has(name)) onModalOpened?.(name);
			}
			for (const name of previouslyOpen) {
				if (!open.has(name)) onModalClosed?.(name);
			}
		},
		{ flush: 'sync' },
	);
};
