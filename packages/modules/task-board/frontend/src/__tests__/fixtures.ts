import type {
	TaskBoardDetail,
	TaskBoardSummary,
	TaskBoardTask,
	TaskBoardTaskDetail,
} from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import { fireEvent, render, screen } from '@testing-library/vue';
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
	severity: null,
	tags: [],
	usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: null },
	createdBy: { type: 'user', id: 'u1', name: 'Ada' },
	position: 0,
	createdAt: DATE,
	updatedAt: DATE,
	...overrides,
});

export const createTaskDetail = (
	overrides: Partial<TaskBoardTaskDetail> = {},
): TaskBoardTaskDetail => ({
	...createTask(),
	comments: [],
	usageByAgent: [],
	...overrides,
});

/** A stub of the shell capability that gives the scopes of the user in a project. */
export function provideProjectScopes(scopes: Scope[]) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => false,
	});
}

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
	agentIds: [],
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

/** Opens a design-system select by the id of its trigger and chooses the option with this name. */
export async function chooseOption(triggerId: string, name: string) {
	const trigger = document.getElementById(triggerId);
	if (!trigger) throw new Error(`No select has the id "${triggerId}"`);
	await fireEvent.keyDown(trigger, { key: 'Enter' });
	await fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}

/** Types a tag into a tags input, found by its id, and confirms it with Enter. */
export async function addTag(inputId: string, tag: string) {
	const input = document.getElementById(inputId);
	if (!input) throw new Error(`No tags input has the id "${inputId}"`);
	await fireEvent.update(input, tag);
	await fireEvent.keyDown(input, { key: 'Enter' });
}
