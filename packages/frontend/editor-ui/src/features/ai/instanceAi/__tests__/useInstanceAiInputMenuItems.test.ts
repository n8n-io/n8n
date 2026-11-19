import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { SkillListItem, SkillListResponse } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';
import { INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY } from '../constants';

const {
	browserUseTelemetry,
	ensureBrowserConnected,
	featureFlags,
	getSkills,
	ignorePendingConnectResult,
	mcpStore,
	mcpTelemetry,
	projectsStore,
	rootStore,
	router,
	settingsStore,
	uiStore,
	usersStore,
} = vi.hoisted(() => ({
	browserUseTelemetry: { trackModalOpened: vi.fn() },
	ensureBrowserConnected: vi.fn(),
	featureFlags: { assistantSkills: false, skills: true },
	getSkills: vi.fn<typeof import('@/features/settings/context/skills.api').getSkills>(),
	ignorePendingConnectResult: vi.fn(),
	mcpStore: {
		connections: [] as Array<Record<string, unknown>>,
		fetchConnectionsLazy: vi.fn(),
		disconnect: vi.fn(),
	},
	mcpTelemetry: {
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	},
	projectsStore: {
		personalProject: null as { id: string } | null,
		myProjects: [] as Array<{
			id: string;
			type: 'personal' | 'team';
			scopes: Array<'projectSkill:create'>;
		}>,
	},
	rootStore: { restApiContext: { baseUrl: '/rest', pushRef: '' } },
	router: {
		push: vi.fn(),
		resolve: vi.fn(() => ({ href: '/settings/context/preferences' })),
	},
	settingsStore: {
		fetch: vi.fn(),
		isMcpAvailable: true,
		isBrowserUseAvailable: true,
		browserUseConnectionStatus: 'none',
		disconnectBrowserUse: vi.fn(),
	},
	uiStore: {
		appliedTheme: 'light',
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
	},
	usersStore: { currentUser: { globalScopes: [] as Array<'skill:create'> } },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => router,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStore,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => rootStore,
}));

vi.mock('@/experiments/assistantSkills/useAssistantSkillsExperiment', () => ({
	useAssistantSkillsExperiment: () => ({ isEnabled: ref(featureFlags.assistantSkills) }),
}));

vi.mock('@/features/settings/context/context.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/settings/context/context.utils')>()),
	isContextSkillsEnabled: () => featureFlags.skills,
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStore,
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => usersStore,
}));

vi.mock('@/features/settings/context/skills.api', () => ({ getSkills }));

