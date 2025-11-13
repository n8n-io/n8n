import type { ExecutionRepository, IExecutionResponse, User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import type { IRun, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import z from 'zod';

import { SUPPORTED_MCP_TRIGGERS } from '../mcp.constants';
import type { ToolDefinition } from '../mcp.types';
import { isWorkflowEligibleForMCPAccess } from '../mcp.utils';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const workflowInputs = {
	chatInput: z.string().optional().describe('Input for chat-based workflows'),
	formData: z.record(z.unknown()).optional().describe('Input data for form-based workflows'),
	webhookData: z
		.object({
			body: z.record(z.unknown()).optional().describe('Request body data (main webhook payload)'),
			headers: z
				.record(z.string())
				.optional()
				.describe('HTTP headers (e.g., authorization, content-type)'),
			query: z.record(z.string()).optional().describe('Query string parameters'),
			params: z.record(z.string()).optional().describe('URL path parameters'),
			method: z
				.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
				.optional()
				.default('POST')
				.describe('HTTP method (defaults to POST)'),
		})
		.optional()
		.describe('Input data for webhook-based workflows'),
} satisfies z.ZodRawShape;

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to execute'),
	inputs: z.object(workflowInputs).optional().describe('Inputs to provide to the workflow'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	executionId: z.string().nullable().optional(),
	waitingForWebhook: z.boolean().optional(),
	message: z.string().optional(),
	result: z
		.object({
			id: z.string().optional(),
			status: z.string(),
			finished: z.boolean(),
			mode: z.string(),
			startedAt: z.string(),
			stoppedAt: z.string().nullable(),
			waitTill: z.string().nullable(),
			data: z.unknown(),
			error: z.unknown().nullable().optional(),
		})
		.nullable()
		.optional(),
	error: z.unknown().optional(),
} satisfies z.ZodRawShape;

// TODO: Add telemetry
export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	executionRepository: ExecutionRepository,
	workflowRunner: WorkflowRunner,
): ToolDefinition<typeof inputSchema> => ({
	name: 'execute_workflow',
	config: {
		description: 'Execute a workflow by id',
		inputSchema,
		outputSchema,
	},
	// TODO: Refactor
	// eslint-disable-next-line complexity
	handler: async ({ workflowId, inputs }) => {
		const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
			throw new UserError('Workflow not found');
		}

		const canExecuteWorkflow = isWorkflowEligibleForMCPAccess(workflow);

		if (!canExecuteWorkflow) {
			throw new UserError(
				`Only workflows with the following trigger nodes can be executed: ${Object.values(SUPPORTED_MCP_TRIGGERS).join(', ')}.`,
			);
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData: workflow,
			userId: user.id,
		};

		// For supported webhook-based triggers (webhook, form and chat),
		// use inputs as pin data to trigger the workflow synchronously
		const chatTriggerNode = workflow.nodes.find(
			(node) => !node.disabled && node.type === '@n8n/n8n-nodes-langchain.chatTrigger',
		);

		// TODO: Use constants for node types
		const formTriggerNode = workflow.nodes.find(
			(node) => !node.disabled && node.type === 'n8n-nodes-base.formTrigger',
		);

		const webhookNode = workflow.nodes.find(
			(node) => !node.disabled && node.type === 'n8n-nodes-base.webhook',
		);

		const scheduleTriggerNode = workflow.nodes.find(
			(node) => !node.disabled && node.type === 'n8n-nodes-base.scheduleTrigger',
		);

		const triggerNode = chatTriggerNode ?? formTriggerNode ?? webhookNode ?? scheduleTriggerNode;

		if (!triggerNode) {
			throw new UserError('No supported trigger node found to start the workflow execution.');
		}

		// Set the trigger node as the start node
		runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
		// For nodes that expect input data, provide it via pinData
		if (chatTriggerNode) {
			runData.pinData = {
				[chatTriggerNode.name]: [
					{
						json: {
							sessionId: `mcp-session-${Date.now()}`,
							action: 'sendMessage',
							chatInput: inputs?.chatInput,
						},
					},
				],
			};
		} else if (formTriggerNode) {
			runData.pinData = {
				[formTriggerNode.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'mcp',
							...(inputs?.formData ?? {}),
						},
					},
				],
			};
		} else if (webhookNode) {
			const webhookInput = inputs?.webhookData;
			runData.pinData = {
				[webhookNode.name]: [
					{
						json: {
							headers: webhookInput?.headers ?? {},
							params: webhookInput?.params ?? {},
							query: webhookInput?.query ?? {},
							body: webhookInput?.body ?? {},
							// TODO: Add this
							// webhookUrl: `http://localhost:5678/webhook/${workflow.id}`,
							executionMode: 'manual',
						},
					},
				],
			};
		}

		const executionId = await workflowRunner.run(runData);

		if (!executionId) {
			const payload = {
				success: false,
				executionId: null,
				message: 'Failed to start execution: no execution ID returned.',
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		}

		let executionResult: ReturnType<typeof serializeExecution>;
		try {
			// TODO: Check if we can remove serialization here
			executionResult = serializeExecution(
				await waitForExecutionResult(executionId, activeExecutions, executionRepository),
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed while waiting for manual execution to finish.';

			const payload = {
				success: false,
				executionId,
				message,
				error: serializeError(error),
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		}

		// TODO: Derive this from outputSchema
		const payload: {
			success: boolean;
			executionId: string;
			result: ReturnType<typeof serializeExecution>;
			error?: unknown;
			message?: string;
		} = {
			success: executionResult?.status !== 'error',
			executionId,
			result: executionResult,
			error: executionResult?.error ?? undefined,
		};

		if (!executionResult) {
			payload.success = false;
			Object.assign(payload, {
				message: 'Execution finished but result could not be retrieved.',
			});
		}

		if (executionResult?.error && typeof executionResult.error === 'object') {
			const errorWithMessage = executionResult.error as { message?: string };
			payload.message = errorWithMessage.message ?? 'Execution finished with an error.';
		}

		return {
			content: [{ type: 'text', text: JSON.stringify(payload) }],
			structuredContent: payload,
		};
	},
});

// Helper functions
const toIsoString = (value?: Date | string | null): string | null => {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	return new Date(value).toISOString();
};

const serializeError = (error: unknown) => {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}
	return error;
};

