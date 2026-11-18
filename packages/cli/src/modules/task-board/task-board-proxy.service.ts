import { WorkflowProjectService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type {
	INode,
	ITaskBoardProxy,
	TaskBoardEvent,
	TaskBoardProxyProvider,
	Workflow,
} from 'n8n-workflow';

import { TaskBoardEventBus } from './task-board-event-bus';
import { TaskBoardService } from './task-board.service';

/**
 * Gives Task Board nodes access to the boards of their workflow's project. Every call and
 * every event is limited to that project.
 */
@Service()
export class TaskBoardProxyService implements TaskBoardProxyProvider {
	constructor(
		private readonly taskBoardService: TaskBoardService,
		private readonly eventBus: TaskBoardEventBus,
		private readonly workflowProjectService: WorkflowProjectService,
	) {}

	async getTaskBoardProxy(workflow: Workflow, _node: INode): Promise<ITaskBoardProxy> {
		const project = await this.workflowProjectService.getWorkflowProjectCached(workflow.id);
		return this.makeProxy(project.id);
	}

	private makeProxy(projectId: string): ITaskBoardProxy {
		const service = this.taskBoardService;
		const eventBus = this.eventBus;

		return {
			onEvent(listener: (event: TaskBoardEvent) => void) {
				return eventBus.subscribe((event) => {
					if (event.projectId === projectId) listener(event);
				});
			},
			async getTaskContext(taskId) {
				return await service.getTaskContext(projectId, taskId);
			},
			async createTask(input, actor) {
				return await service.createTask(projectId, input, actor);
			},
			async addComment(taskId, body, actor) {
				return await service.addComment(projectId, taskId, body, actor);
			},
			async moveTask(taskId, target, actor) {
				return await service.moveTask(projectId, taskId, target, actor);
			},
			async assignTask(taskId, assignee, actor) {
				return await service.assignTask(projectId, taskId, assignee, actor);
			},
		};
	}
}
