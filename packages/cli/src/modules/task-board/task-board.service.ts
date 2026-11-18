import {
	TASK_BOARD_COLUMN_ROLES,
	TASK_BOARD_MAX_TAGS,
	TASK_BOARD_SEVERITIES,
	TASK_BOARD_TAG_MAX_LENGTH,
	type TaskBoardAgentUsage,
	type TaskBoardAssigneeInput,
	type TaskBoardColumn,
	type TaskBoardColumnRole,
	type TaskBoardComment,
	type TaskBoardDetail,
	type TaskBoardSeverity,
	type TaskBoardSummary,
	type TaskBoardTask,
	type TaskBoardTaskDetail,
	type TaskBoardTemplateKey,
	type TaskBoardUsageTotals,
} from '@n8n/api-types';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { TaskBoardActor, TaskBoardTaskContext } from 'n8n-workflow';

import type { TaskBoardColumnEntity } from './database/entities/task-board-column.entity';
import type { TaskBoardCommentEntity } from './database/entities/task-board-comment.entity';
import type {
	TaskBoardStoredAgentUsage,
	TaskBoardTaskEntity,
} from './database/entities/task-board-task.entity';
import type { TaskBoardEntity } from './database/entities/task-board.entity';
import { TaskBoardAgentRepository } from './database/repositories/task-board-agent.repository';
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
	type TaskBoardProjectAgent,
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
	severity?: TaskBoardSeverity | null;
	tags?: string[];
};

export type UpdateTaskBoardTaskInput = {
	title?: string;
	description?: string;
	columnId?: string;
	/** `null` removes the assignee. */
	assignee?: TaskBoardAssigneeInput | null;
	/** `null` removes the severity. */
	severity?: TaskBoardSeverity | null;
	/** Replaces all tags of the task. */
	tags?: string[];
};

/** The usage of one agent run. */
export type TaskBoardRunUsage = {
	agentId: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cost?: number | null;
};

/**
 * The number of agent hand-offs that a task can have in sequence. A comment or an assignment
 * from a person starts the count again. The limit stops agents that pass a task in a circle.
 */
export const TASK_BOARD_HANDOFF_LIMIT = 5;

// SQLite can hand back a timestamp string where the entity declares a Date.
const toIso = (value: Date | string) => new Date(value).toISOString();

/** The actor with its display name. An actor that the resolver does not know shows its id. */
const withName = <T extends ActorKey>(actor: T, names: Map<string, string>) => ({
	...actor,
	name: names.get(actorKey(actor)) ?? actor.id,
});

const isColumnRole = (value: string): value is TaskBoardColumnRole =>
	TASK_BOARD_COLUMN_ROLES.some((role) => role === value);

