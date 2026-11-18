import type { TaskBoardDetail, TaskBoardTask } from '@n8n/api-types';

import { createBoard, createBoardSummary, createTask } from './__tests__/fixtures';
import type { TaskBoardListItem } from './task-board.types';
import {
	decodeAssignee,
	encodeAssignee,
	groupBoardsByProject,
	inboxTasks,
	isAgentWorking,
	pickBoardToOpen,
} from './task-board.utils';

/** A task that waits for input, created by another person. */
const task = (overrides: Partial<TaskBoardTask>): TaskBoardTask =>
	createTask({
		columnId: 'waiting',
		createdBy: { type: 'user', id: 'other', name: 'Grace' },
		...overrides,
	});

const listItem = (overrides: Partial<TaskBoardListItem>): TaskBoardListItem => ({
	...createBoardSummary(),
	projectName: 'Project 1',
	...overrides,
});

const board = (tasks: TaskBoardTask[]): TaskBoardDetail => createBoard({ tasks });

describe('inboxTasks', () => {
	const agent = { type: 'agent', id: 'a1', name: 'Dev agent' } as const;
	const me = { type: 'user', id: 'me', name: 'Ada' } as const;

	it('includes a waiting task that the user created, when an agent is the assignee', () => {
		const waiting = task({ assignee: agent, createdBy: me });

		expect(inboxTasks(board([waiting]), 'me')).toEqual([waiting]);
	});

	it('includes a waiting task that is assigned to the user', () => {
		const waiting = task({ assignee: me });

		expect(inboxTasks(board([waiting]), 'me')).toEqual([waiting]);
	});

	it('leaves out tasks of other people and tasks that do not wait for input', () => {
		const tasks = [
			task({ id: 'other', assignee: agent }),
			task({ id: 'todo', columnId: 'todo', assignee: me, createdBy: me }),
			// An agent whose id equals the user id is not the user.
			task({ id: 'agent', assignee: { ...agent, id: 'me' } }),
		];

		expect(inboxTasks(board(tasks), 'me')).toEqual([]);
	});

	it('puts the task with the newest change first', () => {
		const tasks = [
			task({ id: 'old', assignee: me, updatedAt: '2026-01-01T00:00:00.000Z' }),
			task({ id: 'new', assignee: me, updatedAt: '2026-02-01T00:00:00.000Z' }),
		];

		expect(inboxTasks(board(tasks), 'me').map(({ id }) => id)).toEqual(['new', 'old']);
	});

	it('is empty when no board or no user is known', () => {
		expect(inboxTasks(null, 'me')).toEqual([]);
		expect(inboxTasks(board([task({ assignee: me })]), null)).toEqual([]);
	});
});

describe('groupBoardsByProject', () => {
	it('makes one group for each project and keeps the boards of a project together', () => {
		const groups = groupBoardsByProject([
			listItem({ id: 'b1', name: 'Dev' }),
			listItem({ id: 'b2', name: 'HR', projectId: 'p2', projectName: 'Project 2' }),
			listItem({ id: 'b3', name: 'QA' }),
		]);

		expect(groups).toEqual([
			{
				type: 'group',
				label: 'Project 1',
				items: [
					{ value: 'b1', label: 'Dev' },
					{ value: 'b3', label: 'QA' },
				],
			},
			{ type: 'group', label: 'Project 2', items: [{ value: 'b2', label: 'HR' }] },
		]);
	});
});

describe('pickBoardToOpen', () => {
	const boards = [
		listItem({ id: 'b1' }),
		listItem({ id: 'b2', projectId: 'p2' }),
		listItem({ id: 'b3', projectId: 'p2' }),
	];

	it('opens the board that the user opened last', () => {
		expect(pickBoardToOpen(boards, { projectId: undefined, lastBoardId: 'b3' })?.id).toBe('b3');
	});

	it('opens the first board when the last one no longer exists', () => {
		expect(pickBoardToOpen(boards, { projectId: undefined, lastBoardId: 'gone' })?.id).toBe('b1');
	});

	it('stays in the project of the route, also when the last board is in another one', () => {
		expect(pickBoardToOpen(boards, { projectId: 'p2', lastBoardId: 'b1' })?.id).toBe('b2');
	});

	it('opens nothing when the project has no boards', () => {
		expect(pickBoardToOpen(boards, { projectId: 'p3', lastBoardId: null })).toBeUndefined();
	});
});

describe('isAgentWorking', () => {
	const agent = { type: 'agent', id: 'a1', name: 'Dev agent' } as const;
	const person = { type: 'user', id: 'u1', name: 'Ada' } as const;

	it('is true for a task of an agent in an "in progress" column', () => {
		expect(isAgentWorking({ assignee: agent }, { role: 'in_progress' })).toBe(true);
	});

	it('is false when the agent waits for input or is done', () => {
		expect(isAgentWorking({ assignee: agent }, { role: 'needs_input' })).toBe(false);
		expect(isAgentWorking({ assignee: agent }, { role: 'done' })).toBe(false);
	});

	it('is false for a task that a person works on, or that has no assignee', () => {
		expect(isAgentWorking({ assignee: person }, { role: 'in_progress' })).toBe(false);
		expect(isAgentWorking({ assignee: null }, { role: 'in_progress' })).toBe(false);
	});

	it('is false when the column is unknown or has no role', () => {
		expect(isAgentWorking({ assignee: agent }, undefined)).toBe(false);
		expect(isAgentWorking({ assignee: agent }, { role: null })).toBe(false);
	});
});

describe('encodeAssignee and decodeAssignee', () => {
	it('gives back the assignee that was encoded, also when the id has a colon', () => {
		expect(decodeAssignee(encodeAssignee({ type: 'agent', id: 'a:1' }))).toEqual({
			type: 'agent',
			id: 'a:1',
		});
	});

	it('reads "Unassigned" and an unknown value as no assignee', () => {
		expect(decodeAssignee(encodeAssignee(null))).toBeNull();
		expect(decodeAssignee('workflow:w1')).toBeNull();
	});
});
