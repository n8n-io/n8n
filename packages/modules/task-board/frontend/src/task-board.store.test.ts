import type { TaskBoardDetail, TaskBoardTask } from '@n8n/api-types';

import { useTaskBoardStore } from './task-board.store';

const task = (overrides: Partial<TaskBoardTask>): TaskBoardTask => ({
	id: 't1',
	boardId: 'b1',
	columnId: 'c1',
	// The API field is called `number`, which the identifier lint rule denies.
	['number']: 1,
	title: 'Task',
	description: '',
	assignee: null,
	createdBy: { type: 'user', id: 'u1', name: 'Ada' },
	position: 0,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

const board: TaskBoardDetail = {
	id: 'b1',
	projectId: 'p1',
	name: 'Board',
	description: null,
	templateKey: 'agent-dev',
	workflowId: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	taskCount: 1,
	columns: [
		{ id: 'c2', boardId: 'b1', name: 'Done', position: 1, role: 'done' },
		{ id: 'c1', boardId: 'b1', name: 'Backlog', position: 0, role: 'backlog' },
	],
	tasks: [task({})],
};

describe('useTaskBoardStore', () => {
	it('moves a task to its new column when the server returns the moved task', () => {
		const store = useTaskBoardStore();
		store.setBoard(board);

		store.upsertTask(task({ columnId: 'c2' }));

		expect(store.columns.map((column) => column.id)).toEqual(['c1', 'c2']);
		expect(store.tasksByColumnId.get('c1')).toBeUndefined();
		expect(store.tasksByColumnId.get('c2')?.map((t) => t.id)).toEqual(['t1']);
	});
});
