import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Task boards: boards, columns, tasks and comments that people, agents and workflows share.
 * Workflows react to task events through the Task Board Trigger node. The event bus is
 * in-process, so the module runs on main only. Disabled by default; enable it with
 * `N8N_ENABLED_MODULES=task-board`.
 */
@BackendModule({ name: 'task-board', instanceTypes: ['main'] })
export class TaskBoardModule implements ModuleInterface {
	async init() {
		await import('./task-board.controller.js');
		await import('./task-boards-global.controller.js');
	}

	async entities() {
		const { TaskBoardEntity } = await import('./database/entities/task-board.entity.js');
		const { TaskBoardColumnEntity } = await import(
			'./database/entities/task-board-column.entity.js'
		);
		const { TaskBoardTaskEntity } = await import('./database/entities/task-board-task.entity.js');
		const { TaskBoardCommentEntity } = await import(
			'./database/entities/task-board-comment.entity.js'
		);

		const { TaskBoardAgentEntity } = await import('./database/entities/task-board-agent.entity.js');

		return [
			TaskBoardEntity,
			TaskBoardColumnEntity,
			TaskBoardTaskEntity,
			TaskBoardCommentEntity,
			TaskBoardAgentEntity,
		];
	}

	async context() {
		const { TaskBoardProxyService } = await import('./task-board-proxy.service.js');

		return { taskBoardProxyProvider: Container.get(TaskBoardProxyService) };
	}
}
