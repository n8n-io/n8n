import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { TaskBoardTask } from '@n8n/api-types';
import { waitAllPromises } from '@n8n/frontend-test-utils';

import { useTaskBoard } from './useTaskBoard';
import { createBoard, createTask, withSetup } from '../__tests__/fixtures';
import { createTask as createTaskRequest, fetchTaskBoard, updateTask } from '../task-board.api';
import { useTaskBoardStore } from '../task-board.store';

vi.mock('../task-board.api');

const boardRef = { projectId: 'p1', boardId: 'b1' };

async function loadBoard(tasks: TaskBoardTask[]) {
	vi.mocked(fetchTaskBoard).mockResolvedValue(createBoard({ tasks }));
	const taskBoard = withSetup(() => useTaskBoard(boardRef));
	await waitAllPromises();
	return { taskBoard, store: useTaskBoardStore() };
}

describe('useTaskBoard', () => {
	beforeEach(() => vi.resetAllMocks());

	it('loads the board of the route into the store', async () => {
		const { taskBoard, store } = await loadBoard([createTask()]);

		expect(fetchTaskBoard).toHaveBeenCalledWith(expect.anything(), boardRef);
		expect(store.board?.tasks.map((task) => task.id)).toEqual(['t1']);
		expect(taskBoard.loading.value).toBe(false);
		expect(taskBoard.loadFailed.value).toBe(false);
	});

	it('moves a task at once, then keeps the task that the server returns', async () => {
		const { taskBoard, store } = await loadBoard([createTask()]);
		const request = createDeferredPromise<TaskBoardTask>();
		vi.mocked(updateTask).mockReturnValue(request.promise);

		const move = taskBoard.moveTask('t1', 'done');

		// The card is in the new column before the server answers.
		expect(store.findTask('t1')?.columnId).toBe('done');

		request.resolve(createTask({ columnId: 'done', position: 4 }));
		await move;

		expect(updateTask).toHaveBeenCalledWith(
			expect.anything(),
			{ ...boardRef, taskId: 't1' },
			{ columnId: 'done' },
		);
		expect(store.findTask('t1')?.position).toBe(4);
	});

	it('adds a new task to the board', async () => {
		const { taskBoard, store } = await loadBoard([]);
		vi.mocked(createTaskRequest).mockResolvedValue(createTask({ id: 't2', title: 'New' }));

		const task = await taskBoard.addTask({ title: 'New' });

		expect(task?.id).toBe('t2');
		expect(store.findTask('t2')?.title).toBe('New');
	});
});
