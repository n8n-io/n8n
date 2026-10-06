import { flushPromises } from '@vue/test-utils';
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
	skillsStore,
	uiStore,
	usersStore,
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
	router: {
		push: vi.fn(),
		resolve: vi.fn((to: { name: string; query?: Record<string, string> }) => ({
			href: `/${to.name}${to.query ? `?${new URLSearchParams(to.query).toString()}` : ''}`,
		})),
	},
	skillsStore: {
		fetchSkills: vi.fn<() => Promise<{ count: number; data: Array<Record<string, unknown>> }>>(),
	},
	usersStore: { currentUserId: 'user-1' as string | null },
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

vi.mock('@/features/settings/context/skills.store', () => ({
	useSkillsHubStore: () => skillsStore,
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => usersStore,
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
		skillsStore.fetchSkills.mockResolvedValue({ count: 0, data: [] });
		usersStore.currentUserId = 'user-1';
		mcpStore.connections = [];
		settingsStore.isMcpAvailable = true;
		settingsStore.isLocalGatewayDisabled = false;
		settingsStore.isComputerUseAvailable = true;
		settingsStore.isBrowserUseAvailable = true;
		settingsStore.isGatewayConnected = false;
		settingsStore.computerUseConnectionStatus = 'none';
		settingsStore.browserUseConnectionStatus = 'none';
		settingsStore.gatewayHostIdentifier = null;
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

		it('lists exactly what the payload names, in payload order, grouped by scope', async () => {
			featureFlags.preferences = true;
			setApplied('thread-1', [
				{ id: 'inst-1', scope: 'instance' },
				{ id: 'user-1', scope: 'user' },
				{ id: 'user-2', scope: 'user' },
				{ id: 'proj-1', scope: 'project', projectId: 'p-1', projectName: 'Marketing' },
			]);
			// The lookup answers in a different order and without the row that was removed.
			contextStore.fetchPreferencesByIds.mockResolvedValue([
				{ id: 'user-2', content: 'Prefer Postgres' },
				{ id: 'inst-1', content: 'Name nodes clearly' },
				{ id: 'proj-1', content: 'Post to #marketing' },
			]);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');
			await flushPromises();

			expect(contextStore.fetchPreferencesByIds).toHaveBeenCalledWith([
				'inst-1',
				'user-1',
				'user-2',
				'proj-1',
			]);
			const children = findItem(menuItems.value, 'preferences')?.children ?? [];
			expect(children.map(({ id, label, header }) => ({ id, label, header }))).toEqual([
				{
					id: 'preferences-group-instance',
					label: 'settings.context.preferences.scope.instance',
					header: true,
				},
				{ id: 'preference-inst-1', label: 'Name nodes clearly', header: undefined },
				{
					id: 'preferences-group-user',
					label: 'instanceAi.inputMenu.preferences.scope.user',
					header: true,
				},
				{
					id: 'preference-user-1',
					label: 'instanceAi.inputMenu.preferences.removed',
					header: undefined,
				},
				{ id: 'preference-user-2', label: 'Prefer Postgres', header: undefined },
				{ id: 'preferences-group-project-p-1', label: 'Marketing', header: true },
				{ id: 'preference-proj-1', label: 'Post to #marketing', header: undefined },
				{
					id: 'preferences-manage',
					label: 'instanceAi.inputMenu.preferences.manage',
					header: undefined,
				},
			]);
			expect(findItem(menuItems.value, 'preference-user-1')?.data?.preference).toBe('removed');
			expect(findItem(menuItems.value, 'preference-user-2')?.data?.preference).toBe('applied');
		});

		it('keeps the list when the text lookup fails, and does not call the rows removed', async () => {
			featureFlags.preferences = true;
			setApplied('thread-1', [{ id: 'user-1', scope: 'user' }]);
			contextStore.fetchPreferencesByIds.mockRejectedValue(new Error('offline'));

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');
			await flushPromises();

			const item = findItem(menuItems.value, 'preference-user-1');
			expect(item?.label).toBe('instanceAi.inputMenu.preferences.unavailable');
			expect(item?.data?.preference).toBe('unavailable');
			expect(findItem(menuItems.value, 'preferences')?.loading).toBe(false);
		});

		it('keeps texts it already resolved when a later lookup fails', async () => {
			featureFlags.preferences = true;
			setApplied('thread-1', [{ id: 'user-1', scope: 'user' }]);
			contextStore.fetchPreferencesByIds.mockResolvedValue([{ id: 'user-1', content: 'known' }]);

			const { menuItems, refreshAppliedPreferences } = useInstanceAiInputMenuItems(
				vi.fn(),
				() => 'thread-1',
			);
			await flushPromises();

			contextStore.fetchPreferencesByIds.mockRejectedValue(new Error('offline'));
			await refreshAppliedPreferences();

			expect(findItem(menuItems.value, 'preference-user-1')?.label).toBe('known');
		});

		it('re-reads the texts on demand, so an edit in settings shows up', async () => {
			featureFlags.preferences = true;
			setApplied('thread-1', [{ id: 'user-1', scope: 'user' }]);
			contextStore.fetchPreferencesByIds.mockResolvedValue([{ id: 'user-1', content: 'old' }]);

			const { menuItems, refreshAppliedPreferences } = useInstanceAiInputMenuItems(
				vi.fn(),
				() => 'thread-1',
			);
			await flushPromises();
			expect(findItem(menuItems.value, 'preference-user-1')?.label).toBe('old');

			contextStore.fetchPreferencesByIds.mockResolvedValue([{ id: 'user-1', content: 'new' }]);
			await refreshAppliedPreferences();

			expect(findItem(menuItems.value, 'preference-user-1')?.label).toBe('new');
		});

		it('opens the Context settings page in a new tab', async () => {
			featureFlags.preferences = true;
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn(), () => 'thread-1');
			await findItem(menuItems.value, 'preferences-manage')?.data?.action?.();

			expect(router.resolve).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
			expect(openSpy).toHaveBeenCalledWith('/SettingsContextPreferences', '_blank');
			expect(router.push).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});
	describe('skills hub', () => {
		function hubSkill(
			id: string,
			name: string,
			scope: 'user' | 'instance' | 'project',
			userId?: string,
		) {
			return { id, name, scope, userId: userId ?? null, projectId: null, description: '' };
		}

		it('hides the section while the flag is off', () => {
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

			expect(findItem(menuItems.value, 'skills')).toBeUndefined();
			expect(skillsStore.fetchSkills).not.toHaveBeenCalled();
		});

		it('shows the empty state, with manage and create, when the hub has nothing for the assistant', async () => {
			featureFlags.preferences = true;

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await flushPromises();

			expect(findItem(menuItems.value, 'skills')?.children?.map(({ id }) => id)).toEqual([
				'skills-empty',
				'skills-manage',
				'skills-create',
			]);
			expect(findItem(menuItems.value, 'skills-empty')?.disabled).toBe(true);
		});

		it("lists the user's own and the instance skills by name, grouped by scope, and skips the rest", async () => {
			featureFlags.preferences = true;
			skillsStore.fetchSkills.mockResolvedValue({
				count: 5,
				data: [
					hubSkill('skill_tone', 'support-tone', 'instance'),
					hubSkill('skill_notes', 'crit-notes', 'user', 'user-1'),
					hubSkill('skill_other', 'someone-else', 'user', 'user-2'),
					hubSkill('skill_proj', 'project-only', 'project'),
					hubSkill('skill_creds', 'creds-rotation', 'instance'),
				],
			});

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await flushPromises();

			const children = findItem(menuItems.value, 'skills')?.children ?? [];
			expect(children.map(({ id, label, header }) => ({ id, label, header }))).toEqual([
				{ id: 'skills-group-user', label: 'instanceAi.inputMenu.skills.scope.user', header: true },
				{ id: 'skill-skill_notes', label: 'crit-notes', header: undefined },
				{
					id: 'skills-group-instance',
					label: 'settings.context.skills.scope.instance',
					header: true,
				},
				{ id: 'skill-skill_creds', label: 'creds-rotation', header: undefined },
				{ id: 'skill-skill_tone', label: 'support-tone', header: undefined },
				{ id: 'skills-manage', label: 'instanceAi.inputMenu.skills.manage', header: undefined },
				{ id: 'skills-create', label: 'instanceAi.inputMenu.skills.create', header: undefined },
			]);
		});

		it('reads as unavailable, not as empty, when the hub read fails', async () => {
			featureFlags.preferences = true;
			skillsStore.fetchSkills.mockRejectedValue(new Error('offline'));

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await flushPromises();

			expect(findItem(menuItems.value, 'skills-unavailable')?.disabled).toBe(true);
			expect(findItem(menuItems.value, 'skills-empty')).toBeUndefined();
		});

		it('opens the hub page in a new tab: a skill to edit, the list, or the create flow', async () => {
			featureFlags.preferences = true;
			skillsStore.fetchSkills.mockResolvedValue({
				count: 1,
				data: [hubSkill('skill_notes', 'crit-notes', 'user', 'user-1')],
			});
			const open = vi.spyOn(window, 'open').mockImplementation(() => null);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await flushPromises();
			await findItem(menuItems.value, 'skill-skill_notes')?.data?.action?.();
			await findItem(menuItems.value, 'skills-manage')?.data?.action?.();
			await findItem(menuItems.value, 'skills-create')?.data?.action?.();

			expect(open.mock.calls.map(([url]) => url)).toEqual([
				'/SettingsContextSkills?skillId=skill_notes',
				'/SettingsContextSkills',
				'/SettingsContextSkills?create=true',
			]);
			open.mockRestore();
		});

		it('re-reads the hub on demand, so a skill saved in settings shows up', async () => {
			featureFlags.preferences = true;

			const { menuItems, refreshAssistantSkills } = useInstanceAiInputMenuItems(vi.fn());
			await flushPromises();
			expect(findItem(menuItems.value, 'skills-empty')).toBeDefined();

			skillsStore.fetchSkills.mockResolvedValue({
				count: 1,
				data: [hubSkill('skill_new', 'new-skill', 'instance')],
			});
			await refreshAssistantSkills();

			expect(findItem(menuItems.value, 'skill-skill_new')?.label).toBe('new-skill');
		});
	});
});
