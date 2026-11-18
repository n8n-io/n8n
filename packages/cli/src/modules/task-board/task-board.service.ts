import {
	TASK_BOARD_COLUMN_ROLES,
	type TaskBoardAssigneeInput,
	type TaskBoardColumn,
	type TaskBoardColumnRole,
	type TaskBoardComment,
	type TaskBoardDetail,
	type TaskBoardSummary,
	type TaskBoardTask,
	type TaskBoardTaskDetail,
	type TaskBoardTemplateKey,
} from '@n8n/api-types';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { TaskBoardActor, TaskBoardTaskContext } from 'n8n-workflow';

import type { TaskBoardColumnEntity } from './database/entities/task-board-column.entity';
import type { TaskBoardCommentEntity } from './database/entities/task-board-comment.entity';
import type { TaskBoardTaskEntity } from './database/entities/task-board-task.entity';
import type { TaskBoardEntity } from './database/entities/task-board.entity';
import {
	TaskBoardColumnRepository,
	type NewTaskBoardColumnRow,
} from './database/repositories/task-board-column.repository';
import { TaskBoardCommentRepository } from './database/repositories/task-board-comment.repository';
import {
	TaskBoardTaskRepository,
	type TaskBoardTaskChanges,
} from './database/repositories/task-board-task.repository';
import { TaskBoardRepository } from './database/repositories/task-board.repository';
import {
	actorKey,
	type ActorKey,
	TaskBoardActorResolver,
} from './task-board-actor-resolver.service';
import { TaskBoardNotFoundError, TaskBoardValidationError } from './task-board.errors';
import { TaskBoardEventBus } from './task-board-event-bus';

export type CreateTaskBoardInput = {
	projectId: string;
	name: string;
	description?: string | null;
	templateKey?: TaskBoardTemplateKey | null;
	/** From left to right. */
	columns: NewTaskBoardColumnRow[];
};

/** A column by id, or by role. The id wins when both are set. */
export type TaskBoardColumnTarget = { columnId?: string; columnRole?: string };

export type CreateTaskBoardTaskInput = TaskBoardColumnTarget & {
	boardId: string;
	title: string;
	description?: string;
	assignee?: TaskBoardAssigneeInput;
};

export type UpdateTaskBoardTaskInput = {
	title?: string;
	description?: string;
	columnId?: string;
	/** `null` removes the assignee. */
	assignee?: TaskBoardAssigneeInput | null;
};

// SQLite can hand back a timestamp string where the entity declares a Date.
const toIso = (value: Date | string) => new Date(value).toISOString();

/** The actor with its display name. An actor that the resolver does not know shows its id. */
const withName = <T extends ActorKey>(actor: T, names: Map<string, string>) => ({
	...actor,
	name: names.get(actorKey(actor)) ?? actor.id,
});

const isColumnRole = (value: string): value is TaskBoardColumnRole =>
	TASK_BOARD_COLUMN_ROLES.some((role) => role === value);

/**
 * Stores boards, tasks and comments, and publishes a task event after each write. Every
 * method takes the project of the caller and rejects boards of other projects.
 */
@Service()
export class TaskBoardService {
	constructor(
		private readonly boardRepository: TaskBoardRepository,
		private readonly columnRepository: TaskBoardColumnRepository,
		private readonly taskRepository: TaskBoardTaskRepository,
		private readonly commentRepository: TaskBoardCommentRepository,
		private readonly actorResolver: TaskBoardActorResolver,
		private readonly eventBus: TaskBoardEventBus,
		private readonly txRunner: TransactionRunner,
	) {}

	// ----------------------------------
	//            boards
	// ----------------------------------

	async listBoards(projectIds: string[]): Promise<TaskBoardSummary[]> {
		const boards = await this.boardRepository.findByProjectIds(projectIds);
		const counts = await this.taskRepository.countByBoardIds(boards.map((board) => board.id));
		return boards.map((board) => this.toSummary(board, counts.get(board.id) ?? 0));
	}

	async getBoard(projectId: string, boardId: string): Promise<TaskBoardDetail> {
		const board = await this.findBoardInProject(projectId, boardId);
		return await this.toDetail(board);
	}

	async createBoard(input: CreateTaskBoardInput): Promise<TaskBoardDetail> {
		const board = await this.txRunner.run({}, async (ctx) => {
			const created = await this.boardRepository.insertBoard(
				{
					projectId: input.projectId,
					name: input.name,
					description: input.description ?? null,
					templateKey: input.templateKey ?? null,
					workflowId: null,
				},
				ctx,
			);
			await this.columnRepository.insertColumns(created.id, input.columns, ctx);
			return created;
		});
		return await this.toDetail(board);
	}

