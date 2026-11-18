import { z } from 'zod';

export const TASK_BOARD_ACTOR_TYPES = ['user', 'agent', 'workflow'] as const;
export const taskBoardActorTypeSchema = z.enum(TASK_BOARD_ACTOR_TYPES);
export type TaskBoardActorType = z.infer<typeof taskBoardActorTypeSchema>;

export const TASK_BOARD_ASSIGNEE_TYPES = ['user', 'agent'] as const;
export const taskBoardAssigneeTypeSchema = z.enum(TASK_BOARD_ASSIGNEE_TYPES);
export type TaskBoardAssigneeType = z.infer<typeof taskBoardAssigneeTypeSchema>;

export const TASK_BOARD_COLUMN_ROLES = [
	'backlog',
	'todo',
	'in_progress',
	'needs_input',
	'done',
] as const;
export const taskBoardColumnRoleSchema = z.enum(TASK_BOARD_COLUMN_ROLES);
export type TaskBoardColumnRole = z.infer<typeof taskBoardColumnRoleSchema>;

export const TASK_BOARD_TEMPLATE_KEYS = ['agent-dev'] as const;
export const taskBoardTemplateKeySchema = z.enum(TASK_BOARD_TEMPLATE_KEYS);
export type TaskBoardTemplateKey = z.infer<typeof taskBoardTemplateKeySchema>;

export const taskBoardAssigneeInputSchema = z.object({
	type: taskBoardAssigneeTypeSchema,
	id: z.string().min(1),
});
export type TaskBoardAssigneeInput = z.infer<typeof taskBoardAssigneeInputSchema>;

/** A user, agent or workflow, with its display name resolved by the backend. */
export interface TaskBoardActorRef {
	type: TaskBoardActorType;
	id: string;
	name: string;
}

export interface TaskBoardAssigneeRef {
	type: TaskBoardAssigneeType;
	id: string;
	name: string;
}

export interface TaskBoardColumn {
	id: string;
	boardId: string;
	name: string;
	position: number;
	role: TaskBoardColumnRole | null;
}

export interface TaskBoardTask {
	id: string;
	boardId: string;
	columnId: string;
	/** Sequential number, unique within the board. */
	number: number;
	title: string;
	description: string;
	assignee: TaskBoardAssigneeRef | null;
	createdBy: TaskBoardActorRef;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface TaskBoardComment {
	id: string;
	taskId: string;
	author: TaskBoardActorRef;
	body: string;
	createdAt: string;
}

export interface TaskBoardSummary {
	id: string;
	projectId: string;
	name: string;
	description: string | null;
	templateKey: TaskBoardTemplateKey | null;
	/** The dispatcher workflow created by the template, if any. */
	workflowId: string | null;
	createdAt: string;
	updatedAt: string;
	taskCount: number;
}

export interface TaskBoardDetail extends TaskBoardSummary {
	columns: TaskBoardColumn[];
	tasks: TaskBoardTask[];
}

export interface TaskBoardTaskDetail extends TaskBoardTask {
	comments: TaskBoardComment[];
}
