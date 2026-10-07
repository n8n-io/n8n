import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useAgentNavigationCommands } from './useAgentNavigationCommands';
import { listAgentsPageGlobal } from '@/features/agents/composables/useAgentApi';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { AGENT_BUILDER_VIEW, AGENTS_MODULE_NAME } from '@/features/agents/constants';
import type { AgentResource } from '@/features/agents/types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';

const routerPushMock = vi.fn();
const routerResolveMock = vi.fn(() => ({ href: '/resolved-href' }));
const createAgentMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		resolve: routerResolveMock,
	}),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(' '),
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPageGlobal: vi.fn(),
}));

vi.mock('@/features/agents/composables/useCreateAgent', () => ({
	useCreateAgent: () => ({ createAgent: createAgentMock }),
}));

const createAgent = (overrides: Partial<AgentResource> = {}): AgentResource =>
	({
		id: 'agent-1',
		name: 'Support Agent',
		resourceType: 'agent',
		projectId: 'project-1',
		project: { id: 'project-1', name: 'Team Project', type: 'team' },
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
		...overrides,
	}) as AgentResource;

describe('useAgentNavigationCommands', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;

	const setup = () => useAgentNavigationCommands({ currentProjectName: ref('Team Project') });

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();

		settingsStore = useSettingsStore();
		projectsStore = useProjectsStore();
		sourceControlStore = useSourceControlStore();

		vi.mocked(settingsStore.isModuleActive).mockImplementation(
			(moduleName) => moduleName === AGENTS_MODULE_NAME,
		);
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['agent:create'],
		});
		sourceControlStore.preferences.branchReadOnly = false;
	});

	describe('source', () => {
		it('exposes a remote agents source', () => {
			expect(setup().source).toMatchObject({
				id: 'agents',
				title: 'commandBar.sections.agents',
				isRemote: true,
			});
		});

		it.each([true, false])(
			'reports source availability as %s from the agents module',
			(isActive) => {
				vi.mocked(settingsStore.isModuleActive).mockReturnValue(isActive);

				expect(setup().source?.isAvailable()).toBe(isActive);
				expect(settingsStore.isModuleActive).toHaveBeenCalledWith(AGENTS_MODULE_NAME);
			},
		);

		it('searches agents across projects by trimmed query, newest first', async () => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({ count: 0, data: [] });

			await setup().source?.search({ query: '  support ', offset: 10, limit: 5 });

			expect(listAgentsPageGlobal).toHaveBeenCalledWith(useRootStore().restApiContext, {
				skip: 10,
				take: 5,
				sortBy: 'updatedAt:desc',
				filter: { query: 'support' },
			});
		});

		it('omits the query filter when the query is empty', async () => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({ count: 0, data: [] });

			await setup().source?.search({ query: '  ', offset: 0, limit: 5 });

			expect(listAgentsPageGlobal).toHaveBeenCalledWith(useRootStore().restApiContext, {
				skip: 0,
				take: 5,
				sortBy: 'updatedAt:desc',
			});
		});

		it.each([
			{ offset: 0, count: 3, hasMore: true },
			{ offset: 1, count: 3, hasMore: false },
		])(
			'reports hasMore as $hasMore for offset $offset and total count $count',
			async ({ offset, count, hasMore }) => {
				vi.mocked(listAgentsPageGlobal).mockResolvedValue({
					count,
					data: [createAgent({ id: 'agent-1' }), createAgent({ id: 'agent-2' })],
				});

				const result = await setup().source?.search({ query: '', offset, limit: 2 });

				expect(result?.items).toHaveLength(2);
				expect(result?.hasMore).toBe(hasMore);
			},
		);

		it('maps an agent to a command bar item', async () => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({ count: 1, data: [createAgent()] });

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0]).toMatchObject({
				id: 'agent-1',
				title: 'Support Agent',
				description: 'Team Project',
				icon: { type: 'icon', value: 'bot' },
				timestamp: '2026-01-02T00:00:00.000Z',
				href: '/resolved-href',
			});
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: AGENT_BUILDER_VIEW,
				params: { projectId: 'project-1', agentId: 'agent-1' },
			});
		});

		it.each([
			{
				scenario: 'a personal project',
				project: { id: 'personal-1', name: 'Jane Doe', type: 'personal' as const },
				description: 'projects.menu.personal',
			},
			{ scenario: 'no project', project: null, description: '' },
		])('describes an agent in $scenario', async ({ project, description }) => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({
				count: 1,
				data: [createAgent({ project })],
			});

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0].description).toBe(description);
		});

		it('navigates to the agent builder when the item handler runs', async () => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({ count: 1, data: [createAgent()] });

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });
			await result?.items[0].handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: AGENT_BUILDER_VIEW,
				params: { projectId: 'project-1', agentId: 'agent-1' },
			});
		});
	});

	describe('create agent command', () => {
		const findCreateCommand = () =>
			setup().commands.value.find((command) => command.id === 'create-agent');

		it('shows the create command for the current project when the user can create agents', () => {
			expect(findCreateCommand()).toMatchObject({
				title: 'commandBar.agents.create Team Project',
				section: 'commandBar.sections.agents',
				keywords: ['projects.menu.create.agent'],
			});
		});

		it('hides the create command when the agents module is not active', () => {
			vi.mocked(settingsStore.isModuleActive).mockReturnValue(false);

			expect(findCreateCommand()).toBeUndefined();
		});

		it('hides the create command when no project is available', () => {
			projectsStore.currentProject = null;
			projectsStore.personalProject = null;

			expect(findCreateCommand()).toBeUndefined();
		});

		it('hides the create command in a read-only environment', () => {
			sourceControlStore.preferences.branchReadOnly = true;

			expect(findCreateCommand()).toBeUndefined();
		});

		it('hides the create command when the project does not allow agent creation', () => {
			projectsStore.currentProject = createTestProject({ id: 'project-1', scopes: [] });

			expect(findCreateCommand()).toBeUndefined();
		});

		it('uses the personal project when there is no current project', () => {
			projectsStore.currentProject = null;
			projectsStore.personalProject = createTestProject({
				id: 'personal-1',
				type: 'personal',
				scopes: ['agent:create'],
			});

			findCreateCommand()?.handler?.();

			expect(createAgentMock).toHaveBeenCalledWith('command_bar', 'personal-1');
		});

		it('creates an agent in the current project when the handler runs', async () => {
			await findCreateCommand()?.handler?.();

			expect(createAgentMock).toHaveBeenCalledWith('command_bar', 'project-1');
		});
	});
});
