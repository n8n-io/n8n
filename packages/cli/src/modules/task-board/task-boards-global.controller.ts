import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { ProjectService } from '@/services/project.service.ee';

import { TaskBoardService } from './task-board.service';

@RestController('/task-boards')
export class TaskBoardsGlobalController {
	constructor(
		private readonly taskBoardService: TaskBoardService,
		private readonly projectService: ProjectService,
	) {}

	// No scope decorator, as in `/data-tables-global`: the list holds only boards of the
	// projects where the user has `workflow:read`. A global scope would exclude project members.
	@Get('/')
	async listBoards(req: AuthenticatedRequest) {
		const projectIds = await this.projectService.getProjectIdsWithScope(req.user, [
			'workflow:read',
		]);
		return await this.taskBoardService.listBoards(projectIds);
	}
}
