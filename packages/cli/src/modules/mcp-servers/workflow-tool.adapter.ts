import type { McpServerToolField, McpServerToolFieldType } from '@n8n/api-types';
import {
	WorkflowToolPort,
	type WorkflowToolCheck,
	type WorkflowToolDescription,
	type WorkflowToolInspection,
	type WorkflowToolListItem,
	type WorkflowToolRefusal,
	type WorkflowToolRunOptions,
	type WorkflowToolRunResult,
} from '@n8n/backend-module-mcp-servers';
import { SharedWorkflowRepository, type User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { INodeExecutionData } from 'n8n-workflow';

import { ExecutionService } from '@/executions/execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import {
	detectTriggerNode,
	listWorkflowInputFields,
} from '@/workflows/callable/callable-workflow-input';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import { collectResultItems } from '@/workflows/callable/callable-workflow-result';
import {
	CallableWorkflowRunner,
	type CallableWorkflowRefusal,
} from '@/workflows/callable/callable-workflow-runner.service';
import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';

function normalizeInputFieldType(type: string | undefined): McpServerToolFieldType {
	switch (type) {
		case 'number':
		case 'boolean':
		case 'array':
		case 'object':
		case 'any':
			return type;
		default:
			return 'string';
	}
}

function isRedactedFieldMarker(value: unknown): boolean {
	return isRecord(value) && value.__redacted === true;
}

type InferredFieldType = McpServerToolFieldType | 'unknown';

function inferValueType(value: unknown): InferredFieldType {
	if (value === null || value === undefined || isRedactedFieldMarker(value)) return 'unknown';
	if (Array.isArray(value)) return 'array';
	const valueType = typeof value;
	switch (valueType) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'object':
			return valueType;
		default:
			return 'any';
	}
}

/** Extract field names and inferred types from the visible output items of an execution. */
function inferOutputFields(items: INodeExecutionData[]): McpServerToolField[] | null {
	if (items.length > 0 && items.every((item) => item.redaction?.redacted === true)) {
		return null;
	}
	const fields = new Map<string, InferredFieldType>();
	for (const item of items) {
		if (item.redaction?.redacted === true || !isRecord(item.json)) continue;
		for (const [name, value] of Object.entries(item.json)) {
			const nextType = inferValueType(value);
			const existing = fields.get(name);
			if (existing === undefined) {
				fields.set(name, nextType);
			} else if (existing === 'unknown') {
				if (nextType !== 'unknown') fields.set(name, nextType);
			} else if (existing !== 'any' && nextType !== 'unknown' && existing !== nextType) {
				fields.set(name, 'any');
			}
		}
	}
	return Array.from(fields, ([name, type]) => ({
		name,
		type: type === 'unknown' ? 'any' : type,
	}));
}

/** Workflow tools of custom MCP servers. They run through the shared runner, as the server's project. */
@Service()
export class WorkflowToolAdapter extends WorkflowToolPort {
	constructor(
		private readonly runner: CallableWorkflowRunner,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowLoader: CallableWorkflowLoader,
		private readonly executionService: ExecutionService,
	) {
		super();
	}

