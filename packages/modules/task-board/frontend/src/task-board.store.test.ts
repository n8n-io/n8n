import { createBoard, createTask } from './__tests__/fixtures';
import { useTaskBoardStore } from './task-board.store';

// The columns are out of order, so the test also covers the sort.
const board = createBoard({
	columns: [
		{ id: 'c2', boardId: 'b1', name: 'Done', position: 1, role: 'done' },
		{ id: 'c1', boardId: 'b1', name: 'Backlog', position: 0, role: 'backlog' },
	],
	tasks: [createTask({ columnId: 'c1' })],
});

describe('useTaskBoardStore', () => {
	it('moves a task to its new column when the server returns the moved task', () => {
		const store = useTaskBoardStore();
		store.setBoard(board);

		store.upsertTask(createTask({ columnId: 'c2' }));

		expect(store.columns.map((column) => column.id)).toEqual(['c1', 'c2']);
		expect(store.tasksByColumnId.get('c1')).toBeUndefined();
		expect(store.tasksByColumnId.get('c2')?.map((t) => t.id)).toEqual(['t1']);
	});
});