/** A token count from a node can be absent or not a number. */
const toTokenCount = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/** `cost` is null until one of the items has a cost. */
const sumUsage = (items: TaskBoardUsageTotals[]): TaskBoardUsageTotals => {
	const totals: TaskBoardUsageTotals = {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		cost: null,
	};
	for (const item of items) {
		totals.promptTokens += item.promptTokens;
		totals.completionTokens += item.completionTokens;
		totals.totalTokens += item.totalTokens;
		if (item.cost !== null) totals.cost = (totals.cost ?? 0) + item.cost;
	}
	return totals;
};

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
		private readonly boardAgentRepository: TaskBoardAgentRepository,
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

	/** Puts an agent of the project on the team of the board, so that it can take tasks. */
	async addBoardAgent(projectId: string, boardId: string, agentId: string): Promise<void> {
		const board = await this.findBoardInProject(projectId, boardId);
		const agentProjectId = await this.actorResolver.findAgentProjectId(agentId);
		if (agentProjectId === undefined) {
			throw new TaskBoardValidationError('Agents are not turned on for this instance');
		}
		if (agentProjectId !== projectId) {
			throw new TaskBoardValidationError(`Agent "${agentId}" not found in this project`);
		}
		await this.boardAgentRepository.addAgent(board.id, agentId);
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
		return { ...thread.task, comments: thread.comments, usageByAgent: thread.usageByAgent };
	}

	async createTask(
		projectId: string,
		input: CreateTaskBoardTaskInput,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const board = await this.findBoardInProject(projectId, input.boardId);
		const columns = await this.columnRepository.findByBoardId(board.id);
		if (input.assignee) await this.validateAssignee(board.id, input.assignee);
		const severity = this.checkSeverity(input.severity ?? null);
		const tags = this.normaliseTags(input.tags ?? []);

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
					severity,
					tags,
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
	 * Changes the title, description, severity, tags, column and assignee. Publishes
	 * `task.moved` when the column changes and `task.assigned` when the assignee changes.
	 */
	async updateTask(
		projectId: string,
		boardId: string,
		taskId: string,
		changes: UpdateTaskBoardTaskInput,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const { board, task } = await this.findTaskInProject(projectId, taskId, boardId);
		return await this.applyChanges(board, task, changes, actor);
	}

	/** `updateTask` for a caller that does not know the board of the task. */
	async editTask(
		projectId: string,
		taskId: string,
		changes: UpdateTaskBoardTaskInput,
		actor: TaskBoardActor,
	): Promise<TaskBoardTask> {
		const { board, task } = await this.findTaskInProject(projectId, taskId);
		return await this.applyChanges(board, task, changes, actor);
	}

	/**
	 * Assigns the task to another agent of the board. `to` is an agent id or an agent name.
	 * At the hand-off limit the assignee stays, and the task moves to the "needs_input" column
	 * so that a person looks at it.
	 */
	async handoffTask(
		projectId: string,
		taskId: string,
		to: string,
		actor: TaskBoardActor,
	): Promise<{ task: TaskBoardTask; handedOff: boolean }> {
		const { board, task } = await this.findTaskInProject(projectId, taskId);
		const agents = await this.findBoardAgents(board);
		const target = this.resolveHandoffTarget(agents, to);
		if (task.assigneeType === 'agent' && task.assigneeId === target.id) {
			throw new TaskBoardValidationError(
				`The task is already assigned to the agent "${target.name}". Hand it off to a different agent`,
			);
		}

		if (task.handoffCount >= TASK_BOARD_HANDOFF_LIMIT) {
			const columns = await this.columnRepository.findByBoardId(board.id);
			// A board without this column keeps the task in its column.
			const needsInput = columns.find((column) => column.role === 'needs_input');
			const stopped = await this.applyChanges(board, task, { columnId: needsInput?.id }, actor);
			return { task: stopped, handedOff: false };
		}

		const assignee: TaskBoardAssigneeInput = { type: 'agent', id: target.id };
		const handedOff = await this.applyChanges(board, task, { assignee }, actor, {
			isHandoff: true,
		});
		return { task: handedOff, handedOff: true };
	}

	/**
	 * Adds one agent run to the usage of the task. Publishes no event: usage is bookkeeping,
	 * and an event would start the dispatcher workflow again.
	 */
	async recordUsage(
		projectId: string,
		taskId: string,
		run: TaskBoardRunUsage,
	): Promise<TaskBoardTask> {
		const { task } = await this.findTaskInProject(projectId, taskId);

		await this.txRunner.run({}, async (ctx) => {
			// Read again in the transaction, so that the sum starts from the stored values.
			const current = (await this.taskRepository.findById(task.id, ctx)) ?? task;
			const agentUsage = current.agentUsage.map((item) => ({ ...item }));
			let item = agentUsage.find((candidate) => candidate.agentId === run.agentId);
			if (!item) {
				item = {
					agentId: run.agentId,
					runs: 0,
					promptTokens: 0,
					completionTokens: 0,
					totalTokens: 0,
					cost: null,
				};
				agentUsage.push(item);
			}
			item.runs += 1;
			item.promptTokens += toTokenCount(run.promptTokens);
			item.completionTokens += toTokenCount(run.completionTokens);
			item.totalTokens += toTokenCount(run.totalTokens);
			if (typeof run.cost === 'number' && Number.isFinite(run.cost)) {
				item.cost = (item.cost ?? 0) + run.cost;
			}
			await this.taskRepository.updateTask(task.id, { agentUsage }, ctx);
		});

		return await this.reloadTask(task.id);
	}

	private async applyChanges(
		board: TaskBoardEntity,
		task: TaskBoardTaskEntity,
		changes: UpdateTaskBoardTaskInput,
		actor: TaskBoardActor,
		{ isHandoff = false }: { isHandoff?: boolean } = {},
	): Promise<TaskBoardTask> {
		const { projectId } = board;
		const update: TaskBoardTaskChanges = {};

		if (changes.title !== undefined) update.title = changes.title;
		if (changes.description !== undefined) update.description = changes.description;
		if (changes.severity !== undefined) update.severity = this.checkSeverity(changes.severity);
		if (changes.tags !== undefined) update.tags = this.normaliseTags(changes.tags);

		const fromColumnId = task.columnId;
		let toColumnId: string | undefined;
		if (changes.columnId !== undefined && changes.columnId !== task.columnId) {
			const columns = await this.columnRepository.findByBoardId(board.id);
			toColumnId = this.resolveColumn(columns, { columnId: changes.columnId }).id;
		}

		let assigneeChanged = false;
		if (changes.assignee !== undefined && !this.isSameAssignee(task, changes.assignee)) {
			// A hand-off target comes from the agent list of the board, so it is valid.
			if (changes.assignee && !isHandoff) await this.validateAssignee(board.id, changes.assignee);
			update.assigneeType = changes.assignee?.type ?? null;
			update.assigneeId = changes.assignee?.id ?? null;
			assigneeChanged = true;
			if (isHandoff) update.handoffCount = task.handoffCount + 1;
			else if (actor.type === 'user' && task.handoffCount !== 0) update.handoffCount = 0;
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
		// A person looked at the task, so the agents can hand it off again.
		if (actor.type === 'user' && task.handoffCount !== 0) {
			await this.taskRepository.updateTask(task.id, { handoffCount: 0 });
		}

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
		const [columns, thread, agents] = await Promise.all([
			this.columnRepository.findByBoardId(board.id),
			this.loadThread(task),
			this.findBoardAgents(board),
		]);
		const { task: taskData, comments: commentData } = thread;
		const columnName = columns.find((column) => column.id === task.columnId)?.name ?? 'Unknown';
		// A dispatcher workflow can run only a published agent.
		const team = agents
			.filter((agent) => agent.isPublished)
			.filter((agent) => !(task.assigneeType === 'agent' && task.assigneeId === agent.id))
			.map(({ id, name, description }) => ({ id, name, description }));

		return {
			task: taskData,
			board: { id: board.id, name: board.name, workflowId: board.workflowId },
			columns: columns.map((column) => this.toColumn(column)),
			assignee: taskData.assignee,
			comments: commentData,
			threadText: this.buildThreadText(taskData, columnName, commentData),
			team,
			teamText: team
				.map(({ id, name, description }) =>
					description ? `- ${name} (id: ${id}): ${description}` : `- ${name} (id: ${id})`,
				)
				.join('\n'),
			handoffCount: task.handoffCount,
		};
	}

	// ----------------------------------
	//            helpers
	// ----------------------------------

	/** The task, its comments and its usage for each agent, with the display name of every actor. */
	private async loadThread(task: TaskBoardTaskEntity) {
		const comments = await this.commentRepository.findByTaskId(task.id);
		const names = await this.actorResolver.resolveNames([
			...this.actorsOfTask(task),
			...comments.map((comment) => ({ type: comment.authorType, id: comment.authorId })),
			...task.agentUsage.map((item): ActorKey => ({ type: 'agent', id: item.agentId })),
		]);
		return {
			task: this.toTask(task, names),
			comments: comments.map((comment) => this.toComment(comment, names)),
			usageByAgent: task.agentUsage.map((item) => this.toAgentUsage(item, names)),
		};
	}

	/** Trims and lower-cases the tags, and removes empty tags and duplicates. */
	private normaliseTags(tags: string[]) {
		const normalised = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))].filter(
			(tag) => tag !== '',
		);
		if (normalised.length > TASK_BOARD_MAX_TAGS) {
			throw new TaskBoardValidationError(`A task can have ${TASK_BOARD_MAX_TAGS} tags at most`);
		}
		const tooLong = normalised.find((tag) => tag.length > TASK_BOARD_TAG_MAX_LENGTH);
		if (tooLong !== undefined) {
			throw new TaskBoardValidationError(
				`The tag "${tooLong}" is longer than ${TASK_BOARD_TAG_MAX_LENGTH} characters`,
			);
		}
		return normalised;
	}

	/** A node can pass any string, so the value is checked here and not only in the REST DTO. */
	private checkSeverity(severity: string | null): TaskBoardSeverity | null {
		if (severity === null) return null;
		const known = TASK_BOARD_SEVERITIES.find((value) => value === severity);
		if (known === undefined) {
			throw new TaskBoardValidationError(
				`Unknown severity "${severity}". Use one of: ${TASK_BOARD_SEVERITIES.join(', ')}`,
			);
		}
		return known;
	}

	/** Finds the agent by id, then by name without regard to case. */
	private resolveHandoffTarget(agents: TaskBoardProjectAgent[], to: string) {
		const wanted = to.trim();
		const byName = agents.filter((agent) => agent.name.toLowerCase() === wanted.toLowerCase());
		if (byName.length > 1) {
			throw new TaskBoardValidationError(
				`More than one agent has the name "${wanted}". Use the agent ID`,
			);
		}
		const target = agents.find((agent) => agent.id === wanted) ?? byName[0];
		if (!target) {
			const available = agents
				.filter((agent) => agent.isPublished)
				.map((agent) => `${agent.name} (id: ${agent.id})`);
			throw new TaskBoardValidationError(
				`No agent with the ID or name "${wanted}" on this board. ` +
					(available.length > 0
						? `Available agents: ${available.join(', ')}`
						: 'This board has no published agents'),
			);
		}
		if (!target.isPublished) {
			throw new TaskBoardValidationError(
				`The agent "${target.name}" is not published, so it cannot take the task`,
			);
		}
		return target;
	}

	/** The agents on the team of the board that are not archived. */
	private async findBoardAgents(board: TaskBoardEntity): Promise<TaskBoardProjectAgent[]> {
		const [agents, agentIds] = await Promise.all([
			this.actorResolver.findProjectAgents(board.projectId),
			this.boardAgentRepository.findAgentIdsByBoardId(board.id),
		]);
		const onBoard = new Set(agentIds);
		return agents.filter((agent) => onBoard.has(agent.id));
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

	/** An agent assignee must be on the team of the board. */
	private async validateAssignee(boardId: string, assignee: TaskBoardAssigneeInput) {
		if (assignee.type === 'agent') {
			const agentIds = await this.boardAgentRepository.findAgentIdsByBoardId(boardId);
			if (!agentIds.includes(assignee.id)) {
				throw new TaskBoardValidationError(`Agent "${assignee.id}" is not on this board`);
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
		const [columns, tasks, agentIds] = await Promise.all([
			this.columnRepository.findByBoardId(board.id),
			this.taskRepository.findByBoardId(board.id),
			this.boardAgentRepository.findAgentIdsByBoardId(board.id),
		]);
		const names = await this.actorResolver.resolveNames(
			tasks.flatMap((task) => this.actorsOfTask(task)),
		);
		return {
			...this.toSummary(board, tasks.length),
			columns: columns.map((column) => this.toColumn(column)),
			tasks: tasks.map((task) => this.toTask(task, names)),
			agentIds,
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
			severity: task.severity,
			tags: task.tags,
			usage: sumUsage(task.agentUsage),
			createdBy: withName({ type: task.createdByType, id: task.createdById }, names),
			position: task.position,
			createdAt: toIso(task.createdAt),
			updatedAt: toIso(task.updatedAt),
		};
	}

	private toAgentUsage(
		item: TaskBoardStoredAgentUsage,
		names: Map<string, string>,
	): TaskBoardAgentUsage {
		return {
			...item,
			agentName: names.get(actorKey({ type: 'agent', id: item.agentId })) ?? item.agentId,
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
		if (task.severity) lines.push(`Severity: ${task.severity}`);
		if (task.tags.length > 0) lines.push(`Tags: ${task.tags.join(', ')}`);
		if (comments.length > 0) {
			lines.push('', 'Comments:');
			for (const comment of comments) {
				lines.push(`[${comment.author.name} (${comment.author.type})] ${comment.body}`);
			}
		}
		return lines.join('\n');
	}
}
