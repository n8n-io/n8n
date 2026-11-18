import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner } from '@n8n/db';
import type { TaskBoardActor, TaskBoardEvent } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { TaskBoardColumnEntity } from '../database/entities/task-board-column.entity';
import type { TaskBoardCommentEntity } from '../database/entities/task-board-comment.entity';
import type { TaskBoardTaskEntity } from '../database/entities/task-board-task.entity';
import type { TaskBoardEntity } from '../database/entities/task-board.entity';
import type { TaskBoardAgentRepository } from '../database/repositories/task-board-agent.repository';
import type { TaskBoardColumnRepository } from '../database/repositories/task-board-column.repository';
import type { TaskBoardCommentRepository } from '../database/repositories/task-board-comment.repository';
import type { TaskBoardTaskRepository } from '../database/repositories/task-board-task.repository';
import type { TaskBoardRepository } from '../database/repositories/task-board.repository';
import type { TaskBoardActorResolver } from '../task-board-actor-resolver.service';
import { TaskBoardEventBus } from '../task-board-event-bus';
import { TaskBoardNotFoundError, TaskBoardValidationError } from '../task-board.errors';
import { TASK_BOARD_HANDOFF_LIMIT, TaskBoardService } from '../task-board.service';

describe('TaskBoardService', () => {
	const boardRepository = mock<TaskBoardRepository>();
	const columnRepository = mock<TaskBoardColumnRepository>();
	const txRunner = mock<TransactionRunner>();
	const taskRepository = mock<TaskBoardTaskRepository>();
	const commentRepository = mock<TaskBoardCommentRepository>();
	const boardAgentRepository = mock<TaskBoardAgentRepository>();
	const actorResolver = mock<TaskBoardActorResolver>();
	const eventBus = new TaskBoardEventBus(mock<Logger>({ scoped: () => mock<Logger>() }));

	const service = new TaskBoardService(
		boardRepository,
		columnRepository,
		taskRepository,
		commentRepository,
		boardAgentRepository,
		actorResolver,
		eventBus,
		txRunner,
	);

	const user: TaskBoardActor = { type: 'user', id: 'user-1' };
	const columns = [
		mock<TaskBoardColumnEntity>({ id: 'col-backlog', role: 'backlog' }),
		mock<TaskBoardColumnEntity>({ id: 'col-todo', role: 'todo' }),
		mock<TaskBoardColumnEntity>({ id: 'col-needs-input', role: 'needs_input' }),
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
			severity: null,
			tags: [],
			handoffCount: 0,
			agentUsage: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		});
	const agent: TaskBoardActor = { type: 'agent', id: 'agent-dev' };
	const projectAgents = [
		{ id: 'agent-dev', name: 'Developer', description: 'Writes code', isPublished: true },
		{ id: 'agent-qa', name: 'QA Engineer', description: 'Tests changes', isPublished: true },
		{ id: 'agent-draft', name: 'Draft', description: '', isPublished: false },
	];

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
		actorResolver.findProjectAgents.mockResolvedValue(projectAgents);
		boardAgentRepository.findAgentIdsByBoardId.mockResolvedValue(projectAgents.map(({ id }) => id));
		boardAgentRepository.addAgent.mockClear();
		commentRepository.findByTaskId.mockResolvedValue([]);
		taskRepository.updateTask.mockClear();
	});

	it('should put a new task with an agent assignee in the "todo" column and publish task.created', async () => {
		taskRepository.findNextNumber.mockResolvedValue(7);
		taskRepository.findNextPosition.mockResolvedValue(2);
		taskRepository.insertTask.mockImplementation(async (row) => taskEntity(row));
		const { events, off } = collectEvents();

		const task = await service.createTask(
			'project-1',
			{ boardId: 'board-1', title: 'Fix login', assignee: { type: 'agent', id: 'agent-dev' } },
			user,
		);
		off();

		expect(task).toMatchObject({
			columnId: 'col-todo',
			title: 'Fix login',
			position: 2,
			assignee: { type: 'agent', id: 'agent-dev' },
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
		taskRepository.findById.mockResolvedValue(taskEntity({ handoffCount: 2 }));
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
		// Only a comment from a person starts the hand-off count again.
		expect(taskRepository.updateTask).not.toHaveBeenCalled();
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

	describe('board team', () => {
		const otherBoardAgent = {
			id: 'agent-other-board',
			name: 'Other board agent',
			description: '',
			isPublished: true,
		};

		it('should reject an agent assignee that is not on the board', async () => {
			await expect(
				service.createTask(
					'project-1',
					{ boardId: 'board-1', title: 'Fix login', assignee: { type: 'agent', id: 'agent-x' } },
					user,
				),
			).rejects.toThrow('Agent "agent-x" is not on this board');
		});

		it('should offer only the agents of the board as teammates', async () => {
			actorResolver.findProjectAgents.mockResolvedValue([...projectAgents, otherBoardAgent]);
			taskRepository.findById.mockResolvedValue(
				taskEntity({ title: 'Fix login', description: '' }),
			);

			const context = await service.getTaskContext('project-1', 'task-1');

			expect(context.team.map(({ id }) => id)).toEqual(['agent-dev', 'agent-qa']);
		});

		it('should add an agent of the project to the board', async () => {
			actorResolver.findAgentProjectId.mockResolvedValue('project-1');

			await service.addBoardAgent('project-1', 'board-1', 'agent-new');

			expect(boardAgentRepository.addAgent).toHaveBeenCalledWith('board-1', 'agent-new');
		});

		it('should not add an agent of another project to the board', async () => {
			actorResolver.findAgentProjectId.mockResolvedValue('project-2');

			await expect(service.addBoardAgent('project-1', 'board-1', 'agent-new')).rejects.toThrow(
				TaskBoardValidationError,
			);
			expect(boardAgentRepository.addAgent).not.toHaveBeenCalled();
		});
	});

	describe('severity and tags', () => {
		it('should store the tags of a new task in lower case and without duplicates', async () => {
			taskRepository.findNextNumber.mockResolvedValue(1);
			taskRepository.findNextPosition.mockResolvedValue(0);
			taskRepository.insertTask.mockImplementation(async (row) => taskEntity(row));

			await service.createTask(
				'project-1',
				{
					boardId: 'board-1',
					title: 'Fix login',
					severity: 'high',
					tags: [' Bug ', 'bug', 'Frontend', '  '],
				},
				user,
			);

			expect(taskRepository.insertTask).toHaveBeenCalledWith(
				expect.objectContaining({ severity: 'high', tags: ['bug', 'frontend'] }),
				expect.anything(),
			);
		});

		it('should set and clear the severity of a task', async () => {
			taskRepository.findById.mockResolvedValue(taskEntity({ severity: 'low' }));

			await service.editTask('project-1', 'task-1', { severity: 'critical' }, user);
			await service.editTask('project-1', 'task-1', { severity: null }, user);

			expect(taskRepository.updateTask.mock.calls.map(([, changes]) => changes)).toEqual([
				{ severity: 'critical' },
				{ severity: null },
			]);
		});

		it('should normalise the tags on an update and publish no event', async () => {
			taskRepository.findById.mockResolvedValue(taskEntity({ tags: ['old'] }));
			const { events, off } = collectEvents();

			await service.editTask('project-1', 'task-1', { tags: ['API', 'api ', 'Docs'] }, user);
			off();

			expect(taskRepository.updateTask).toHaveBeenCalledWith(
				'task-1',
				{ tags: ['api', 'docs'] },
				expect.anything(),
			);
			expect(events).toEqual([]);
		});

		it('should reject a severity that does not exist', async () => {
			taskRepository.findById.mockResolvedValue(taskEntity({}));

			await expect(
				// A node parameter can hold any string.
				service.editTask('project-1', 'task-1', { severity: 'urgent' as 'high' }, user),
			).rejects.toThrow(TaskBoardValidationError);
		});

		it('should show the severity, the tags and the team in the task context', async () => {
			taskRepository.findById.mockResolvedValue(
				taskEntity({
					title: 'Fix login',
					description: '',
					severity: 'high',
					tags: ['bug', 'frontend'],
					assigneeType: 'agent',
					assigneeId: 'agent-dev',
					handoffCount: 1,
				}),
			);

			const context = await service.getTaskContext('project-1', 'task-1');

			expect(context.threadText).toContain('Severity: high');
			expect(context.threadText).toContain('Tags: bug, frontend');
			// Without the assignee and without the agent that is not published.
			expect(context.team).toEqual([
				{ id: 'agent-qa', name: 'QA Engineer', description: 'Tests changes' },
			]);
			expect(context.teamText).toBe('- QA Engineer (id: agent-qa): Tests changes');
			expect(context.handoffCount).toBe(1);
		});
	});

	describe('hand-off', () => {
		const assignedToDev = (overrides: Partial<TaskBoardTaskEntity> = {}) =>
			taskEntity({ assigneeType: 'agent', assigneeId: 'agent-dev', ...overrides });

		it('should assign the task to the agent with the given id and count the hand-off', async () => {
			taskRepository.findById.mockResolvedValue(assignedToDev({ handoffCount: 1 }));
			const { events, off } = collectEvents();

			const result = await service.handoffTask('project-1', 'task-1', 'agent-qa', agent);
			off();

			expect(result.handedOff).toBe(true);
			expect(taskRepository.updateTask).toHaveBeenCalledWith(
				'task-1',
				{ assigneeType: 'agent', assigneeId: 'agent-qa', handoffCount: 2 },
				expect.anything(),
			);
			expect(events).toEqual([
				{
					event: 'task.assigned',
					projectId: 'project-1',
					boardId: 'board-1',
					taskId: 'task-1',
					actor: agent,
				},
			]);
		});

		it('should find the target agent by its name without regard to case', async () => {
			taskRepository.findById.mockResolvedValue(assignedToDev());

			const result = await service.handoffTask('project-1', 'task-1', ' qa engineer ', agent);

			expect(result.handedOff).toBe(true);
			expect(taskRepository.updateTask).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ assigneeId: 'agent-qa' }),
				expect.anything(),
			);
		});

		it.each([
			['an agent that the project does not have', 'Designer'],
			['an agent of the project that is not on the board', 'agent-other-board'],
			['the current assignee', 'Developer'],
			['an agent that is not published', 'agent-draft'],
		])('should reject a hand-off to %s', async (_case, to) => {
			taskRepository.findById.mockResolvedValue(assignedToDev());

			await expect(service.handoffTask('project-1', 'task-1', to, agent)).rejects.toThrow(
				TaskBoardValidationError,
			);
			expect(taskRepository.updateTask).not.toHaveBeenCalled();
		});

		it('should keep the assignee and move the task to "needs_input" at the hand-off limit', async () => {
			taskRepository.findById.mockResolvedValue(
				assignedToDev({ handoffCount: TASK_BOARD_HANDOFF_LIMIT }),
			);
			taskRepository.findNextPosition.mockResolvedValue(3);
			const { events, off } = collectEvents();

			const result = await service.handoffTask('project-1', 'task-1', 'agent-qa', agent);
			off();

			expect(result.handedOff).toBe(false);
			expect(taskRepository.updateTask).toHaveBeenCalledWith(
				'task-1',
				{ columnId: 'col-needs-input', position: 3 },
				expect.anything(),
			);
			expect(events.map((event) => event.event)).toEqual(['task.moved']);
		});

		it('should start the hand-off count again when a person comments on the task', async () => {
			taskRepository.findById.mockResolvedValue(assignedToDev({ handoffCount: 4 }));
			commentRepository.insertComment.mockResolvedValue(
				mock<TaskBoardCommentEntity>({
					id: 'comment-1',
					taskId: 'task-1',
					authorType: 'user',
					authorId: 'user-1',
					body: 'Use the staging database',
					createdAt: new Date(),
				}),
			);

			await service.addComment('project-1', 'task-1', 'Use the staging database', user);

			expect(taskRepository.updateTask).toHaveBeenCalledWith('task-1', { handoffCount: 0 });
		});

		it('should start the hand-off count again when a person assigns the task', async () => {
			taskRepository.findById.mockResolvedValue(assignedToDev({ handoffCount: 4 }));

			await service.assignTask('project-1', 'task-1', { type: 'agent', id: 'agent-qa' }, user);

			expect(taskRepository.updateTask).toHaveBeenCalledWith(
				'task-1',
				{ assigneeType: 'agent', assigneeId: 'agent-qa', handoffCount: 0 },
				expect.anything(),
			);
		});
	});

	describe('usage', () => {
		const run = { agentId: 'agent-dev', promptTokens: 100, completionTokens: 20, totalTokens: 120 };

		/** Keeps the usage that the service stores, as the database does. */
		const storeUsage = (task: TaskBoardTaskEntity) => {
			taskRepository.findById.mockResolvedValue(task);
			taskRepository.updateTask.mockImplementation(async (_id, changes) => {
				Object.assign(task, changes);
			});
		};

		it('should add the runs of each agent and publish no event', async () => {
			storeUsage(taskEntity({}));
			const { events, off } = collectEvents();

			await service.recordUsage('project-1', 'task-1', run);
			await service.recordUsage('project-1', 'task-1', run);
			const task = await service.recordUsage('project-1', 'task-1', {
				agentId: 'agent-qa',
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
			});
			off();

			// No run reported a cost.
			expect(task.usage).toEqual({
				promptTokens: 210,
				completionTokens: 45,
				totalTokens: 255,
				cost: null,
			});
			expect(events).toEqual([]);
		});

		it('should sum the cost of the runs that report one', async () => {
			storeUsage(taskEntity({}));
			actorResolver.resolveNames.mockResolvedValue(new Map([['agent:agent-dev', 'Developer']]));

			await service.recordUsage('project-1', 'task-1', { ...run, cost: 0.25 });
			await service.recordUsage('project-1', 'task-1', { ...run, cost: null });
			await service.recordUsage('project-1', 'task-1', { ...run, cost: 0.5 });
			const detail = await service.getTask('project-1', 'board-1', 'task-1');

			expect(detail.usage.cost).toBe(0.75);
			expect(detail.usageByAgent).toEqual([
				{
					agentId: 'agent-dev',
					agentName: 'Developer',
					runs: 3,
					promptTokens: 300,
					completionTokens: 60,
					totalTokens: 360,
					cost: 0.75,
				},
			]);
		});
	});
});
