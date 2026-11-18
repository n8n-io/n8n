import type { TaskBoardDetail, TaskBoardTask } from '@n8n/api-types';

import { createBoard, createBoardSummary, createTask } from './__tests__/fixtures';
import type { TaskBoardListItem } from './task-board.types';
import {
	decodeAssignee,
	decodeSeverity,
	encodeAssignee,
	encodeSeverity,
	groupBoardsByProject,
	inboxTasks,
	isAgentWorking,
	normalizeTags,
	pickBoardToOpen,
	splitVisibleTags,
	suggestTags,
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

	it('includes a waiting task with no person on it only when unowned tasks are asked for', () => {
		const workflow = { type: 'workflow', id: 'w1', name: 'Intake' } as const;
		const unowned = task({ id: 'unowned', assignee: agent, createdBy: workflow });
		// The task of another person stays out of the inbox of this user.
		const tasks = [unowned, task({ id: 'other', assignee: agent })];

		expect(inboxTasks(board(tasks), 'me')).toEqual([]);
		expect(inboxTasks(board(tasks), 'me', { includeUnowned: true })).toEqual([unowned]);
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

describe('severity select value', () => {
	it('round-trips a severity and "no severity"', () => {
		expect(decodeSeverity(encodeSeverity('high'))).toBe('high');
		expect(decodeSeverity(encodeSeverity(null))).toBeNull();
	});

	it('reads a value that is not a severity as "no severity"', () => {
		expect(decodeSeverity('urgent')).toBeNull();
	});
});

describe('normalizeTags', () => {
	it('trims and lower-cases the tags, and drops the empty and the repeated ones', () => {
		expect(normalizeTags([' Bug ', 'bug', '', '  ', 'API'])).toEqual(['bug', 'api']);
	});

	it('cuts a tag at 32 characters, which is the limit of the backend', () => {
		expect(normalizeTags(['x'.repeat(40)])).toEqual(['x'.repeat(32)]);
	});

	it('keeps the first 10 tags, which is the limit of the backend', () => {
		const tags = Array.from({ length: 12 }, (_, index) => `tag-${index}`);

		expect(normalizeTags(tags)).toHaveLength(10);
		expect(normalizeTags(tags)[9]).toBe('tag-9');
	});
});

describe('splitVisibleTags', () => {
	it('shows the tags that fit and counts the rest', () => {
		expect(splitVisibleTags(['a', 'b', 'c', 'd', 'e'], 3)).toEqual({
			shown: ['a', 'b', 'c'],
			hiddenCount: 2,
		});
	});

	it('hides nothing when all the tags fit', () => {
		expect(splitVisibleTags(['a', 'b'], 3)).toEqual({ shown: ['a', 'b'], hiddenCount: 0 });
	});
});

describe('suggestTags', () => {
	const tasks = [
		createTask({ id: 't1', tags: ['bug', 'api'] }),
		createTask({ id: 't2', tags: ['bug', 'docs'] }),
		createTask({ id: 't3', tags: ['bug', 'docs', 'ui'] }),
	];

	it('offers the tags of the board, the most used first, then by name', () => {
		expect(suggestTags(tasks, [], 10)).toEqual(['bug', 'docs', 'api', 'ui']);
	});

	it('leaves out the tags that the task already has', () => {
		expect(suggestTags(tasks, ['bug', 'ui'], 10)).toEqual(['docs', 'api']);
	});

	it('stops at the limit', () => {
		expect(suggestTags(tasks, [], 2)).toEqual(['bug', 'docs']);
	});
});
