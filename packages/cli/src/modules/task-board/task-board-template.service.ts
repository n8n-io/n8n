import type {
	CreateTaskBoardFromTemplateDto,
	TaskBoardDetail,
	TaskBoardTemplateKey,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { NewTaskBoardColumnRow } from './database/repositories/task-board-column.repository';
import { TaskBoardValidationError } from './task-board.errors';
import { TaskBoardService } from './task-board.service';
import type { AgentDevWorkflowInput, TemplateWorkflow } from './templates/agent-dev';
import {
	agentDevColumns,
	buildAgentDevDispatcherWorkflow,
	buildAgentDevExampleIntakeWorkflow,
} from './templates/agent-dev';

type BuildWorkflow = (input: AgentDevWorkflowInput) => TemplateWorkflow;

type TemplateDefinition = {
	columns: NewTaskBoardColumnRow[];
	dispatcher: BuildWorkflow;
	/** Inactive helper workflows, such as an example intake. */
	extras: BuildWorkflow[];
};

const TEMPLATES: Record<TaskBoardTemplateKey, TemplateDefinition> = {
	'agent-dev': {
		columns: agentDevColumns,
		dispatcher: buildAgentDevDispatcherWorkflow,
		extras: [buildAgentDevExampleIntakeWorkflow],
	},
};

// The agent id is inlined into a workflow expression, so it must be a plain id.
const AGENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type CreateDispatcherWorkflowInput = {
	projectId: string;
	boardId: string;
	boardName: string;
	templateKey: TaskBoardTemplateKey;
	/** Fallback agent for tasks without an agent assignee. */
	agentId?: string;
	user: User;
};

/** Creates a board from a template: its columns, its dispatcher workflow and example workflows. */
@Service()
export class TaskBoardTemplateService {
	constructor(
		private readonly taskBoardService: TaskBoardService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('task-board');
	}

	async createFromTemplate(
		projectId: string,
		dto: CreateTaskBoardFromTemplateDto,
		user: User,
	): Promise<TaskBoardDetail> {
		if (dto.agentId !== undefined && !AGENT_ID_PATTERN.test(dto.agentId)) {
			throw new TaskBoardValidationError('The agent ID is not valid');
		}

		// Created first, because the workflows reference the board id.
		const board = await this.taskBoardService.createBoard({
			projectId,
			name: dto.name,
			templateKey: dto.templateKey,
			columns: TEMPLATES[dto.templateKey].columns,
		});

		const workflowId = await this.createDispatcherWorkflow({
			projectId,
			boardId: board.id,
			boardName: board.name,
			templateKey: dto.templateKey,
			agentId: dto.agentId,
			user,
		});
		await this.taskBoardService.setBoardWorkflow(board.id, workflowId);
		return await this.taskBoardService.getBoard(projectId, board.id);
	}

	/**
	 * Creates the template's workflows in the board's project and publishes the dispatcher.
	 * A failed publish leaves the dispatcher unpublished, so the user can publish it manually.
	 */
	private async createDispatcherWorkflow(input: CreateDispatcherWorkflowInput): Promise<string> {
		const { projectId, boardId, boardName, templateKey, agentId, user } = input;
		const template = TEMPLATES[templateKey];
		const builderInput = { boardId, boardName, agentId };

		const dispatcher = await this.createWorkflow(
			user,
			projectId,
			template.dispatcher(builderInput),
		);
		for (const buildExtra of template.extras) {
			await this.createWorkflow(user, projectId, buildExtra(builderInput));
		}

		try {
			await this.workflowService.activateWorkflow(user, dispatcher.id, {
				publishHistory: 'latestActivation',
			});
		} catch (error) {
			this.logger.warn('Could not publish the dispatcher workflow of a task board', {
				boardId,
				workflowId: dispatcher.id,
				error,
			});
		}

		return dispatcher.id;
	}

	private async createWorkflow(user: User, projectId: string, workflow: TemplateWorkflow) {
		const entity = Object.assign(new WorkflowEntity(), workflow);
		return await this.workflowCreationService.createWorkflow(user, entity, { projectId });
	}
}