	/** Links the dispatcher workflow to the board. `null` unlinks it. */
	async setBoardWorkflow(boardId: string, workflowId: string | null): Promise<void> {
		await this.boardRepository.setWorkflowId(boardId, workflowId);
	}

	/**
	 * Deletes the board with its columns, tasks and comments.
	 * The workflows of the board stay: the user can have changed them.
	 */
	async deleteBoard(projectId: string, boardId: string): Promise<void> {
		const board = await this.findBoardInProject(projectId, boardId);
		await this.boardRepository.deleteBoard(board.id);
	}

	// ----------------------------------
	//             tasks
	// ----------------------------------

	async getTask(projectId: string, boardId: string, taskId: string): Promise<TaskBoardTaskDetail> {
		const { task } = await this.findTaskInProject(projectId, taskId, boardId);
		const thread = await this.loadThread(task);
		return { ...thread.task, comments: thread.comments };
	}

	async createTask(
		projectId: string,
		input: CreateTaskBoardTaskInput,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const board = await this.findBoardInProject(projectId, input.boardId);
		const columns = await this.columnRepository.findByBoardId(board.id);
		if (input.assignee) await this.validateAssignee(projectId, input.assignee);

		const column =
			input.columnId !== undefined || input.columnRole !== undefined
				? this.resolveColumn(columns, input)
				: this.defaultColumn(columns, input.assignee !== undefined);

		const task = await this.txRunner.run({}, async (ctx) => {
			const taskNumber = await this.taskRepository.findNextNumber(board.id, ctx);
			const position = await this.taskRepository.findNextPosition(column.id, ctx);
			return await this.taskRepository.insertTask(
				{
					boardId: board.id,
					columnId: column.id,
					taskNumber,
					title: input.title,
					description: input.description ?? '',
					assigneeType: input.assignee?.type ?? null,
					assigneeId: input.assignee?.id ?? null,
					createdByType: actor.type,
					createdById: actor.id,
					position,
				},
				ctx,
			);
		});

		this.eventBus.publish({
			event: 'task.created',
			projectId,
			boardId: board.id,
			taskId: task.id,
			actor,
		});
		return await this.toTaskWithNames(task);
	}

	/**
	 * Changes the title, description, column and assignee. Publishes `task.moved` when the
	 * column changes and `task.assigned` when the assignee changes.
	 */
	async updateTask(
		projectId: string,
		boardId: string,
		taskId: string,
		changes: UpdateTaskBoardTaskInput,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const { board, task } = await this.findTaskInProject(projectId, taskId, boardId);
		const update: TaskBoardTaskChanges = {};

		if (changes.title !== undefined) update.title = changes.title;
		if (changes.description !== undefined) update.description = changes.description;

		const fromColumnId = task.columnId;
		let toColumnId: string | undefined;
		if (changes.columnId !== undefined && changes.columnId !== task.columnId) {
			const columns = await this.columnRepository.findByBoardId(board.id);
			toColumnId = this.resolveColumn(columns, { columnId: changes.columnId }).id;
		}

		let assigneeChanged = false;
		if (changes.assignee !== undefined && !this.isSameAssignee(task, changes.assignee)) {
			if (changes.assignee) await this.validateAssignee(projectId, changes.assignee);
			update.assigneeType = changes.assignee?.type ?? null;
			update.assigneeId = changes.assignee?.id ?? null;
			assigneeChanged = true;
		}

		await this.txRunner.run({}, async (ctx) => {
			if (toColumnId !== undefined) {
				update.columnId = toColumnId;
				update.position = await this.taskRepository.findNextPosition(toColumnId, ctx);
			}
			if (Object.keys(update).length > 0) {
				await this.taskRepository.updateTask(task.id, update, ctx);
			}
		});

		const base = { projectId, boardId: board.id, taskId: task.id, actor };
		if (toColumnId !== undefined) {
			this.eventBus.publish({ ...base, event: 'task.moved', fromColumnId, toColumnId });
		}
		if (assigneeChanged) this.eventBus.publish({ ...base, event: 'task.assigned' });

		return await this.reloadTask(task.id);
	}

	async moveTask(
		projectId: string,
		taskId: string,
		target: TaskBoardColumnTarget,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const { board, task } = await this.findTaskInProject(projectId, taskId);
		const columns = await this.columnRepository.findByBoardId(board.id);
		const column = this.resolveColumn(columns, target);
		return await this.updateTask(projectId, board.id, task.id, { columnId: column.id }, actor);
	}

