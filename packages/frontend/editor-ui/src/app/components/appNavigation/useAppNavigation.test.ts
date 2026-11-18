import { effectScope, reactive, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { Scope } from '@n8n/permissions';
import type { DynamicTabOptions } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { PERSONAL_SELF_HEALING_VIEW } from '@n8n/frontend-constants/self-healing';
import { INBOX_VIEW } from '@n8n/frontend-module-inbox';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import type { UserFavorite } from '@/app/api/favorites';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@/features/agents/constants';
import type { RecentChatItem } from '@/features/agents/n8nChatPage/mergeRecentChats';
import {
	ASSISTANT_ITEM_ID,
	INBOX_ITEM_ID,
	OVERVIEW_ITEM_ID,
	projectItemId,
	useAppNavigation,
} from './useAppNavigation';

const route = vi.hoisted(() => ({
	current: { name: '', params: {}, query: {} } as {
		name: string;
		params: Record<string, string>;
		query: Record<string, string>;
	},
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return { ...actual, useRoute: () => route.current };
});

// The projects store loads the project of the route; the tests set it by hand.
vi.mock('@/features/collaboration/projects/projects.api', () => ({
	getProject: vi.fn(async () => ({})),
}));

const assistantAvailable = ref(true);
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => assistantAvailable,
}));

const recentChats = ref<RecentChatItem[]>([]);
vi.mock('@/features/agents/n8nChatPage/useRecentChats', () => ({
	useRecentChats: () => ({ recentChats }),
}));

const personal = { id: 'personal-1', type: 'personal', name: 'Jane' } as Project;
const teamProject = (id: string, name: string, scopes: Scope[] = []): ProjectListItem =>
	({ id, name, type: 'team', role: 'project:editor', scopes }) as ProjectListItem;

const favorite = (
	resourceId: string,
	resourceType: UserFavorite['resourceType'],
	resourceName: string,
	resourceProjectId?: string,
): UserFavorite => ({
	id: 1,
	userId: 'u1',
	resourceId,
	resourceType,
	resourceName,
	resourceProjectId,
});

function setup() {
	const scope = effectScope();
	const nav = scope.run(() => useAppNavigation())!;
	return { nav, scope };
}

