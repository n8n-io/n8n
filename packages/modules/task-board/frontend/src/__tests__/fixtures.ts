import type { TaskBoardDetail, TaskBoardSummary, TaskBoardTask } from '@n8n/api-types';
import { render } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

const DATE = '2026-01-01T00:00:00.000Z';

export const createTask = (overrides: Partial<TaskBoardTask> = {}): TaskBoardTask => ({
	id: 't1',
	boardId: 'b1',
	columnId: 'todo',
	// The API field is called `number`, which the identifier lint rule denies.
	['number']: 1,
	title: 'Task',
	description: '',
	assignee: null,
	createdBy: { type: 'user', id: 'u1', name: 'Ada' },
	position: 0,
	createdAt: DATE,
	updatedAt: DATE,
	...overrides,
});

export const createBoardSummary = (
	overrides: Partial<TaskBoardSummary> = {},
): TaskBoardSummary => ({
	id: 'b1',
	projectId: 'p1',
	name: 'Board',
	description: null,
	templateKey: 'agent-dev',
	workflowId: null,
	createdAt: DATE,
	updatedAt: DATE,
	taskCount: 0,
	...overrides,
});

/** A board with one column for each role that the tests read. */
export const createBoard = (overrides: Partial<TaskBoardDetail> = {}): TaskBoardDetail => ({
	...createBoardSummary(),
	columns: [
		{ id: 'todo', boardId: 'b1', name: 'To do', position: 0, role: 'todo' },
		{ id: 'waiting', boardId: 'b1', name: 'Needs input', position: 1, role: 'needs_input' },
		{ id: 'done', boardId: 'b1', name: 'Done', position: 2, role: 'done' },
	],
	tasks: [],
	...overrides,
});

/** Runs a composable in a mounted component, so its lifecycle hooks and watchers work. */
export function withSetup<T>(composable: () => T): T {
	const results: T[] = [];
	render(
		defineComponent({
			setup() {
				results.push(composable());
				return () => h('div');
			},
		}),
	);
	return results[0];
}
