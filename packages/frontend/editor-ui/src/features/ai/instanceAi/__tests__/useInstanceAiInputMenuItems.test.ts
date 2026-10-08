import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';
import {
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';
import { VIEWS } from '@/app/constants';

// Reactive, so that a test can switch the mode while the menu is in use.
const { experience } = await vi.hoisted(async () => {
	const { reactive } = await import('vue');
	return {
		experience: reactive({
			isSimple: false,
			defaultProjectId: 'team-project-1' as string | undefined,
		}),
	};
});

vi.mock('../experience/useExperienceMode', async () => {
	const { computed } = await import('vue');
	return { useExperienceMode: () => ({ isSimple: computed(() => experience.isSimple) }) };
});

vi.mock('../experience/useLastUsedProject', () => ({
	useLastUsedProject: () => ({ simpleDefaultProjectId: () => experience.defaultProjectId }),
}));

// The projects of the user, with the scopes that "Add workflow" checks, and the branch state.
const { projectsStore, sourceControlStore } = vi.hoisted(() => ({
	projectsStore: {
		personalProject: null as { id: string; scopes: string[] } | null,
		myProjects: [] as Array<{ id: string; scopes: string[] }>,
	},
	sourceControlStore: { preferences: { branchReadOnly: false } },
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStore,
}));

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: () => sourceControlStore,
}));

const {
	browserUseTelemetry,
	contextStore,
	ensureBrowserConnected,
	computerUseTelemetry,
	featureFlags,
	ignorePendingConnectResult,
	instanceAiStore,
	mcpStore,
	mcpTelemetry,
	router,
	settingsStore,
	uiStore,
} = vi.hoisted(() => ({
	browserUseTelemetry: { trackModalOpened: vi.fn() },
	contextStore: {
		fetchPreferencesByIds:
			vi.fn<(ids: string[]) => Promise<Array<{ id: string; content: string }>>>(),
	},
	ensureBrowserConnected: vi.fn(),
	computerUseTelemetry: { trackModalOpened: vi.fn() },
	featureFlags: { computerUse: true, preferences: true },
	ignorePendingConnectResult: vi.fn(),
	instanceAiStore: {
		runtimes: new Map<string, { appliedPreferences: unknown }>(),
		getRuntime(threadId: string) {
			return this.runtimes.get(threadId);
		},
	},
	router: { push: vi.fn(), resolve: vi.fn(() => ({ href: '/settings/context/preferences' })) },
	mcpStore: {
		connections: [] as Array<Record<string, unknown>>,
		fetchConnectionsLazy: vi.fn(),
		disconnect: vi.fn(),
	},
	mcpTelemetry: {
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	},
	settingsStore: {
		fetch: vi.fn(),
		isMcpAvailable: true,
		isLocalGatewayDisabled: false,
		isComputerUseAvailable: true,
		isBrowserUseAvailable: true,
		isGatewayConnected: false,
		computerUseConnectionStatus: 'none',
		browserUseConnectionStatus: 'none',
		gatewayHostIdentifier: null as string | null,
		persistLocalGatewayPreference: vi.fn(),
		disconnectComputerUse: vi.fn(),
		disconnectBrowserUse: vi.fn(),
	},
	uiStore: {
		appliedTheme: 'light',
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
	},
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => router,
}));

vi.mock('@/features/settings/context/context.store', () => ({
	useContextStore: () => contextStore,
}));

vi.mock('@/features/settings/context/context.utils', () => ({
	isContextPreferencesEnabled: () => featureFlags.preferences,
}));

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => instanceAiStore,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStore,
}));

vi.mock('../composables/useBrowserUseConnection', () => ({
	useBrowserUseConnection: () => ({ ensureConnected: ensureBrowserConnected }),
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: () => ({
		isFeatureEnabled: {
			get value() {
				return featureFlags.computerUse;
			},
		},
	}),
}));

vi.mock('../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStore,
}));

vi.mock('../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => mcpStore,
}));

