import {
	CreateTaskBoardCommentDto,
	CreateTaskBoardFromTemplateDto,
	CreateTaskBoardTaskDto,
	UpdateTaskBoardTaskDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import type { TaskBoardActor } from 'n8n-workflow';

import { TaskBoardNotFoundError, TaskBoardValidationError } from './task-board.errors';
import { TaskBoardTemplateService } from './task-board-template.service';
import { TaskBoardService } from './task-board.service';

type ProjectRequest = AuthenticatedRequest<{ projectId: string }>;

const userActor = (req: AuthenticatedRequest): TaskBoardActor => ({
	type: 'user',
	id: req.user.id,
});

/** Maps service errors to HTTP errors. */
async function handleErrors<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof TaskBoardNotFoundError) throw new NotFoundError(error.message);
		if (error instanceof TaskBoardValidationError) throw new BadRequestError(error.message);
		throw error;
	}
}

/** The service checks that each board and task belongs to `:projectId`. */
@RestController('/projects/:projectId/task-boards')
export class TaskBoardController {
	constructor(
		private readonly taskBoardService: TaskBoardService,
		private readonly templateService: TaskBoardTemplateService,
	) {}

	@Get('/')
	@ProjectScope('workflow:read')
	async listBoards(req: ProjectRequest) {
		return await this.taskBoardService.listBoards([req.params.projectId]);
	}

	@Post('/from-template')
	@ProjectScope('workflow:create')
	async createFromTemplate(
		req: ProjectRequest,
		_res: Response,
		@Body payload: CreateTaskBoardFromTemplateDto,
	) {
		return await handleErrors(
			async () =>
				await this.templateService.createFromTemplate(req.params.projectId, payload, req.user),
		);
	}

	@Get('/:boardId')
	@ProjectScope('workflow:read')
	async getBoard(req: ProjectRequest, _res: Response, @Param('boardId') boardId: string) {
		return await handleErrors(
			async () => await this.taskBoardService.getBoard(req.params.projectId, boardId),
		);
	}

	@Delete('/:boardId')
	@ProjectScope('workflow:delete')
	async deleteBoard(req: ProjectRequest, _res: Response, @Param('boardId') boardId: string) {
		await handleErrors(
			async () => await this.taskBoardService.deleteBoard(req.params.projectId, boardId),
		);
		return true;
	}

	@Post('/:boardId/tasks')
	@ProjectScope('workflow:update')
	async createTask(
		req: ProjectRequest,
		_res: Response,
		@Param('boardId') boardId: string,
		@Body payload: CreateTaskBoardTaskDto,
	) {
		return await handleErrors(
			async () =>
				await this.taskBoardService.createTask(
					req.params.projectId,
					{ ...payload, boardId },
					userActor(req),
				),
		);
	}

	@Get('/:boardId/tasks/:taskId')
	@ProjectScope('workflow:read')
	async getTask(
		req: ProjectRequest,
		_res: Response,
		@Param('boardId') boardId: string,
		@Param('taskId') taskId: string,
	) {
		return await handleErrors(
			async () => await this.taskBoardService.getTask(req.params.projectId, boardId, taskId),
		);
	}

	@Patch('/:boardId/tasks/:taskId')
	@ProjectScope('workflow:update')
	async updateTask(
		req: ProjectRequest,
		_res: Response,
		@Param('boardId') boardId: string,
		@Param('taskId') taskId: string,
		@Body payload: UpdateTaskBoardTaskDto,
	) {
		return await handleErrors(
			async () =>
				await this.taskBoardService.updateTask(
					req.params.projectId,
					boardId,
					taskId,
					payload,
					userActor(req),
				),
		);
	}

	@Post('/:boardId/tasks/:taskId/comments')
	@ProjectScope('workflow:update')
	async addComment(
		req: ProjectRequest,
		_res: Response,
		@Param('boardId') boardId: string,
		@Param('taskId') taskId: string,
		@Body payload: CreateTaskBoardCommentDto,
	) {
		return await handleErrors(
			async () =>
				await this.taskBoardService.addComment(
					req.params.projectId,
					taskId,
					payload.body,
					userActor(req),
					boardId,
				),
		);
	}
}
