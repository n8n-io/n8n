import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import moment from 'moment-timezone';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IRunExecutionData,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
	UserError,
	UnexpectedError,
	TimeoutExecutionCancelledError,
	ensureError,
	jsonStringify,
	SCHEDULE_TRIGGER_NODE_TYPE,
	createRunExecutionData,
} from 'n8n-workflow';
import z from 'zod';

import type { ActiveExecutions } from '@/active-executions';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { McpExecutionTimeoutError } from '@/modules/mcp/mcp.errors';

const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds; // 5 minutes
type ExecuteWorkflowOutput = {
	success: boolean;
	executionId: string | null;
	result?: IRunExecutionData['resultData'];
	error?: unknown;
};

export const executeWorkflow = async (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	workflowId: string,
	inputs: any,
): Promise<ExecuteWorkflowOutput> => {
	const workflow = await workflowFinderService.findWorkflowForUser(
		workflowId,
		user,
		['workflow:execute'],
		{ includeActiveVersion: true },
	);

	if (!workflow || workflow.isArchived) {
		throw new UserError('Workflow not found');
	}

	const nodes = workflow.activeVersion?.nodes ?? [];
	const connections = workflow.activeVersion?.connections ?? {};

	const triggerNode = findMcpSupportedTrigger(nodes);

	if (!triggerNode) {
		throw new UserError(
			`Only workflows with the following trigger nodes can be executed: ${Object.values(SUPPORTED_MCP_TRIGGERS).join(', ')}.`,
		);
	}

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: getExecutionModeForTrigger(triggerNode),
		workflowData: { ...workflow, nodes, connections },
		userId: user.id,
	};

	// Set the trigger node as the start node and pin data for it
	// This will enable us to run the workflow from the trigger node with the provided inputs without waiting for an actual trigger event
	runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
	runData.pinData = getPinDataForTrigger(triggerNode, inputs);

	runData.executionData = createRunExecutionData({
		startData: {},
		resultData: {
			pinData: runData.pinData,
			runData: {},
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [
				{
					node: triggerNode,
					data: {
						main: [runData.pinData[triggerNode.name]],
					},
					source: null,
				},
			],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	});

	const executionId = await workflowRunner.run(runData);

	// Create a timeout promise
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new McpExecutionTimeoutError(executionId, WORKFLOW_EXECUTION_TIMEOUT_MS));
		}, WORKFLOW_EXECUTION_TIMEOUT_MS);
	});

	try {
		const data = await Promise.race([
			activeExecutions.getPostExecutePromise(executionId),
			timeoutPromise,
		]);

		// Executed successfully before timeout: clear the timeout
		clearTimeout(timeoutId);

		if (data === undefined) {
			throw new UnexpectedError('Workflow did not return any data');
		}

		return {
			success: data.status !== 'error' && !data.data.resultData?.error,
			executionId,
			result: data.data.resultData,
			error: data.data.resultData?.error,
		};
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId);

		// If we hit the timeout, attempt to stop the execution
		if (error instanceof McpExecutionTimeoutError) {
			try {
				const cancellationError = new TimeoutExecutionCancelledError(error.executionId!);
				activeExecutions.stopExecution(error.executionId!, cancellationError);
			} catch (stopError) {
				throw new UnexpectedError(
					`Failed to stop timed-out execution [id: ${error.executionId}]: ${ensureError(stopError).message}`,
				);
			}
		}
		// Re-throw the error to be handled by the caller
		throw error;
	}
};

const getExecutionModeForTrigger = (node: INode): WorkflowExecuteMode => {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case FORM_TRIGGER_NODE_TYPE:
			return 'trigger';
		default:
			return 'trigger';
	}
};

const getPinDataForTrigger = (node: INode, inputs: any): IPinData => {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE: {
			// For webhook triggers, provide default empty values if no inputs or wrong type
			const webhookData = inputs?.type === 'webhook' ? inputs.webhookData : undefined;
			return {
				[node.name]: [
					{
						json: {
							headers: webhookData?.headers ?? {},
							query: webhookData?.query ?? {},
							body: webhookData?.body ?? {},
						},
					},
				],
			};
		}
		case CHAT_TRIGGER_NODE_TYPE:
			if (!inputs || inputs.type !== 'chat') return {};
			return {
				[node.name]: [
					{
						json: {
							sessionId: `mcp-session-${Date.now()}`,
							action: 'sendMessage',
							chatInput: inputs.chatInput,
						},
					},
				],
			};
		case FORM_TRIGGER_NODE_TYPE:
			if (!inputs || inputs.type !== 'form') return {};
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'mcp',
							...(inputs.formData ?? {}),
						},
					},
				],
			};
		case SCHEDULE_TRIGGER_NODE_TYPE: {
			// For schedule triggers, we don't map any inputs but we can add expected datetime info
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const momentTz = moment.tz(timezone);
			return {
				[node.name]: [
					{
						json: {
							timestamp: momentTz.toISOString(true),
							'Readable date': momentTz.format('MMMM Do YYYY, h:mm:ss a'),
							'Readable time': momentTz.format('h:mm:ss a'),
							'Day of week': momentTz.format('dddd'),
							Year: momentTz.format('YYYY'),
							Month: momentTz.format('MMMM'),
							'Day of month': momentTz.format('DD'),
							Hour: momentTz.format('HH'),
							Minute: momentTz.format('mm'),
							Second: momentTz.format('ss'),
							Timezone: `${timezone} (UTC${momentTz.format('Z')})`,
						},
					},
				],
			};
		}
		default:
			return {};
	}
};

export const findMcpSupportedTrigger = (nodes: INode[]): INode | undefined => {
	const triggerNodeTypes = Object.keys(SUPPORTED_MCP_TRIGGERS);
	return nodes.find((node) => triggerNodeTypes.includes(node.type) && !node.disabled);
};

export const SUPPORTED_MCP_TRIGGERS = {
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
};