const serializeExecution = (
	execution: IRun | IExecutionResponse | null,
): {
	id?: string;
	status: string;
	finished: boolean;
	mode: string;
	startedAt: string;
	stoppedAt: string | null;
	waitTill: string | null;
	data: unknown;
	error: unknown;
} | null => {
	if (!execution) return null;

	const toFinished = (): boolean => {
		if ('finished' in execution && execution.finished !== undefined) {
			return execution.finished;
		}
		return execution.status === 'success';
	};

	const error = execution.data?.resultData?.error ?? null;

	return {
		id: 'id' in execution ? execution.id : undefined,
		status: execution.status,
		finished: toFinished(),
		mode: execution.mode,
		startedAt: toIsoString(execution.startedAt) ?? new Date().toISOString(),
		stoppedAt: toIsoString(execution.stoppedAt ?? null),
		waitTill: toIsoString(execution.waitTill ?? null),
		data: execution.data,
		error,
	};
};

const waitForExecutionResult = async (
	executionId: string,
	activeExecutions: ActiveExecutions,
	executionRepository: ExecutionRepository,
): Promise<IRun | IExecutionResponse | null> => {
	try {
		return (await activeExecutions.getPostExecutePromise(executionId)) ?? null;
	} catch (error) {
		if (error instanceof ExecutionNotFoundError) {
			const execution = await executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			return execution ?? null;
		}
		throw error;
	}
};