vi.mock('../composables/useMcpServerConnect', () => ({
	useMcpServerConnect: () => ({ ignorePendingConnectResult }),
}));

vi.mock('../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => mcpTelemetry,
}));

vi.mock('../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => browserUseTelemetry,
}));

vi.mock('../instanceAiComputerUse.telemetry', () => ({
	useInstanceAiComputerUseTelemetry: () => computerUseTelemetry,
}));

function findItem(items: InputMenuItem[], id: string): InputMenuItem | undefined {
	for (const item of items) {
		if (item.id === id) return item;
		const child = item.children ? findItem(item.children, id) : undefined;
		if (child) return child;
	}
	return undefined;
}

function makeMcpConnection(id: string, status: 'connected' | 'connecting' | 'disconnected') {
	return {
		id,
		serverSlug: `server-${id}`,
		serverTitle: `Server ${id}`,
		serverIcons: [],
		credentialName: `Credential ${id}`,
		status,
	};
}

const mcpStatusCases: Array<{
	statuses: Array<'connected' | 'connecting' | 'disconnected'>;
	expectedStatus: 'connected' | 'connecting' | 'disconnected' | undefined;
}> = [
	{ statuses: [], expectedStatus: undefined },
	{ statuses: ['connected'], expectedStatus: 'connected' },
	{ statuses: ['connected', 'disconnected'], expectedStatus: 'disconnected' },
	{ statuses: ['disconnected', 'connecting'], expectedStatus: 'connecting' },
];

describe('useInstanceAiInputMenuItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		featureFlags.computerUse = true;
		featureFlags.preferences = false;
		instanceAiStore.runtimes.clear();
		contextStore.fetchPreferencesByIds.mockResolvedValue([]);
		mcpStore.connections = [];
		settingsStore.isMcpAvailable = true;
		settingsStore.isLocalGatewayDisabled = false;
		settingsStore.isComputerUseAvailable = true;
		settingsStore.isBrowserUseAvailable = true;
		settingsStore.isGatewayConnected = false;
		settingsStore.computerUseConnectionStatus = 'none';
		settingsStore.browserUseConnectionStatus = 'none';
		settingsStore.gatewayHostIdentifier = null;
		experience.isSimple = false;
		experience.defaultProjectId = 'team-project-1';
		projectsStore.personalProject = { id: 'personal-project', scopes: ['workflow:create'] };
		projectsStore.myProjects = [
			{ id: 'personal-project', scopes: ['workflow:create'] },
			{ id: 'team-project-1', scopes: ['workflow:read', 'workflow:create'] },
		];
		sourceControlStore.preferences.branchReadOnly = false;
	});

	it('omits connection groups that instance settings report as unavailable', () => {
		settingsStore.isMcpAvailable = false;
		settingsStore.isComputerUseAvailable = false;
		settingsStore.isBrowserUseAvailable = false;

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(menuItems.value.map(({ id }) => id)).toEqual(['attach-files']);
		expect(mcpStore.fetchConnectionsLazy).not.toHaveBeenCalled();
	});

	it('fetches MCP connections when MCP becomes available', async () => {
		const isMcpAvailable = ref(false);
		const originalDescriptor = Object.getOwnPropertyDescriptor(settingsStore, 'isMcpAvailable');
		Object.defineProperty(settingsStore, 'isMcpAvailable', {
			configurable: true,
			get: () => isMcpAvailable.value,
			set: (value: boolean) => {
				isMcpAvailable.value = value;
			},
		});

		try {
			useInstanceAiInputMenuItems(vi.fn());
			expect(mcpStore.fetchConnectionsLazy).not.toHaveBeenCalled();

			settingsStore.isMcpAvailable = true;
			await nextTick();

			expect(mcpStore.fetchConnectionsLazy).toHaveBeenCalledOnce();
		} finally {
			Object.defineProperty(settingsStore, 'isMcpAvailable', originalDescriptor!);
		}
	});

	it.each(mcpStatusCases)(
		'summarizes MCP statuses $statuses as $expectedStatus',
		({ statuses, expectedStatus }) => {
			mcpStore.connections = statuses.map((status, index) =>
				makeMcpConnection(String(index), status),
			);

			const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());
			const tools = findItem(menuItems.value, 'tools');

			expect(tools?.data?.status).toBe(expectedStatus);
			expect(disconnectedConnectionCount.value).toBe(
				statuses.filter((status) => status === 'disconnected').length,
			);
		},
	);

	it.each([
		{
			id: 'computer',
			setDisconnected: () => {
				settingsStore.computerUseConnectionStatus = 'disconnected';
				settingsStore.gatewayHostIdentifier = 'Work computer';
			},
			modal: INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
			title: 'Work computer',
		},
		{
			id: 'browser',
			setDisconnected: () => {
				settingsStore.browserUseConnectionStatus = 'disconnected';
			},
			// Browser Use reconnects through the shared flow, which opens a modal only when
			// the extension actually needs the user.
			modal: null,
			title: 'instanceAi.inputMenu.browser.connectedTitle',
		},
	])(
		'shows a Reconnect menu when $id disconnects unexpectedly',
		async ({ id, setDisconnected, modal, title }) => {
			setDisconnected();
			const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

			const item = findItem(menuItems.value, id);
			expect(item?.data?.status).toBe('disconnected');
			expect(item?.data?.action).toBeUndefined();
			expect(findItem(menuItems.value, `${id}-status`)?.label).toBe(title);
			expect(disconnectedConnectionCount.value).toBe(1);

			await findItem(menuItems.value, `${id}-reconnect`)?.data?.action?.();
			if (modal) {
				expect(uiStore.openModal).toHaveBeenCalledWith(modal);
			} else {
				expect(ensureBrowserConnected).toHaveBeenCalledWith('input_menu');
				expect(uiStore.openModal).not.toHaveBeenCalled();
			}
		},
	);

	it('keeps user-disconnected services as direct Connect actions', () => {
		const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

		for (const id of ['computer', 'browser']) {
			const item = findItem(menuItems.value, id);
			expect(item?.data?.status).toBe('none');
			expect(item?.children).toBeUndefined();
			expect(item?.data?.action).toBeTypeOf('function');
		}
		expect(disconnectedConnectionCount.value).toBe(0);
	});

	it('does not offer direct Browser Use disconnect when browser access comes from Computer Use', () => {
		settingsStore.isGatewayConnected = true;

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(findItem(menuItems.value, 'browser-disconnect')).toBeUndefined();
		expect(findItem(menuItems.value, 'browser')?.label).toBe(
			'instanceAi.inputMenu.browser.connect',
		);
	});

	it('disconnects Browser Use when the direct extension is connected', async () => {
		settingsStore.browserUseConnectionStatus = 'connected';

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
		await findItem(menuItems.value, 'browser-disconnect')?.data?.action?.();

		expect(settingsStore.disconnectBrowserUse).toHaveBeenCalledOnce();
	});

	it('shows Computer Use as connecting while daemon pairing is in progress', () => {
		settingsStore.computerUseConnectionStatus = 'connecting';

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(findItem(menuItems.value, 'computer')?.data?.status).toBe('connecting');
	});

	it('delegates attachment and connection actions to their owners', async () => {
		const attachFiles = vi.fn();
		settingsStore.isLocalGatewayDisabled = true;
		settingsStore.isGatewayConnected = true;
		settingsStore.computerUseConnectionStatus = 'connected';
		mcpStore.connections = [makeMcpConnection('1', 'connected')];
		const { menuItems } = useInstanceAiInputMenuItems(attachFiles);

		await findItem(menuItems.value, 'attach-files')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-setup')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-disconnect')?.data?.action?.();
		await findItem(menuItems.value, 'computer-disconnect')?.data?.action?.();
		await findItem(menuItems.value, 'browser')?.data?.action?.();

		expect(attachFiles).toHaveBeenCalledOnce();
		expect(mcpTelemetry.trackSettingsOpened).toHaveBeenCalledWith('server-1', 'input_menu');
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
			data: { connectionId: '1' },
		});
		expect(mcpStore.disconnect).toHaveBeenCalledWith('1');
		expect(ignorePendingConnectResult).toHaveBeenCalledWith('server-1');
		expect(ignorePendingConnectResult.mock.invocationCallOrder[0]).toBeLessThan(
			mcpStore.disconnect.mock.invocationCallOrder[0] ?? 0,
		);
		expect(settingsStore.disconnectComputerUse).toHaveBeenCalledOnce();
		expect(ensureBrowserConnected).toHaveBeenCalledWith('input_menu');
	});

	describe('applied preferences', () => {
		function setApplied(threadId: string, preferences: unknown[] | null) {
			instanceAiStore.runtimes.set(threadId, {
				appliedPreferences:
					preferences === null ? null : { preferences, renderedLength: 10, injectedThisTurn: true },
			});
		}

		it('hides the section while the flag is off', () => {
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');

			expect(findItem(menuItems.value, 'preferences')).toBeUndefined();
		});

		it('shows the empty state, not a hidden item, before a turn reported anything', () => {
			featureFlags.preferences = true;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => undefined);
			const section = findItem(menuItems.value, 'preferences');

			expect(section?.children?.map(({ id }) => id)).toEqual([
				'preferences-empty',
				'preferences-manage',
			]);
			expect(findItem(menuItems.value, 'preferences-empty')?.disabled).toBe(true);
			expect(contextStore.fetchPreferencesByIds).not.toHaveBeenCalled();
		});

		it('shows the empty state for a turn that reported an empty payload', () => {
			featureFlags.preferences = true;
			setApplied('thread-1', []);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');

			expect(findItem(menuItems.value, 'preferences-empty')).toBeDefined();
		});

		it('opens the Context settings page in a new tab', async () => {
			featureFlags.preferences = true;
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');
			await findItem(menuItems.value, 'preferences-manage')?.data?.action?.();

			expect(router.resolve).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
			expect(openSpy).toHaveBeenCalledWith('/settings/context/preferences', '_blank');
			expect(router.push).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});

	describe('in Simple mode', () => {
		const ids = (items: InputMenuItem[]) => items.map(({ id }) => id);

		/** Every item of today's menu can show: MCP connections, computer, browser and preferences. */
		function offerEverything() {
			featureFlags.preferences = true;
			mcpStore.connections = [makeMcpConnection('1', 'connected')];
		}

		it('shows exactly "Attach files", the computer, the browser and "Add workflow"', () => {
			offerEverything();
			experience.isSimple = true;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(ids(menuItems.value)).toEqual(['attach-files', 'computer', 'browser', 'add-workflow']);
			expect(menuItems.value.map(({ label }) => label)).toEqual([
				'chatInputBase.button.attach',
				'instanceAi.inputMenu.computer.connect',
				'instanceAi.inputMenu.browser.connect',
				'workflows.add',
			]);
			expect(findItem(menuItems.value, 'add-tool')).toBeUndefined();
			expect(findItem(menuItems.value, 'mcp-1')).toBeUndefined();
			expect(findItem(menuItems.value, 'preferences-manage')).toBeUndefined();
		});

		it('keeps the full menu in Power mode and with the flag off', () => {
			offerEverything();

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(ids(menuItems.value)).toEqual([
				'attach-files',
				'tools',
				'computer',
				'browser',
				'preferences',
			]);
			expect(findItem(menuItems.value, 'add-workflow')).toBeUndefined();
		});

		it('follows a switch of the mode while the menu is in use', () => {
			offerEverything();
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			experience.isSimple = true;
			expect(ids(menuItems.value)).toEqual(['attach-files', 'computer', 'browser', 'add-workflow']);

			experience.isSimple = false;
			expect(ids(menuItems.value)).toContain('tools');
		});

		it('leaves out the computer and the browser when the instance does not offer them', () => {
			experience.isSimple = true;
			settingsStore.isComputerUseAvailable = false;
			settingsStore.isBrowserUseAvailable = false;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(ids(menuItems.value)).toEqual(['attach-files', 'add-workflow']);
		});

		it('opens the new workflow in the same tab, in the project of new Simple chats', async () => {
			experience.isSimple = true;
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await findItem(menuItems.value, 'add-workflow')?.data?.action?.();

			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: 'team-project-1' },
			});
			expect(openSpy).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});

		it('reads the project when the user picks "Add workflow", not when the menu is built', async () => {
			experience.isSimple = true;
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			experience.defaultProjectId = 'personal-project';
			await findItem(menuItems.value, 'add-workflow')?.data?.action?.();

			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: 'personal-project' },
			});
		});

		it('offers "Add workflow" when the user can create a workflow in the project', () => {
			experience.isSimple = true;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(findItem(menuItems.value, 'add-workflow')?.disabled).toBe(false);
		});

		it('disables "Add workflow" on a protected branch, like the sidebar + menu', async () => {
			experience.isSimple = true;
			sourceControlStore.preferences.branchReadOnly = true;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			const item = findItem(menuItems.value, 'add-workflow');
			await item?.data?.action?.();

			expect(item?.disabled).toBe(true);
			expect(router.push).not.toHaveBeenCalled();
		});

		it('disables "Add workflow" when the user cannot create workflows in the project', async () => {
			experience.isSimple = true;
			experience.defaultProjectId = 'personal-project';
			projectsStore.personalProject = { id: 'personal-project', scopes: ['workflow:read'] };

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			const item = findItem(menuItems.value, 'add-workflow');
			await item?.data?.action?.();

			expect(item?.disabled).toBe(true);
			expect(router.push).not.toHaveBeenCalled();
		});

		it('disables "Add workflow" when there is no project to create the workflow in', () => {
			experience.isSimple = true;
			experience.defaultProjectId = undefined;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(findItem(menuItems.value, 'add-workflow')?.disabled).toBe(true);
		});

		it('creates no workflow when the rights are gone by the time the user picks the item', async () => {
			experience.isSimple = true;
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			const action = findItem(menuItems.value, 'add-workflow')?.data?.action;

			projectsStore.myProjects = [{ id: 'team-project-1', scopes: ['workflow:read'] }];
			await action?.();

			expect(router.push).not.toHaveBeenCalled();
		});

		it('keeps the behaviour of the items it shows', async () => {
			experience.isSimple = true;
			const attachFiles = vi.fn();

			const { menuItems } = useInstanceAiInputMenuItems(attachFiles);
			await findItem(menuItems.value, 'attach-files')?.data?.action?.();
			await findItem(menuItems.value, 'computer')?.data?.action?.();
			await findItem(menuItems.value, 'browser')?.data?.action?.();

			expect(attachFiles).toHaveBeenCalledTimes(1);
			expect(uiStore.openModal).toHaveBeenCalledWith(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
			expect(ensureBrowserConnected).toHaveBeenCalledWith('input_menu');
		});

		it('asks for attention only for the connections that the menu shows', () => {
			mcpStore.connections = [
				makeMcpConnection('1', 'disconnected'),
				makeMcpConnection('2', 'disconnected'),
			];
			settingsStore.browserUseConnectionStatus = 'disconnected';

			const power = useInstanceAiInputMenuItems(vi.fn());
			expect(power.disconnectedConnectionCount.value).toBe(3);

			experience.isSimple = true;
			const simple = useInstanceAiInputMenuItems(vi.fn());
			expect(simple.disconnectedConnectionCount.value).toBe(1);

			settingsStore.browserUseConnectionStatus = 'connected';
			const simpleConnected = useInstanceAiInputMenuItems(vi.fn());
			expect(simpleConnected.disconnectedConnectionCount.value).toBe(0);
		});
	});
});