	async assignTask(
		projectId: string,
		taskId: string,
		assignee: TaskBoardAssigneeInput | null,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const { board, task } = await this.findTaskInProject(projectId, taskId);
		return await this.updateTask(projectId, board.id, task.id, { assignee }, actor);
	}

	// ----------------------------------
	//            comments
	// ----------------------------------

	/** Pass `boardId` to also check that the task is on that board. */
	async addComment(
		projectId: string,
		taskId: string,
		body: string,
		actor: TaskBoardActor,
		boardId?: string,
	): Promise<TaskBoardComment> {
		const { board, task } = await this.findTaskInProject(projectId, taskId, boardId);
		const comment = await this.commentRepository.insertComment({
			taskId: task.id,
			authorType: actor.type,
			authorId: actor.id,
			body,
		});

		this.eventBus.publish({
			event: 'task.commented',
			projectId,
			boardId: board.id,
			taskId: task.id,
			actor,
			commentId: comment.id,
		});

		const names = await this.actorResolver.resolveNames([actor]);
		return this.toComment(comment, names);
	}

	// ----------------------------------
	//          task context
	// ----------------------------------

	/** The task with its board, columns and comments, for workflows and agents. */
	async getTaskContext(projectId: string, taskId: string): Promise<TaskBoardTaskContext> {
		const { board, task } = await this.findTaskInProject(projectId, taskId);
		const [columns, thread] = await Promise.all([
			this.columnRepository.findByBoardId(board.id),
			this.loadThread(task),
		]);
		const { task: taskData, comments: commentData } = thread;
		const columnName = columns.find((column) => column.id === task.columnId)?.name ?? 'Unknown';

		return {
			task: taskData,
			board: { id: board.id, name: board.name, workflowId: board.workflowId },
			columns: columns.map((column) => this.toColumn(column)),
			assignee: taskData.assignee,
			comments: commentData,
			threadText: this.buildThreadText(taskData, columnName, commentData),
		};
	}

	// ----------------------------------
	//            helpers
	// ----------------------------------

	/** The task and its comments, with the display name of every actor. */
	private async loadThread(task: TaskBoardTaskEntity) {
		const comments = await this.commentRepository.findByTaskId(task.id);
		const names = await this.actorResolver.resolveNames([
			...this.actorsOfTask(task),
			...comments.map((comment) => ({ type: comment.authorType, id: comment.authorId })),
		]);
		return {
			task: this.toTask(task, names),
			comments: comments.map((comment) => this.toComment(comment, names)),
		};
	}

	private async findBoardInProject(projectId: string, boardId: string) {
		const board = await this.boardRepository.findById(boardId);
		if (!board || board.projectId !== projectId) {
			throw new TaskBoardNotFoundError(`Task board "${boardId}" not found in this project`);
		}
		return board;
	}

	private async findTaskInProject(projectId: string, taskId: string, boardId?: string) {
		const task = await this.taskRepository.findById(taskId);
		if (!task || (boardId !== undefined && task.boardId !== boardId)) {
			throw new TaskBoardNotFoundError(`Task "${taskId}" not found`);
		}
		const board = await this.boardRepository.findById(task.boardId);
		if (!board || board.projectId !== projectId) {
			throw new TaskBoardNotFoundError(`Task "${taskId}" not found in this project`);
		}
		return { board, task };
	}

	private resolveColumn(columns: TaskBoardColumnEntity[], target: TaskBoardColumnTarget) {
		if (target.columnId !== undefined) {
			const column = columns.find((c) => c.id === target.columnId);
			if (!column) {
				throw new TaskBoardValidationError(
					`Column "${target.columnId}" does not belong to this board`,
				);
			}
			return column;
		}

		const role = target.columnRole;
		if (role === undefined || !isColumnRole(role)) {
			throw new TaskBoardValidationError(
				`Unknown column role "${String(role)}". Use one of: ${TASK_BOARD_COLUMN_ROLES.join(', ')}`,
			);
		}
		const column = columns.find((c) => c.role === role);
		if (!column) {
			throw new TaskBoardValidationError(`This board has no column with the role "${role}"`);
		}
		return column;
	}

	/** Assigned tasks start in "todo", other tasks in "backlog", else in the first column. */
	private defaultColumn(columns: TaskBoardColumnEntity[], isAssigned: boolean) {
		const preferredRole: TaskBoardColumnRole = isAssigned ? 'todo' : 'backlog';
		const column = columns.find((c) => c.role === preferredRole) ?? columns[0];
		if (!column) throw new TaskBoardValidationError('This board has no columns');
		return column;
	}