	async list(projectId: string, workflowIds?: string[]): Promise<WorkflowToolListItem[]> {
		const owned = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]);
		const wanted = workflowIds ? new Set(workflowIds) : undefined;
		const ids = wanted ? owned.filter((id) => wanted.has(id)) : owned;
		if (ids.length === 0) return [];
		const workflows = await this.workflowRepository.findByIds(ids, {
			fields: ['name', 'description', 'isArchived'],
		});
		return workflows
			.filter((workflow) => !workflow.isArchived)
			.map((workflow) => ({
				workflowId: workflow.id,
				name: workflow.name,
				description: workflow.description ?? null,
			}));
	}

	async check(projectId: string, workflowId: string): Promise<WorkflowToolCheck> {
		const check = await this.runner.check(projectId, workflowId);
		if (check.callable) return check;
		return {
			callable: false,
			reason: await this.classifyRefusal(projectId, workflowId, check.reason),
		};
	}

	async describe(projectId: string, workflowId: string): Promise<WorkflowToolDescription> {
		const described = await this.runner.describe(projectId, workflowId);
		if (described.callable) return described;
		return {
			callable: false,
			reason: await this.classifyRefusal(projectId, workflowId, described.reason),
		};
	}

	async inspect(
		projectId: string,
		workflowId: string,
		user: User,
	): Promise<WorkflowToolInspection> {
		const workflow = await this.sharedWorkflowRepository.findOwnedWorkflowSummary(
			projectId,
			workflowId,
		);
		if (!workflow || workflow.isArchived) {
			return { sourceName: null, inputs: [], outputs: null };
		}
		// Only return workflow metadata and runs that the caller can already read.
		const canReadWorkflow = await userHasScopes(user, ['workflow:read'], false, { workflowId });
		if (!canReadWorkflow) {
			return { sourceName: null, inputs: [], outputs: null };
		}

		const [inputs, outputs] = await Promise.all([
			this.inspectInputs(projectId, workflowId),
			this.inspectOutputs(workflowId, user),
		]);
		return { sourceName: workflow.name, inputs, outputs };
	}

	private async inspectInputs(
		projectId: string,
		workflowId: string,
	): Promise<McpServerToolField[]> {
		let loaded = null;
		try {
			loaded = await this.workflowLoader.loadWorkflow(
				projectId,
				{ workflowId, workflowName: '' },
				{ usePublishedVersion: true },
			);
		} catch (error) {
			if (error instanceof CallableWorkflowUnavailableError && error.reason === 'not_published') {
				loaded = await this.workflowLoader.loadWorkflow(projectId, {
					workflowId,
					workflowName: '',
				});
			} else if (error instanceof CallableWorkflowUnavailableError) {
				return [];
			} else {
				throw error;
			}
		}
		if (!loaded) return [];
		try {
			const trigger = detectTriggerNode(loaded);
			return listWorkflowInputFields(trigger.node).map((field) => ({
				name: field.name,
				type: normalizeInputFieldType(field.type),
			}));
		} catch (error) {
			if (error instanceof CallableWorkflowUnavailableError) return [];
			throw error;
		}
	}

	private async inspectOutputs(
		workflowId: string,
		user: User,
	): Promise<McpServerToolField[] | null> {
		// ExecutionService enforces `execution:read` on `workflowId` and applies redaction for `user`.
		const execution = await this.executionService.getLastSuccessfulExecution(workflowId, user);
		if (!execution || execution.dataTooLargeToDisplay || !execution.data?.resultData?.runData) {
			return null;
		}
		const { runData, lastNodeExecuted } = execution.data.resultData;
		const source =
			lastNodeExecuted && runData[lastNodeExecuted]
				? { [lastNodeExecuted]: runData[lastNodeExecuted] }
				: runData;
		const items = Object.values(collectResultItems(source, false))[0] ?? [];
		return inferOutputFields(items);
	}

	async run(
		projectId: string,
		workflowId: string,
		input: unknown,
		options: WorkflowToolRunOptions,
	): Promise<WorkflowToolRunResult> {
		const result = await this.runner.run(projectId, workflowId, input, options);
		if (result.status !== 'refused') return result;
		return {
			status: 'refused',
			reason: await this.classifyRefusal(projectId, workflowId, result.reason),
		};
	}

	private async classifyRefusal(
		projectId: string,
		workflowId: string,
		reason: CallableWorkflowRefusal,
	): Promise<WorkflowToolRefusal> {
		if (reason !== 'not_found') return reason;
		// The builder can move the workflow back, so a move is not a delete.
		return (await this.isOwnedByAnotherProject(projectId, workflowId)) ? 'moved' : 'not_found';
	}

	private async isOwnedByAnotherProject(projectId: string, workflowId: string): Promise<boolean> {
		const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds([workflowId]);
		const owner = owners.get(workflowId);
		if (!owner || owner.id === projectId) return false;
		const [workflow] = await this.workflowRepository.findByIds([workflowId], {
			fields: ['isArchived'],
		});
		return !!workflow && !workflow.isArchived;
	}
}
