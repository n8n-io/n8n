import { capabilityRegistry } from '@n8n/frontend-module-sdk';
import { renderComponent, waitAllPromises } from '@n8n/frontend-test-utils';
import type { Project } from '@n8n/rest-api-client';
import { screen, waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterLink, RouterView, useRoute } from 'vue-router';

import {
	createBoard,
	createTask,
	createTaskDetail,
	provideProjectScopes,
} from '../../__tests__/fixtures';
import ActiveTaskBoard from '../../components/ActiveTaskBoard/ActiveTaskBoard.vue';
import { fetchProjectWithMembers, fetchTask, fetchTaskBoard } from '../../task-board.api';
import { TASK_BOARD_TASK_VIEW, TASK_BOARD_VIEW } from '../../task-board.constants';
import { TaskBoardModule } from '../../task-board.module';

vi.mock('../../task-board.api');

/** The board routes of the module, below a parent that loads the board as the shell does. */
function createTaskRouter() {
	const boardRoutes = TaskBoardModule.routes.find((route) => route.children)?.children ?? [];
	const BoardHost = defineComponent({
		setup() {
			const route = useRoute();
			return () =>
				h(
					ActiveTaskBoard,
					{ projectId: String(route.params.projectId), boardId: String(route.params.boardId) },
					() => h(RouterView),
				);
		},
	});
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/projects/:projectId/tasks/:boardId', component: BoardHost, children: boardRoutes },
		],
	});
}

async function openTaskPage(taskId: string) {
	const router = createTaskRouter();
	await router.push(`/projects/p1/tasks/b1/task/${taskId}`);
	await router.isReady();
	const view = renderComponent(RouterView, {
		global: { plugins: [router], stubs: { RouterLink } },
	});
	await waitAllPromises();
	return { router, ...view };
}

describe('task page route', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		provideProjectScopes(['workflow:read', 'workflow:update']);
		const task = createTask({
			id: 't7',
			title: 'Fix the login redirect',
			description: 'The redirect loops.',
			severity: 'high',
			tags: ['auth'],
			['number']: 7,
		});
		vi.mocked(fetchTaskBoard).mockResolvedValue(createBoard({ name: 'Product', tasks: [task] }));
		vi.mocked(fetchProjectWithMembers).mockResolvedValue({ relations: [] } as unknown as Project);
		vi.mocked(fetchTask).mockResolvedValue(
			createTaskDetail({
				...task,
				comments: [
					{
						id: 'c1',
						taskId: 't7',
						author: { type: 'agent', id: 'a1', name: 'Triage' },
						body: 'Looks like an auth bug.',
						createdAt: '2026-01-02T00:00:00.000Z',
					},
				],
			}),
		);
	});
	afterEach(() => capabilityRegistry.clear());

	it('renders the task that the route names, with its thread and its fields', async () => {
		const { router } = await openTaskPage('t7');

		expect(router.currentRoute.value.name).toBe(TASK_BOARD_TASK_VIEW);
		expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
			'Fix the login redirect',
		);
		expect(screen.getByTestId('task-view-number')).toHaveTextContent('#7');
		expect(screen.getByText('The redirect loops.')).toBeInTheDocument();
		expect(await screen.findByText('Looks like an auth bug.')).toBeInTheDocument();
		expect(document.getElementById('task-board-task-severity')).toHaveTextContent('High');
		expect(screen.getByTestId('task-board-task-tags')).toHaveTextContent('auth');
		expect(fetchTask).toHaveBeenCalledWith(expect.anything(), {
			projectId: 'p1',
			boardId: 'b1',
			taskId: 't7',
		});
	});

	it('links back to the board of the task', async () => {
		const { router } = await openTaskPage('t7');

		const back = await screen.findByTestId('task-view-back');
		expect(back).toHaveTextContent('Product');
		expect(back).toHaveAttribute('href', '/projects/p1/tasks/b1');
		expect(router.resolve('/projects/p1/tasks/b1').name).toBe(TASK_BOARD_VIEW);
	});

	it('says that the task is not found when the board has no such task', async () => {
		await openTaskPage('missing');

		await waitFor(() => expect(screen.getByTestId('task-view-not-found')).toBeInTheDocument());
		expect(screen.getByText('Task not found')).toBeInTheDocument();
		expect(fetchTask).not.toHaveBeenCalled();
	});
});
