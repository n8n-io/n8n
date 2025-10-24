import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExecutionNavigationCommands } from './useExecutionNavigationCommands';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { VIEWS } from '@/constants';

const routerPushMock = vi.fn();
let mockRouteParams = { projectId: 'personal-1' };

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
	useRoute: () => ({
		name: VIEWS.WORKFLOWS,
		params: mockRouteParams,
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useExecutionNavigationCommands', () => {
	let mockProjectsStore: ReturnType<typeof useProjectsStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockProjectsStore = useProjectsStore();

		mockProjectsStore.myProjects = [
			{
				id: 'personal-1',
				name: 'Personal',
				type: 'personal',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:personalOwner',
			},
			{
				id: 'project-1',
				name: 'Team Project',
				type: 'team',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:admin',
			},
		];

		vi.clearAllMocks();
	});

	describe('open executions command', () => {
		it('should include open executions command', () => {
			const { commands } = useExecutionNavigationCommands();

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-executions');
			expect(openCommand).toBeDefined();
			expect(openCommand?.title).toBe('commandBar.executions.open');
		});

		it('should navigate to personal executions view when in personal project', () => {
			mockRouteParams = { projectId: 'personal-1' };
			const { commands } = useExecutionNavigationCommands();

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-executions');
			void openCommand?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.EXECUTIONS });
		});

		it('should navigate to project executions view when in team project', () => {
			mockRouteParams = { projectId: 'project-1' };
			const { commands } = useExecutionNavigationCommands();

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-executions');
			void openCommand?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_EXECUTIONS,
				params: { projectId: 'project-1' },
			});
		});
	});
});