	/** Best effort: the agents module can be disabled, then the agent is not checked. */
	private async validateAssignee(projectId: string, assignee: TaskBoardAssigneeInput) {
		if (assignee.type === 'agent') {
			const agentProjectId = await this.actorResolver.findAgentProjectId(assignee.id);
			if (agentProjectId === null) {
				throw new TaskBoardValidationError(`Agent "${assignee.id}" not found`);
			}
			if (agentProjectId !== undefined && agentProjectId !== projectId) {
				throw new TaskBoardValidationError(`Agent "${assignee.id}" is not in this project`);
			}
			return;
		}

		if (!(await this.actorResolver.userExists(assignee.id))) {
			throw new TaskBoardValidationError(`User "${assignee.id}" not found`);
		}
	}

	private isSameAssignee(task: TaskBoardTaskEntity, assignee: TaskBoardAssigneeInput | null) {
		if (assignee === null) return task.assigneeId === null;
		return task.assigneeType === assignee.type && task.assigneeId === assignee.id;
	}

	private actorsOfTask(task: TaskBoardTaskEntity): ActorKey[] {
		const actors: ActorKey[] = [{ type: task.createdByType, id: task.createdById }];
		if (task.assigneeType && task.assigneeId) {
			actors.push({ type: task.assigneeType, id: task.assigneeId });
		}
		return actors;
	}

	private async reloadTask(taskId: string) {
		const task = await this.taskRepository.findById(taskId);
		if (!task) throw new TaskBoardNotFoundError(`Task "${taskId}" not found`);
		return await this.toTaskWithNames(task);
	}

	private async toTaskWithNames(task: TaskBoardTaskEntity) {
		const names = await this.actorResolver.resolveNames(this.actorsOfTask(task));
		return this.toTask(task, names);
	}

	private async toDetail(board: TaskBoardEntity): Promise<TaskBoardDetail> {
		const [columns, tasks] = await Promise.all([
			this.columnRepository.findByBoardId(board.id),
			this.taskRepository.findByBoardId(board.id),
		]);
		const names = await this.actorResolver.resolveNames(
			tasks.flatMap((task) => this.actorsOfTask(task)),
		);
		return {
			...this.toSummary(board, tasks.length),
			columns: columns.map((column) => this.toColumn(column)),
			tasks: tasks.map((task) => this.toTask(task, names)),
		};
	}

	private toSummary(board: TaskBoardEntity, taskCount: number): TaskBoardSummary {
		return {
			id: board.id,
			projectId: board.projectId,
			name: board.name,
			description: board.description,
			templateKey: board.templateKey,
			workflowId: board.workflowId,
			createdAt: toIso(board.createdAt),
			updatedAt: toIso(board.updatedAt),
			taskCount,
		};
	}

	private toColumn(column: TaskBoardColumnEntity): TaskBoardColumn {
		return {
			id: column.id,
			boardId: column.boardId,
			name: column.name,
			position: column.position,
			role: column.role,
		};
	}

	private toTask(task: TaskBoardTaskEntity, names: Map<string, string>): TaskBoardTask {
		const assignee =
			task.assigneeType && task.assigneeId
				? withName({ type: task.assigneeType, id: task.assigneeId }, names)
				: null;
		return {
			id: task.id,
			boardId: task.boardId,
			columnId: task.columnId,
			// eslint-disable-next-line id-denylist -- field name of the API contract
			number: task.taskNumber,
			title: task.title,
			description: task.description,
			assignee,
			createdBy: withName({ type: task.createdByType, id: task.createdById }, names),
			position: task.position,
			createdAt: toIso(task.createdAt),
			updatedAt: toIso(task.updatedAt),
		};
	}

	private toComment(comment: TaskBoardCommentEntity, names: Map<string, string>): TaskBoardComment {
		return {
			id: comment.id,
			taskId: comment.taskId,
			author: withName({ type: comment.authorType, id: comment.authorId }, names),
			body: comment.body,
			createdAt: toIso(comment.createdAt),
		};
	}

	private buildThreadText(
		task: TaskBoardTask,
		columnName: string,
		comments: TaskBoardComment[],
	): string {
		const lines = [`Task #${task.number}: ${task.title}`];
		if (task.description.trim()) lines.push('', task.description.trim());
		lines.push('', `Column: ${columnName}`);
		if (comments.length > 0) {
			lines.push('', 'Comments:');
			for (const comment of comments) {
				lines.push(`[${comment.author.name} (${comment.author.type})] ${comment.body}`);
			}
		}
		return lines.join('\n');
	}
}
