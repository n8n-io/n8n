import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner } from '@n8n/db';
import type { TaskBoardActor, TaskBoardEvent } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { TaskBoardColumnEntity } from '../database/entities/task-board-column.entity';
import type { TaskBoardCommentEntity } from '../database/entities/task-board-comment.entity';
import type { TaskBoardTaskEntity } from '../database/entities/task-board-task.entity';
import type { TaskBoardEntity } from '../database/entities/task-board.entity';
import type { TaskBoardColumnRepository } from '../database/repositories/task-board-column.repository';
import type { TaskBoardCommentRepository } from '../database/repositories/task-board-comment.repository';
import type { TaskBoardTaskRepository } from '../database/repositories/task-board-task.repository';
import type { TaskBoardRepository } from '../database/repositories/task-board.repository';
import type { TaskBoardActorResolver } from '../task-board-actor-resolver.service';
import { TaskBoardEventBus } from '../task-board-event-bus';
import { TaskBoardNotFoundError } from '../task-board.errors';
import { TaskBoardService } from '../task-board.service';

describe('TaskBoardService', () => {
	const boardRepository = mock<TaskBoardRepository>();
	const columnRepository = mock<TaskBoardColumnRepository>();
	const txRunner = mock<TransactionRunner>();
	const taskRepository = mock<TaskBoardTaskRepository>();
	const commentRepository = mock<TaskBoardCommentRepository>();
	const actorResolver = mock<TaskBoardActorResolver>();
	const eventBus = new TaskBoardEventBus(mock<Logger>({ scoped: () => mock<Logger>() }));

	const service = new TaskBoardService(
		boardRepository,
		columnRepository,
		taskRepository,
		commentRepository,
		actorResolver,
		eventBus,
		txRunner,
	);

	const user: TaskBoardActor = { type: 'user', id: 'user-1' };
	const columns = [
		mock<TaskBoardColumnEntity>({ id: 'col-backlog', role: 'backlog' }),
		mock<TaskBoardColumnEntity>({ id: 'col-todo', role: 'todo' }),
		mock<TaskBoardColumnEntity>({ id: 'col-done', role: 'done' }),
	];
	const taskEntity = (overrides: Partial<TaskBoardTaskEntity>) =>
		mock<TaskBoardTaskEntity>({
			id: 'task-1',
			boardId: 'board-1',
			columnId: 'col-todo',
			assigneeType: null,
			assigneeId: null,
			createdByType: 'user',
			createdById: 'user-1',
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		});

	/** Collects the events of one test. */
	const collectEvents = () => {
		const events: TaskBoardEvent[] = [];
		const off = eventBus.subscribe((event) => events.push(event));
		return { events, off };
	};

	beforeEach(() => {
		// The service runs its writes in a transaction. The mock runs them at once.
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		boardRepository.findById.mockResolvedValue(
			mock<TaskBoardEntity>({ id: 'board-1', projectId: 'project-1' }),
		);
		columnRepository.findByBoardId.mockResolvedValue(columns);
		actorResolver.resolveNames.mockResolvedValue(new Map());
	});

	it('should put a new task with an agent assignee in the "todo" column and publish task.created', async () => {
		actorResolver.findAgentProjectId.mockResolvedValue('project-1');
		taskRepository.findNextNumber.mockResolvedValue(7);
		taskRepository.findNextPosition.mockResolvedValue(2);
		taskRepository.insertTask.mockImplementation(async (row) => taskEntity(row));
		const { events, off } = collectEvents();

		const task = await service.createTask(
			'project-1',
			{ boardId: 'board-1', title: 'Fix login', assignee: { type: 'agent', id: 'agent-1' } },
			user,
		);
		off();

		expect(task).toMatchObject({
			columnId: 'col-todo',
			title: 'Fix login',
			position: 2,
			assignee: { type: 'agent', id: 'agent-1' },
		});
		expect(task.number).toBe(7);
		expect(events).toEqual([
			{
				event: 'task.created',
				projectId: 'project-1',
				boardId: 'board-1',
				taskId: 'task-1',
				actor: user,
			},
		]);
	});

	it('should move a task to the column with the given role and publish task.moved', async () => {
		taskRepository.findById.mockResolvedValue(taskEntity({ columnId: 'col-todo' }));
		taskRepository.findNextPosition.mockResolvedValue(0);
		const { events, off } = collectEvents();

		await service.moveTask('project-1', 'task-1', { columnRole: 'done' }, user);
		off();

		expect(taskRepository.updateTask).toHaveBeenCalledWith(
			'task-1',
			{ columnId: 'col-done', position: 0 },
			expect.anything(),
		);
		expect(events).toEqual([
			{
				event: 'task.moved',
				projectId: 'project-1',
				boardId: 'board-1',
				taskId: 'task-1',
				actor: user,
				fromColumnId: 'col-todo',
				toColumnId: 'col-done',
			},
		]);
	});

	it('should publish task.commented with the author as actor after the comment is stored', async () => {
		const actor: TaskBoardActor = { type: 'agent', id: 'agent-1' };
		boardRepository.findById.mockResolvedValue(
			mock<TaskBoardEntity>({ id: 'board-1', projectId: 'project-1' }),
		);
		taskRepository.findById.mockResolvedValue(
			mock<TaskBoardTaskEntity>({ id: 'task-1', boardId: 'board-1' }),
		);
		commentRepository.insertComment.mockResolvedValue(
			mock<TaskBoardCommentEntity>({
				id: 'comment-1',
				taskId: 'task-1',
				authorType: 'agent',
				authorId: 'agent-1',
				body: 'Which database?',
				createdAt: new Date(),
			}),
		);
		actorResolver.resolveNames.mockResolvedValue(new Map([['agent:agent-1', 'Dev']]));

		const events: TaskBoardEvent[] = [];
		eventBus.subscribe((event) => events.push(event));

		const comment = await service.addComment('project-1', 'task-1', 'Which database?', actor);

		expect(comment.author).toEqual({ type: 'agent', id: 'agent-1', name: 'Dev' });
		expect(events).toEqual([
			{
				event: 'task.commented',
				projectId: 'project-1',
				boardId: 'board-1',
				taskId: 'task-1',
				actor,
				commentId: 'comment-1',
			},
		]);
	});

	it('should delete a board of the project', async () => {
		boardRepository.findById.mockResolvedValue(
			mock<TaskBoardEntity>({ id: 'board-1', projectId: 'project-1' }),
		);

		await service.deleteBoard('project-1', 'board-1');

		expect(boardRepository.deleteBoard).toHaveBeenCalledWith('board-1');
	});

	it('should not delete a board that belongs to another project', async () => {
		boardRepository.deleteBoard.mockClear();
		boardRepository.findById.mockResolvedValue(
			mock<TaskBoardEntity>({ id: 'board-1', projectId: 'project-2' }),
		);

		await expect(service.deleteBoard('project-1', 'board-1')).rejects.toThrow(
			TaskBoardNotFoundError,
		);
		expect(boardRepository.deleteBoard).not.toHaveBeenCalled();
	});
});
