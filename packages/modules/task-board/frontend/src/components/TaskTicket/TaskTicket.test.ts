import type { TaskBoardTask, TaskBoardTaskDetail } from '@n8n/api-types';
import { capabilityRegistry } from '@n8n/frontend-module-sdk';
import { renderComponent, waitAllPromises } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import type { Project } from '@n8n/rest-api-client';
import { fireEvent, screen } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import TaskTicket from './TaskTicket.vue';
import {
	addTag,
	chooseOption,
	createBoard,
	createTask,
	createTaskDetail,
	provideProjectScopes,
} from '../../__tests__/fixtures';
import {
	fetchProjectWithMembers,
	fetchTask,
	fetchTaskBoard,
	updateTask,
} from '../../task-board.api';
import { useTaskBoardStore } from '../../task-board.store';
import ActiveTaskBoard from '../ActiveTaskBoard/ActiveTaskBoard.vue';

vi.mock('../../task-board.api');

const taskRef = { projectId: 'p1', boardId: 'b1', taskId: 't1' };

type TicketSetup = {
	task?: Partial<TaskBoardTask>;
	otherTasks?: TaskBoardTask[];
	detail?: Partial<TaskBoardTaskDetail>;
	scopes?: Scope[];
};

/** Renders the ticket of task `t1` in a loaded board, as the panel and the task page do. */
async function renderTicket({
	task = {},
	otherTasks = [],
	detail = {},
	scopes = ['workflow:read', 'workflow:update'],
}: TicketSetup = {}) {
	provideProjectScopes(scopes);
	const current = createTask(task);
	vi.mocked(fetchTaskBoard).mockResolvedValue(createBoard({ tasks: [current, ...otherTasks] }));
	vi.mocked(fetchProjectWithMembers).mockResolvedValue({ relations: [] } as unknown as Project);
	vi.mocked(fetchTask).mockResolvedValue(createTaskDetail({ ...current, ...detail }));
	// The server returns the task with the change. The store then holds what the request sent.
	vi.mocked(updateTask).mockImplementation(async (_context, _ref, payload) => ({
		...current,
		...payload,
		assignee: current.assignee,
	}));

	const Host = defineComponent({
		setup() {
			const store = useTaskBoardStore();
			return () =>
				h(ActiveTaskBoard, { projectId: 'p1', boardId: 'b1' }, () => {
					const loaded = store.findTask('t1');
					return loaded ? h(TaskTicket, { task: loaded, variant: 'columns' }) : null;
				});
		},
	});
	const view = renderComponent(Host);
	await waitAllPromises();
	return view;
}

describe('TaskTicket', () => {
	beforeEach(() => vi.resetAllMocks());
	afterEach(() => capabilityRegistry.clear());

	it('saves the severity that the user picks in the side column', async () => {
		const { getByTestId } = await renderTicket({ task: { severity: 'low' } });

		await chooseOption('task-board-task-severity', 'Critical');
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			severity: 'critical',
		});
		expect(getByTestId('task-board-ticket')).toHaveTextContent('Critical');
	});

	it('removes the severity when the user picks "No severity"', async () => {
		await renderTicket({ task: { severity: 'high' } });

		await chooseOption('task-board-task-severity', 'No severity');
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			severity: null,
		});
	});

	it('saves a tag that the user types, in lower case and after the tags of the task', async () => {
		await renderTicket({ task: { tags: ['bug'] } });

		await addTag('task-board-task-tags', 'Billing');
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			tags: ['bug', 'billing'],
		});
	});

	it('offers the tags of the other tasks of the board, and saves one on a click', async () => {
		await renderTicket({
			task: { tags: ['bug'] },
			otherTasks: [createTask({ id: 't2', tags: ['bug', 'docs'] })],
		});

		// The task already has "bug", so only "docs" is on offer.
		expect(screen.queryByRole('button', { name: 'bug' })).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'docs' }));
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			tags: ['bug', 'docs'],
		});
	});

	it('saves a new title on Enter', async () => {
		const { getByTestId, getByRole } = await renderTicket({ task: { title: 'Old title' } });

		await fireEvent.click(getByTestId('task-board-task-title-edit'));
		const input = getByTestId('task-board-task-title-input');
		await fireEvent.update(input, 'New title');
		await fireEvent.keyDown(input, { key: 'Enter' });
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			title: 'New title',
		});
		expect(getByRole('heading', { level: 2 })).toHaveTextContent('New title');
	});

	it('saves a new description with the Save button, and keeps the old one on Cancel', async () => {
		const { getByTestId } = await renderTicket({ task: { description: 'Old text' } });

		await fireEvent.click(getByTestId('task-board-task-description-edit'));
		await fireEvent.update(getByTestId('task-board-task-description-input'), 'Dropped');
		await fireEvent.click(getByTestId('task-board-task-description-cancel'));
		expect(updateTask).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId('task-board-task-description-edit'));
		await fireEvent.update(getByTestId('task-board-task-description-input'), 'New text');
		await fireEvent.click(getByTestId('task-board-task-description-save'));
		await waitAllPromises();

		expect(updateTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), taskRef, {
			description: 'New text',
		});
	});

	it('lets a user without the update scope read the task, but not change it', async () => {
		const { queryByTestId } = await renderTicket({
			task: { title: 'Read me', severity: 'high', tags: ['bug'] },
			scopes: ['workflow:read'],
		});

		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Read me');
		expect(queryByTestId('task-board-task-title-edit')).not.toBeInTheDocument();
		expect(queryByTestId('task-board-task-description-edit')).not.toBeInTheDocument();
		// The design-system select marks its trigger, which is not a native control.
		for (const field of ['column', 'assignee', 'severity']) {
			expect(document.getElementById(`task-board-task-${field}`)).toHaveAttribute('data-disabled');
		}
		expect(document.getElementById('task-board-task-tags')).toBeDisabled();
	});

	it('shows the usage of the task, and the share of each agent with the largest first', async () => {
		const { getByTestId, getAllByTestId } = await renderTicket({
			task: {
				usage: { promptTokens: 9000, completionTokens: 3400, totalTokens: 12_400, cost: 0.0421 },
			},
			detail: {
				usageByAgent: [
					{
						agentId: 'a1',
						agentName: 'Triage',
						runs: 1,
						promptTokens: 300,
						completionTokens: 100,
						totalTokens: 400,
						cost: 0.0012,
					},
					{
						agentId: 'a2',
						agentName: 'Developer',
						runs: 3,
						promptTokens: 8700,
						completionTokens: 3300,
						totalTokens: 12_000,
						cost: null,
					},
				],
			},
		});

		expect(getByTestId('task-board-task-meta')).toHaveTextContent('12.4k tokens·$0.04');
		const agents = getAllByTestId('task-board-agent-usage');
		expect(agents[0]).toHaveTextContent('Developer');
		expect(agents[0]).toHaveTextContent('3 runs');
		expect(agents[0]).toHaveTextContent('12k tokens');
		expect(agents[0]).not.toHaveTextContent('$');
		expect(agents[1]).toHaveTextContent('Triage');
		expect(agents[1]).toHaveTextContent('1 run');
		expect(agents[1]).toHaveTextContent('400 tokens·$0.0012');
	});

	it('says that no agent ran when the task has no usage', async () => {
		const { getByTestId } = await renderTicket();

		expect(getByTestId('task-board-task-no-usage')).toHaveTextContent('No agent runs yet');
	});
});