describe('useAppNavigation', () => {
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		createTestingPinia();
		route.current = reactive({ name: VIEWS.WORKFLOWS, params: {}, query: {} });
		assistantAvailable.value = true;
		recentChats.value = [];

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = personal;
		projectsStore.myProjects = [
			teamProject('team-b', 'Beta'),
			teamProject('team-a', 'alpha', ['project:update']),
		];
		projectsStore.currentProject = null;

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			...settingsStore.settings,
			inbox: { enabled: true, availableTypes: [], failedTypes: [] },
		};
		settingsStore.isModuleActive = vi.fn(() => true);
		settingsStore.isAgentsEnabled = true;

		const agentsTab = (tab: DynamicTabOptions) => tab;
		mockedStore(useUIStore).moduleTabs = {
			overview: {
				agents: [
					agentsTab({
						label: 'Agents',
						value: AGENTS_LIST_VIEW,
						insertAfter: VIEWS.WORKFLOWS,
						to: { name: AGENTS_LIST_VIEW },
					}),
				],
			},
			project: {
				agents: [
					agentsTab({
						label: 'Agents',
						value: PROJECT_AGENTS,
						insertAfter: VIEWS.PROJECTS_WORKFLOWS,
						dynamicRoute: { name: PROJECT_AGENTS, includeProjectId: true },
					}),
				],
			},
			shared: {},
		};
	});

	describe('rail items', () => {
		it('lists Assistant, Overview, Inbox, then Personal and the team projects by name', () => {
			const { nav } = setup();

			expect(nav.railItems.value.map((item) => item.id)).toEqual([
				ASSISTANT_ITEM_ID,
				OVERVIEW_ITEM_ID,
				INBOX_ITEM_ID,
				projectItemId('personal-1'),
				projectItemId('team-a'),
				projectItemId('team-b'),
			]);
			expect(nav.railItems.value.map((item) => item.group)).toEqual([
				'main',
				'main',
				'main',
				'project',
				'project',
				'project',
			]);
		});

		it('puts starred team projects first, each group by name', () => {
			mockedStore(useFavoritesStore).favorites = [favorite('team-b', 'project', 'Beta')];
			const { nav } = setup();

			expect(nav.railItems.value.map((item) => item.id).slice(3)).toEqual([
				projectItemId('personal-1'),
				projectItemId('team-b'),
				projectItemId('team-a'),
			]);
		});

		it('leaves out the Assistant and Inbox when they are not available', () => {
			assistantAvailable.value = false;
			settingsStore.settings = {
				...settingsStore.settings,
				inbox: { enabled: false, availableTypes: [], failedTypes: [] },
			};
			const { nav } = setup();

			const ids = nav.railItems.value.map((item) => item.id);
			expect(ids).not.toContain(ASSISTANT_ITEM_ID);
			expect(ids).not.toContain(INBOX_ITEM_ID);
		});

		it('leaves out team projects without the team projects feature', () => {
			projectsStore.isTeamProjectFeatureEnabled = false;
			const { nav } = setup();

			expect(nav.railItems.value.filter((item) => item.group === 'project')).toHaveLength(1);
		});
	});

	describe('active item', () => {
		it('is the Assistant on a chat thread', () => {
			route.current.name = INSTANCE_AI_THREAD_VIEW;
			expect(setup().nav.activeItemId.value).toBe(ASSISTANT_ITEM_ID);
		});

		it('is none on Insights, which stands on its own', () => {
			route.current.name = VIEWS.INSIGHTS;
			const { nav } = setup();

			expect(nav.activeItemId.value).toBeNull();
			expect(nav.sectionsFor(nav.activeItemId.value)).toEqual([]);
		});

		it('is the Inbox on the inbox page', () => {
			route.current.name = INBOX_VIEW;
			expect(setup().nav.activeItemId.value).toBe(INBOX_ITEM_ID);
		});

		it('is the project of the route', () => {
			route.current.name = VIEWS.PROJECTS_CREDENTIALS;
			route.current.params = { projectId: 'team-b' };
			expect(setup().nav.activeItemId.value).toBe(projectItemId('team-b'));
		});

		it('is Overview on an overview list, even if a project is still loaded', () => {
			projectsStore.currentProject = { ...personal, id: 'team-a' } as Project;
			expect(setup().nav.activeItemId.value).toBe(OVERVIEW_ITEM_ID);
		});

		it('is the home project of an open workflow', () => {
			route.current.name = VIEWS.WORKFLOW;
			projectsStore.currentProject = { ...personal, id: 'team-a' } as Project;
			expect(setup().nav.activeItemId.value).toBe(projectItemId('team-a'));
		});

		it('follows the route', () => {
			const { nav } = setup();
			expect(nav.activeItemId.value).toBe(OVERVIEW_ITEM_ID);

			route.current.name = INSTANCE_AI_VIEW;
			expect(nav.activeItemId.value).toBe(ASSISTANT_ITEM_ID);
		});
	});

	describe('sections', () => {
		it('lists the overview pages with module tabs in place and marks the current one', () => {
			route.current.name = VIEWS.CREDENTIALS;
			const [section] = setup().nav.sectionsFor(OVERVIEW_ITEM_ID);

			expect(section.links.map((link) => link.id)).toEqual([
				VIEWS.WORKFLOWS,
				VIEWS.CREDENTIALS,
				VIEWS.EXECUTIONS,
				VIEWS.HOME_VARIABLES,
			]);
			expect(section.links.filter((link) => link.active).map((link) => link.id)).toEqual([
				VIEWS.CREDENTIALS,
			]);
		});

		it('marks Workflows active on the home page', () => {
			route.current.name = VIEWS.HOMEPAGE;
			const [section] = setup().nav.sectionsFor(OVERVIEW_ITEM_ID);

			expect(section.links.find((link) => link.active)?.id).toBe(VIEWS.WORKFLOWS);
		});

		it('shows agents inside Automations, and marks Automations active on an agent list', () => {
			route.current.name = AGENTS_LIST_VIEW;
			const [section] = setup().nav.sectionsFor(OVERVIEW_ITEM_ID);

			expect(section.links.map((link) => link.id)).not.toContain(AGENTS_LIST_VIEW);
			expect(section.links.find((link) => link.active)).toMatchObject({
				id: VIEWS.WORKFLOWS,
				label: 'Automations',
			});
		});

		it('links project pages to the project and adds Settings for managers', () => {
			const { nav } = setup();
			const [managed] = nav.sectionsFor(projectItemId('team-a'));
			const [other] = nav.sectionsFor(projectItemId('team-b'));

			expect(managed.links.map((link) => link.id)).toEqual([
				VIEWS.PROJECTS_WORKFLOWS,
				VIEWS.PROJECTS_CREDENTIALS,
				VIEWS.PROJECTS_EXECUTIONS,
				VIEWS.PROJECTS_VARIABLES,
				VIEWS.PROJECT_SETTINGS,
			]);
			expect(other.links.map((link) => link.id)).not.toContain(VIEWS.PROJECT_SETTINGS);
		});

		it('marks a project page active only in its own project', () => {
			route.current.name = VIEWS.PROJECTS_FOLDERS;
			route.current.params = { projectId: 'team-a' };
			const { nav } = setup();

			expect(
				nav.sectionsFor(projectItemId('team-a'))[0].links.find((link) => link.active)?.id,
			).toBe(VIEWS.PROJECTS_WORKFLOWS);
			expect(nav.sectionsFor(projectItemId('team-b'))[0].links.some((link) => link.active)).toBe(
				false,
			);
		});

		it('gives the Personal project its pages without Settings', () => {
			const [section] = setup().nav.sectionsFor(projectItemId('personal-1'));

			expect(section.links.map((link) => link.id)).not.toContain(VIEWS.PROJECT_SETTINGS);
			expect(section.links[0].to).toEqual({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: 'personal-1' },
			});
		});

		it('adds Self-healing to the Personal project when the owner can configure it', () => {
			projectsStore.personalProject = {
				...personal,
				relations: [{ id: 'user-1', role: 'project:personalOwner' }],
			} as Project;
			mockedStore(useUsersStore).currentUserId = 'user-1';
			settingsStore.moduleSettings = {
				'instance-ai': { workflowSuggestionsEnabled: true },
			} as typeof settingsStore.moduleSettings;

			const [section] = setup().nav.sectionsFor(projectItemId('personal-1'));

			expect(section.links.at(-1)).toMatchObject({
				id: PERSONAL_SELF_HEALING_VIEW,
				to: { name: PERSONAL_SELF_HEALING_VIEW, params: { projectId: 'personal-1' } },
			});
			const [teamSection] = setup().nav.sectionsFor(projectItemId('team-a'));
			expect(teamSection.links.map((link) => link.id)).not.toContain(PERSONAL_SELF_HEALING_VIEW);
		});

		it('gives the Assistant a New chat link and the recent chats', () => {
			recentChats.value = [
				{
					kind: 'assistant',
					thread: { id: 't1', title: 'Sync invoices' },
				} as RecentChatItem,
			];
			route.current.name = INSTANCE_AI_THREAD_VIEW;
			route.current.params = { threadId: 't1' };

			const [actions, chats] = setup().nav.sectionsFor(ASSISTANT_ITEM_ID);

			expect(actions.links.map((link) => link.id)).toEqual(['new-chat']);
			expect(actions.links[0].active).toBe(false);
			expect(chats.viewAll).toBeDefined();
			expect(chats.links).toHaveLength(1);
			expect(chats.links[0]).toMatchObject({ label: 'Sync invoices', active: true });
		});

		it('keeps an empty Chats section, without View all, when there are no chats', () => {
			const [, chats] = setup().nav.sectionsFor(ASSISTANT_ITEM_ID);

			expect(chats).toMatchObject({ id: 'assistant-chats', links: [], viewAll: undefined });
			expect(chats.emptyText).toBeTruthy();
		});

		it('lists the starred items under Overview in starred order, without projects', () => {
			mockedStore(useFavoritesStore).favorites = [
				favorite('agent-1', 'agent', 'Support bot', 'team-a'),
				favorite('team-a', 'project', 'alpha'),
				favorite('wf-1', 'workflow', 'Sync orders'),
			];
			route.current.name = VIEWS.WORKFLOW;
			route.current.params = { workflowId: 'wf-1' };

			const [, favorites] = setup().nav.sectionsFor(OVERVIEW_ITEM_ID);

			expect(favorites.id).toBe('overview-favorites');
			expect(favorites.links.map(({ label, icon, active }) => ({ label, icon, active }))).toEqual([
				{ label: 'Support bot', icon: 'bot', active: false },
				{ label: 'Sync orders', icon: 'workflow', active: true },
			]);
			expect(favorites.links[1].favorite).toEqual({ resourceId: 'wf-1', resourceType: 'workflow' });
		});

		it('keeps an empty Favorites section with a hint when nothing is starred', () => {
			const [, favorites] = setup().nav.sectionsFor(OVERVIEW_ITEM_ID);

			expect(favorites.links).toEqual([]);
			expect(favorites.emptyText).toBeTruthy();
		});

		it('gives the Inbox a single link', () => {
			const [section] = setup().nav.sectionsFor(INBOX_ITEM_ID);

			expect(section.links.map((link) => link.to)).toEqual([{ name: INBOX_VIEW }]);
		});
	});
});
