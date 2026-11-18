import {
	TASK_BOARD_ASSIGNEE_TYPES,
	type TaskBoardAssigneeRef,
	type TaskBoardAssigneeType,
	type TaskBoardColumn,
	type TaskBoardDetail,
	type TaskBoardTask,
} from '@n8n/api-types';
import type { SelectGroupItem } from '@n8n/design-system';

import { UNASSIGNED_VALUE } from './task-board.constants';
import type {
	AssigneeChange,
	AssigneeValue,
	BoardToOpenOptions,
	TaskBoardListItem,
} from './task-board.types';

export type PersonName = {
	firstName: string;
	lastName: string;
};

export function sortColumns(columns: TaskBoardColumn[]): TaskBoardColumn[] {
	return [...columns].sort((a, b) => a.position - b.position);
}

/** Groups tasks by column. Each list keeps the board order (`position`, then `number`). */
export function groupTasksByColumn(tasks: TaskBoardTask[]): Map<string, TaskBoardTask[]> {
	const sorted = [...tasks].sort((a, b) => a.position - b.position || a.number - b.number);
	const groups = new Map<string, TaskBoardTask[]>();
	for (const task of sorted) {
		const list = groups.get(task.columnId) ?? [];
		list.push(task);
		groups.set(task.columnId, list);
	}
	return groups;
}

export function encodeAssignee(assignee: Pick<TaskBoardAssigneeRef, 'type' | 'id'> | null) {
	return assignee ? `${assignee.type}:${assignee.id}` : UNASSIGNED_VALUE;
}

function isAssigneeType(value: string): value is TaskBoardAssigneeType {
	return TASK_BOARD_ASSIGNEE_TYPES.some((type) => type === value);
}

/** The inverse of `encodeAssignee`. An unknown value means "no assignee". */
export function decodeAssignee(value: AssigneeValue | undefined): AssigneeChange {
	if (!value || value === UNASSIGNED_VALUE) return null;
	const separator = value.indexOf(':');
	const type = value.slice(0, separator);
	const id = value.slice(separator + 1);
	if (separator === -1 || !id || !isAssigneeType(type)) return null;
	return { type, id };
}

/** `N8nAvatar` takes first and last name. The board only has a display name. */
export function splitName(name: string): PersonName {
	const [firstName = '', ...rest] = name.trim().split(/\s+/);
	return { firstName, lastName: rest.join(' ') };
}

/**
 * The tasks that wait for a reply from this user: they are in a "needs input" column, and
 * the user created them or is their assignee. A task that an agent works on keeps the
 * agent as its assignee, so the creator must count too.
 */
export function inboxTasks(board: TaskBoardDetail | null, userId: string | null): TaskBoardTask[] {
	if (!board || !userId) return [];
	const waiting = new Set(
		board.columns.filter((column) => column.role === 'needs_input').map((column) => column.id),
	);
	const isUser = (actor: Pick<TaskBoardTask['createdBy'], 'type' | 'id'> | null) =>
		actor?.type === 'user' && actor.id === userId;
	return board.tasks
		.filter(
			(task) => waiting.has(task.columnId) && (isUser(task.assignee) || isUser(task.createdBy)),
		)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * True while an agent works on the task. The board has no run state, so this reads the
 * column: the workflow of the board moves a task to "in progress" before the agent runs
 * and out of it when the agent stops.
 */
export function isAgentWorking(
	task: Pick<TaskBoardTask, 'assignee'>,
	column: Pick<TaskBoardColumn, 'role'> | undefined,
): boolean {
	return column?.role === 'in_progress' && task.assignee?.type === 'agent';
}

/** The boards as select groups, one group for each project, in the order of the list. */
export function groupBoardsByProject(boards: TaskBoardListItem[]): Array<SelectGroupItem<string>> {
	const groups = new Map<string, SelectGroupItem<string>>();
	for (const board of boards) {
		const group = groups.get(board.projectId) ?? {
			type: 'group',
			label: board.projectName ?? undefined,
			items: [],
		};
		group.items.push({ value: board.id, label: board.name });
		groups.set(board.projectId, group);
	}
	return [...groups.values()];
}

/**
 * The board to open when the route names none: the board the user opened last, else the
 * first one. With a project id, only the boards of that project count.
 */
export function pickBoardToOpen(
	boards: TaskBoardListItem[],
	{ projectId, lastBoardId }: BoardToOpenOptions,
): TaskBoardListItem | undefined {
	const candidates = projectId ? boards.filter((board) => board.projectId === projectId) : boards;
	return candidates.find((board) => board.id === lastBoardId) ?? candidates[0];
}
