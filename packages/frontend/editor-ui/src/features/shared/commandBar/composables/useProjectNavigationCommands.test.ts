import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectNavigationCommands } from './useProjectNavigationCommands';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { VIEWS } from '@/constants';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

const routerPushMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
	useRoute: () => ({
		name: VIEWS.WORKFLOWS,
		params: { projectId: 'project-1' },
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const mockCreateProject = vi.fn();
vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		createProject: mockCreateProject,
	}),
}));

describe('useProjectNavigationCommands', () => {
	let mockProjectsStore: ReturnType<typeof useProjectsStore>;

	const createMockProject = (
		id: string,
		name: string,
		type: 'personal' | 'team',
	): ProjectListItem => ({
		id,
		name,
		type,
		icon: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		role: type === 'personal' ? 'project:personalOwner' : 'project:admin',
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockProjectsStore = useProjectsStore();

		Object.defineProperty(mockProjectsStore, 'availableProjects', {
			value: [],
		});

		Object.defineProperty(mockProjectsStore, 'hasPermissionToCreateProjects', {
			value: true,
		});

		Object.defineProperty(mockProjectsStore, 'canCreateProjects', {
			value: true,
		});

		vi.clearAllMocks();
	});

	describe('create project command', () => {
		it('should include create project command when user has permission', () => {
			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-project');
			expect(createCommand).toBeDefined();
		});

		it('should not include create project command when user lacks permission', () => {
			Object.defineProperty(mockProjectsStore, 'hasPermissionToCreateProjects', {
				value: false,
			});

			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-project');
			expect(createCommand).toBeUndefined();
		});

		it('should not include create project command when user cannot create more projects', () => {
			Object.defineProperty(mockProjectsStore, 'canCreateProjects', {
				value: false,
			});

			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-project');
			expect(createCommand).toBeUndefined();
		});

		it('should call createProject handler when create command is executed', () => {
			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-project');
			void createCommand?.handler?.();

			expect(mockCreateProject).toHaveBeenCalledWith('command_bar');
		});
	});

	describe('open project command', () => {
		beforeEach(() => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [
					createMockProject('personal-1', 'Personal', 'personal'),
					createMockProject('project-1', 'Team Project', 'team'),
				],
			});
		});

		it('should include open project command when projects exist', () => {
			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand).toBeDefined();
		});

		it('should not include open project command when no projects exist', () => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [],
			});

			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand).toBeUndefined();
		});

		it('should have empty children when not navigated into', () => {
			const { commands } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(0);
		});

		it('should populate children after navigating to open-project', () => {
			const activeNodeId = ref<string | null>(null);
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(2);
		});
	});

	describe('project search and filtering', () => {
		beforeEach(() => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [
					createMockProject('personal-1', 'Personal', 'personal'),
					createMockProject('project-1', 'Marketing Team', 'team'),
					createMockProject('project-2', 'Sales Team', 'team'),
				],
				writable: true,
			});
		});

		it('should filter projects based on search query', () => {
			const activeNodeId = ref<string | null>('open-project');
			const lastQuery = ref('');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery,
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');
			expect(commands.value.find((cmd) => cmd.id === 'open-project')?.children).toHaveLength(3);

			lastQuery.value = 'marketing';
			handlers.onCommandBarChange('marketing');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(1);
			expect(openCommand?.children?.[0].id).toBe('project-1');
		});

		it('should filter projects by ID', () => {
			const activeNodeId = ref<string | null>('open-project');
			const lastQuery = ref('');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery,
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			lastQuery.value = 'project-2';
			handlers.onCommandBarChange('project-2');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(1);
			expect(openCommand?.children?.[0].id).toBe('project-2');
		});

		it('should be case insensitive when filtering', () => {
			const activeNodeId = ref<string | null>('open-project');
			const lastQuery = ref('');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery,
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			lastQuery.value = 'SALES';
			handlers.onCommandBarChange('SALES');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(1);
			expect(openCommand?.children?.[0].id).toBe('project-2');
		});

		it('should show all projects when search query is empty', () => {
			const activeNodeId = ref<string | null>('open-project');
			const lastQuery = ref('');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery,
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(3);
		});
	});

	describe('root project items', () => {
		beforeEach(() => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [createMockProject('project-1', 'Marketing Team', 'team')],
				writable: true,
			});
		});

		it('should not show root project items when query is too short', () => {
			const { commands } = useProjectNavigationCommands({
				lastQuery: ref('ma'),
				activeNodeId: ref(null),
			});

			const rootProjects = commands.value.filter((cmd) => cmd.id === 'project-1');
			expect(rootProjects).toHaveLength(0);
		});

		it('should show root project items when query is longer than 2 characters', () => {
			const lastQuery = ref('mar');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery,
				activeNodeId: ref(null),
			});

			handlers.onCommandBarChange('mar');

			const rootProjects = commands.value.filter((cmd) => cmd.id === 'project-1');
			expect(rootProjects).toHaveLength(1);
		});
	});

	describe('project command handler', () => {
		beforeEach(() => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [
					createMockProject('personal-1', 'Personal', 'personal'),
					createMockProject('project-1', 'Team Project', 'team'),
				],
			});
		});

		it('should navigate to project workflows when project is clicked', () => {
			const activeNodeId = ref<string | null>('open-project');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			const projectCommand = openCommand?.children?.[1]; // Team Project
			void projectCommand?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: 'project-1' },
			});
		});
	});

	describe('project title formatting', () => {
		it('should show localized text for personal project', () => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [createMockProject('personal-1', 'Personal', 'personal')],
			});

			const activeNodeId = ref<string | null>('open-project');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			const personalProject = openCommand?.children?.[0];
			expect(personalProject).toBeDefined();
			expect(personalProject?.title).toEqual({
				component: expect.any(Object),
				props: expect.objectContaining({
					title: 'projects.menu.personal',
				}),
			});
		});

		it('should show project name for team project', () => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [createMockProject('project-1', 'Marketing Team', 'team')],
			});

			const activeNodeId = ref<string | null>('open-project');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			const teamProject = openCommand?.children?.[0];
			expect(teamProject).toBeDefined();
			expect(teamProject?.title).toEqual({
				component: expect.any(Object),
				props: expect.objectContaining({
					title: 'Marketing Team',
				}),
			});
		});

		it('should show unnamed text for team project without name', () => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [createMockProject('project-1', '', 'team')],
			});

			const activeNodeId = ref<string | null>('open-project');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			handlers.onCommandBarNavigateTo('open-project');

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			const unnamedProject = openCommand?.children?.[0];
			expect(unnamedProject).toBeDefined();
			expect(unnamedProject?.title).toEqual({
				component: expect.any(Object),
				props: expect.objectContaining({
					title: 'commandBar.projects.unnamed',
				}),
			});
		});
	});

	describe('onCommandBarNavigateTo handler', () => {
		beforeEach(() => {
			Object.defineProperty(mockProjectsStore, 'availableProjects', {
				value: [createMockProject('project-1', 'Team Project', 'team')],
			});
		});

		it('should clear project results when navigating back to root', () => {
			const activeNodeId = ref<string | null>('open-project');
			const { commands, handlers } = useProjectNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(openCommand?.children).toHaveLength(1);

			handlers.onCommandBarNavigateTo(null);

			const updatedOpenCommand = commands.value.find((cmd) => cmd.id === 'open-project');
			expect(updatedOpenCommand?.children).toHaveLength(0);
		});
	});
});
