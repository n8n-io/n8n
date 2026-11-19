import {
	TASK_BOARD_ASSIGNEE_TYPES,
	TASK_BOARD_MAX_TAGS,
	TASK_BOARD_SEVERITIES,
	TASK_BOARD_TAG_MAX_LENGTH,
	type TaskBoardAssigneeRef,
	type TaskBoardAssigneeType,
	type TaskBoardColumn,
	type TaskBoardDetail,
	type TaskBoardSeverity,
	type TaskBoardTask,
} from '@n8n/api-types';
import type { SelectGroupItem } from '@n8n/design-system';

import { NO_SEVERITY_VALUE, UNASSIGNED_VALUE } from './task-board.constants';
import type {
	AssigneeChange,
	AssigneeValue,
	BoardToOpenOptions,
	TaskBoardListItem,
	VisibleTags,
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

export function encodeSeverity(severity: TaskBoardSeverity | null): string {
	return severity ?? NO_SEVERITY_VALUE;
}

/** The inverse of `encodeSeverity`. An unknown value means "no severity". */
export function decodeSeverity(value: string | undefined): TaskBoardSeverity | null {
	return TASK_BOARD_SEVERITIES.find((severity) => severity === value) ?? null;
}

/** One tag in the form that the backend stores: trimmed, lower case, and not too long. */
export function normalizeTag(tag: string): string {
	return tag.trim().toLowerCase().slice(0, TASK_BOARD_TAG_MAX_LENGTH).trim();
}

/** The tags that a request can carry: normalized, without duplicates, and within the limit. */
export function normalizeTags(tags: string[]): string[] {
	const unique = new Set(tags.map(normalizeTag).filter((tag) => tag.length > 0));
	return [...unique].slice(0, TASK_BOARD_MAX_TAGS);
}

export function sameTags(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

/** Splits the tags of a card into the tags that it shows and a count of the rest. */
export function splitVisibleTags(tags: string[], limit: number): VisibleTags {
	return { shown: tags.slice(0, limit), hiddenCount: Math.max(tags.length - limit, 0) };
}

/**
 * The tags of the board that a task does not have yet, for the tags input. The tags that
 * the most tasks use come first.
 */
export function suggestTags(tasks: TaskBoardTask[], selected: string[], limit: number): string[] {
	const counts = new Map<string, number>();
	for (const task of tasks) {
		for (const tag of task.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([tag]) => !selected.includes(tag))
		.sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
		.slice(0, limit)
		.map(([tag]) => tag);
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
 *
 * A task that a workflow or an agent created, and that no person is the assignee of, has
 * no person to wait for. With `includeUnowned`, each such task counts too.
 */
export function inboxTasks(
	board: TaskBoardDetail | null,
	userId: string | null,
	{ includeUnowned = false }: { includeUnowned?: boolean } = {},
): TaskBoardTask[] {
	if (!board || !userId) return [];
	const waiting = new Set(
		board.columns.filter((column) => column.role === 'needs_input').map((column) => column.id),
	);
	type Actor = Pick<TaskBoardTask['createdBy'], 'type' | 'id'> | null;
	const isUser = (actor: Actor) => actor?.type === 'user' && actor.id === userId;
	const isUnowned = (task: TaskBoardTask) =>
		task.assignee?.type !== 'user' && task.createdBy.type !== 'user';
	return board.tasks
		.filter(
			(task) =>
				waiting.has(task.columnId) &&
				(isUser(task.assignee) || isUser(task.createdBy) || (includeUnowned && isUnowned(task))),
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