vi.mock('../composables/useBrowserUseConnection', () => ({
	useBrowserUseConnection: () => ({ ensureConnected: ensureBrowserConnected }),
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

function makeSkill(id: string, name: string, overrides: Partial<SkillListItem> = {}) {
	return mock<SkillListItem>({
		id,
		name,
		description: 'Skill description',
		scope: 'instance',
		projectId: null,
		availableToAssistant: true,
		...overrides,
	});
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
		featureFlags.assistantSkills = false;
		featureFlags.skills = true;
		projectsStore.personalProject = null;
		projectsStore.myProjects = [];
		usersStore.currentUser.globalScopes = ['skill:create'];
		getSkills.mockResolvedValue({ data: [], count: 0 });
		mcpStore.connections = [];
		settingsStore.isMcpAvailable = true;
		settingsStore.isBrowserUseAvailable = true;
		settingsStore.browserUseConnectionStatus = 'none';
	});

	it('omits connection groups that instance settings report as unavailable', () => {
		settingsStore.isMcpAvailable = false;
		settingsStore.isBrowserUseAvailable = false;

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(menuItems.value.map(({ id }) => id)).toEqual(['attach-files', 'preferences']);
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

	it('shows a Reconnect menu when Browser Use disconnects unexpectedly', async () => {
		settingsStore.browserUseConnectionStatus = 'disconnected';
		const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

		const item = findItem(menuItems.value, 'browser');
		expect(item?.data?.status).toBe('disconnected');
		expect(item?.data?.action).toBeUndefined();
		expect(findItem(menuItems.value, 'browser-status')?.label).toBe(
			'instanceAi.inputMenu.browser.connectedTitle',
		);
		expect(disconnectedConnectionCount.value).toBe(1);

		// Browser Use reconnects through the shared flow, which opens a modal only when
		// the extension actually needs the user.
		await findItem(menuItems.value, 'browser-reconnect')?.data?.action?.();
		expect(ensureBrowserConnected).toHaveBeenCalledWith('input_menu');
		expect(uiStore.openModal).not.toHaveBeenCalled();
	});

	it('keeps a user-disconnected service as a direct Connect action', () => {
		const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

		const item = findItem(menuItems.value, 'browser');
		expect(item?.data?.status).toBe('none');
		expect(item?.children).toBeUndefined();
		expect(item?.data?.action).toBeTypeOf('function');
		expect(disconnectedConnectionCount.value).toBe(0);
	});

	it('disconnects Browser Use when the direct extension is connected', async () => {
		settingsStore.browserUseConnectionStatus = 'connected';

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
		await findItem(menuItems.value, 'browser-disconnect')?.data?.action?.();

		expect(settingsStore.disconnectBrowserUse).toHaveBeenCalledOnce();
	});

	it('delegates attachment and connection actions to their owners', async () => {
		const attachFiles = vi.fn();
		settingsStore.browserUseConnectionStatus = 'connected';
		mcpStore.connections = [makeMcpConnection('1', 'connected')];
		const { menuItems } = useInstanceAiInputMenuItems(attachFiles);

		await findItem(menuItems.value, 'attach-files')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-setup')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-disconnect')?.data?.action?.();
		await findItem(menuItems.value, 'browser-disconnect')?.data?.action?.();

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
		expect(settingsStore.disconnectBrowserUse).toHaveBeenCalledOnce();
	});

	describe('the preferences item', () => {
		it('is a plain item, with no nested list of applied preferences', () => {
			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			const item = findItem(menuItems.value, 'preferences');

			expect(item?.label).toBe('instanceAi.inputMenu.preferences.label');
			expect(item?.children).toBeUndefined();
			expect(item?.divided).toBe(true);
		});

		it('opens the Context preferences settings page in a new tab', async () => {
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
			await findItem(menuItems.value, 'preferences')?.data?.action?.();

			expect(router.resolve).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
			expect(openSpy).toHaveBeenCalledWith('/settings/context/preferences', '_blank');
			expect(router.push).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});

	describe('the skills submenu', () => {
		beforeEach(() => {
			featureFlags.assistantSkills = true;
		});

		it.each(['assistantSkills', 'skills'] as const)(
			'omits skills and does not fetch them when %s is off',
			async (flag) => {
				featureFlags[flag] = false;
				const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn());

				await refreshSkills();

				expect(findItem(menuItems.value, 'skills')).toBeUndefined();
				expect(getSkills).not.toHaveBeenCalled();
			},
		);

		it('groups enabled session-project and instance skills by name and follows project changes', async () => {
			const projectId = ref<string | undefined>('project-1');
			const data = [
				makeSkill('iz', 'Zebra'),
				makeSkill('pz', 'Zulu', { scope: 'project', projectId: 'project-1' }),
				makeSkill('ia', 'Alpha'),
				makeSkill('pa', 'Bravo', { scope: 'project', projectId: 'project-1' }),
				makeSkill('personal', 'Personal', { scope: 'project', projectId: 'personal-1' }),
				makeSkill('other', 'Other', { scope: 'project', projectId: 'other-project' }),
				makeSkill('disabled', 'Disabled', { availableToAssistant: false }),
				makeSkill('disabled-project', 'Disabled project', {
					scope: 'project',
					projectId: 'project-1',
					availableToAssistant: false,
				}),
				makeSkill('unnamed', ' '),
				makeSkill('undescribed', 'No description', { description: ' ' }),
			];
			getSkills.mockResolvedValue({ data, count: data.length });
			const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn(), projectId);
			await refreshSkills();

			expect(getSkills).toHaveBeenCalledWith(rootStore.restApiContext);
			expect(findItem(menuItems.value, 'skills')?.children?.map(({ label }) => label)).toEqual([
				'settings.context.skills.scope.project',
				'Bravo',
				'Zulu',
				'settings.context.skills.scope.instance',
				'Alpha',
				'Zebra',
				'instanceAi.inputMenu.skills.manage',
				'instanceAi.inputMenu.skills.create',
			]);

			projectId.value = 'personal-1';
			expect(findItem(menuItems.value, 'skill-personal')).toBeDefined();
			expect(findItem(menuItems.value, 'skill-pa')).toBeUndefined();

			projectId.value = undefined;
			expect(findItem(menuItems.value, 'skills-project')).toBeUndefined();
			expect(findItem(menuItems.value, 'skill-personal')).toBeUndefined();
			expect(findItem(menuItems.value, 'skill-ia')).toBeDefined();
		});

		it.each([
			{ scope: 'none', canCreate: false },
			{ scope: 'instance', canCreate: true },
			{ scope: 'personal', canCreate: true },
			{ scope: 'team', canCreate: true },
		])('checks skill-create permission for the $scope scope', async ({ scope, canCreate }) => {
			usersStore.currentUser.globalScopes = scope === 'instance' ? ['skill:create'] : [];
			projectsStore.personalProject = { id: 'personal-1' };
			projectsStore.myProjects = [
				{
					id: 'personal-1',
					type: 'personal',
					scopes: scope === 'personal' ? ['projectSkill:create'] : [],
				},
				{
					id: 'team-1',
					type: 'team',
					scopes: scope === 'team' ? ['projectSkill:create'] : [],
				},
			];
			getSkills.mockResolvedValue({ data: [makeSkill('s1', 'Skill')], count: 1 });
			const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(
				vi.fn(),
				'read-only-project',
			);
			await refreshSkills();

			expect(Boolean(findItem(menuItems.value, 'create-skill'))).toBe(canCreate);
			expect(findItem(menuItems.value, 'manage-skills')?.data?.action).toBeTypeOf('function');
			expect(findItem(menuItems.value, 'skill-s1')?.data?.action).toBeTypeOf('function');
		});

		it.each([
			{ id: 'skill-s1', query: { skillId: 's1' }, href: '/settings/context/skills?skillId=s1' },
			{ id: 'manage-skills', query: {}, href: '/settings/context/skills' },
			{
				id: 'create-skill',
				query: { create: 'true' },
				href: '/settings/context/skills?create=true',
			},
		])('opens $id in a new tab with the matching settings state', async ({ id, query, href }) => {
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
			getSkills.mockResolvedValue({ data: [makeSkill('s1', 'Skill')], count: 1 });
			router.resolve.mockReturnValueOnce({ href });
			const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn());
			await refreshSkills();
			await findItem(menuItems.value, id)?.data?.action?.();

			expect(router.resolve).toHaveBeenCalledWith({ name: 'SettingsContextSkills', query });
			expect(openSpy).toHaveBeenCalledWith(href, '_blank', 'noopener');
			expect(router.push).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});

		it('shows loading before an empty result and refreshes the list on the next open', async () => {
			const pending = createDeferredPromise<SkillListResponse>();
			getSkills.mockReturnValueOnce(pending.promise);
			const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn());
			const load = refreshSkills();

			expect(findItem(menuItems.value, 'skills-status')).toMatchObject({
				label: 'instanceAi.inputMenu.skills.loading',
				disabled: true,
			});
			pending.resolve({ data: [], count: 0 });
			await load;
			expect(findItem(menuItems.value, 'skills-status')?.label).toBe(
				'instanceAi.inputMenu.skills.empty',
			);
			expect(findItem(menuItems.value, 'manage-skills')?.data?.action).toBeTypeOf('function');
			expect(findItem(menuItems.value, 'create-skill')?.data?.action).toBeTypeOf('function');

			getSkills.mockResolvedValueOnce({ data: [makeSkill('s1', 'Added skill')], count: 1 });
			await refreshSkills();
			expect(getSkills).toHaveBeenCalledTimes(2);
			expect(findItem(menuItems.value, 'skill-s1')?.label).toBe('Added skill');
			expect(findItem(menuItems.value, 'skills-status')).toBeUndefined();
		});

		it('shows failed reads separately from empty reads, clears old skills, and retries', async () => {
			getSkills.mockResolvedValueOnce({ data: [makeSkill('s1', 'Skill')], count: 1 });
			const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn());
			await refreshSkills();

			getSkills.mockRejectedValueOnce(new Error('offline'));
			await refreshSkills();
			expect(findItem(menuItems.value, 'skills-status')).toMatchObject({
				label: 'instanceAi.inputMenu.skills.loadError',
				disabled: true,
			});
			expect(findItem(menuItems.value, 'skill-s1')).toBeUndefined();
			expect(findItem(menuItems.value, 'manage-skills')).toBeDefined();
			expect(findItem(menuItems.value, 'create-skill')).toBeDefined();

			await refreshSkills();
			expect(findItem(menuItems.value, 'skills-status')?.label).toBe(
				'instanceAi.inputMenu.skills.empty',
			);
		});

		it.each(['success', 'failure'])(
			'keeps the latest list when an older request finishes with %s',
			async (result) => {
				const pending = createDeferredPromise<SkillListResponse>();
				getSkills.mockReturnValueOnce(pending.promise);
				const { menuItems, refreshSkills } = useInstanceAiInputMenuItems(vi.fn());
				const earlier = refreshSkills();

				getSkills.mockResolvedValueOnce({ data: [makeSkill('new', 'New skill')], count: 1 });
				await refreshSkills();
				if (result === 'success') {
					pending.resolve({ data: [makeSkill('old', 'Old skill')], count: 1 });
				} else {
					pending.reject(new Error('offline'));
				}
				await earlier;

				expect(findItem(menuItems.value, 'skill-new')?.label).toBe('New skill');
				expect(findItem(menuItems.value, 'skill-old')).toBeUndefined();
				expect(findItem(menuItems.value, 'skills-status')).toBeUndefined();
			},
		);
	});
});
