import type { WorkflowsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IPinData,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
	jsonStringify,
	SCHEDULE_TRIGGER_NODE_TYPE,
	createRunExecutionData,
} from 'n8n-workflow';
import z from 'zod';

import {
	SUPPORTED_MCP_TRIGGERS,
	SUPPORTED_PRODUCTION_MCP_TRIGGERS,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type {
	ExecuteWorkflowsInputMeta,
	ToolDefinition,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import { findEnabledEligibleTriggers, isMcpSupportedTriggerType } from '../mcp.utils';
import {
	getExpectedInputsDescription,
	triggerRequiresInputs,
	workflowInputsSchema,
	type WorkflowInputs,
} from './workflow-inputs';
import { getMcpWorkflow, type FoundWorkflow } from './workflow-validation.utils';

import type { McpService } from '@/modules/mcp/mcp.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

export { type FoundWorkflow };

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to execute'),
	executionMode: z
		.enum(['manual', 'production'])
		.describe(
			'Required execution intent. Use "manual" for testing or validating the current workflow, including tests against live external services. Use "production" only when intentionally running the published workflow as a live execution.',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Name of the trigger node to execute. Required when providing inputs. If omitted, the workflow must have exactly one trigger that does not require inputs (Schedule Trigger, or Manual Trigger in manual mode). Use get_workflow_details to see available trigger names.',
		),
	inputs: workflowInputsSchema
		.optional()
		.describe(
			'Trigger payload. Required for webhook, chat, and form triggers. Must be omitted for schedule and manual triggers. Use get_workflow_details to see the expected payload for each trigger.',
		),
});

type ExecuteWorkflowInput = z.infer<typeof inputSchema>;
type ExecutionMode = ExecuteWorkflowInput['executionMode'];

type ExecuteWorkflowOutput = {
	executionId: string | null;
	status: 'started' | 'error';
	error?: string;
};

const outputSchema = {
	executionId: z.string().nullable(),
	status: z.enum(['started', 'error']).describe('The status of the execution'),
	error: z.string().optional().describe('Error message if the execution failed'),
} satisfies z.ZodRawShape;

export const createExecuteWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowRunner: WorkflowRunner,
	telemetry: Telemetry,
	mcpService: McpService,
	workflowsConfig: WorkflowsConfig,
	workflowPublishedDataService: WorkflowPublishedDataService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'execute_workflow',
	config: {
		description:
			"Execute a workflow by ID. Returns the execution ID immediately without waiting for completion. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description; pass detailLevel 'execution' to that tool when running the workflow is all you need, since the full graph is not required here.",
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Execute Workflow',
			readOnlyHint: false, // Can read and write data via workflows
			destructiveHint: true, // Can cause changes in external systems via workflows
			idempotentHint: false, // Executions can trigger side effects in external systems
			openWorldHint: true, // Can access external systems via workflows
		},
	},
	handler: async ({ workflowId, executionMode, triggerNodeName, inputs }: ExecuteWorkflowInput) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'execute_workflow',
			parameters: {
				workflowId,
				executionMode,
				inputs: getInputMetaData(inputs, triggerNodeName),
			},
		};
		try {
			const output = await executeWorkflow(
				user,
				workflowFinderService,
				workflowRunner,
				mcpService,
				workflowsConfig,
				workflowPublishedDataService,
				workflowId,
				inputs,
				executionMode,
				triggerNodeName,
			);

			telemetryPayload.results = {
				success: true,
				data: {
					executionId: output.executionId,
					status: output.status,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const errorInfo: Record<string, unknown> = {
				message: error.message || 'Unknown error',
				name: error.constructor.name,
			};

			if ('extra' in error && error.extra) {
				errorInfo.extra = error.extra;
			}
			if (error.cause) {
				errorInfo.cause =
					error.cause instanceof Error ? error.cause.message : jsonStringify(error.cause);
			}

			const output: ExecuteWorkflowOutput = {
				executionId: null,
				status: 'error',
				error: error.message ?? `${error.constructor.name}: (no message)`,
			};

			telemetryPayload.results = {
				success: false,
				error: errorInfo,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});

/**
 * Executes a workflow for the given user with provided inputs.
 * Maps MCP tool inputs to trigger node pin data and starts execution from there.
 */
export const executeWorkflow = async (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowRunner: WorkflowRunner,
	mcpService: McpService,
	workflowsConfig: WorkflowsConfig,
	workflowPublishedDataService: WorkflowPublishedDataService,
	workflowId: string,
	inputs: ExecuteWorkflowInput['inputs'],
	executionMode: ExecutionMode,
	triggerNodeName?: string,
): Promise<ExecuteWorkflowOutput> => {
	const workflow = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:execute'],
		workflowFinderService,
		{ includeActiveVersion: true },
	);
	const runData = await buildRunData(
		workflow,
		user.id,
		workflowId,
		executionMode,
		inputs,
		mcpService,
		workflowsConfig,
		workflowPublishedDataService,
		triggerNodeName,
	);

	const executionId = await workflowRunner.run(runData);

	return {
		executionId,
		status: 'started',
	};
};

const getVersionDataForExecution = async (
	workflow: FoundWorkflow,
	workflowId: string,
	executionMode: ExecutionMode,
	workflowsConfig: WorkflowsConfig,
	workflowPublishedDataService: WorkflowPublishedDataService,
) => {
	if (executionMode !== 'production') {
		return { nodes: workflow.nodes ?? [], connections: workflow.connections ?? {} };
	}

	// Behind the flag, the workflow_published_version mapping is the source of
	// truth — consult it directly rather than gating on activeVersionId. This
	// issues a second query on top of the permission-check load; collapsing them
	// is a deferred refactor.
	// TODO: collapse to a single query — https://linear.app/n8n/issue/CAT-3443
	if (workflowsConfig.useWorkflowPublicationService) {
		const publishedData = await workflowPublishedDataService.getPublishedWorkflowData(workflowId);
		if (publishedData === null) {
			throw new WorkflowAccessError(
				`Workflow '${workflowId}' has no published (active) version to execute`,
				'workflow_not_active',
			);
		}
		return {
			nodes: publishedData.publishedVersion.nodes,
			connections: publishedData.publishedVersion.connections,
		};
	}

	if (!workflow.activeVersionId) {
		throw new WorkflowAccessError(
			`Workflow '${workflowId}' has no published (active) version to execute`,
			'workflow_not_active',
		);
	}

	return {
		nodes: workflow.activeVersion?.nodes ?? [],
		connections: workflow.activeVersion?.connections ?? {},
	};
};

const buildRunData = async (
	workflow: FoundWorkflow,
	userId: string,
	workflowId: string,
	executionMode: ExecutionMode,
	inputs: ExecuteWorkflowInput['inputs'],
	mcpService: McpService,
	workflowsConfig: WorkflowsConfig,
	workflowPublishedDataService: WorkflowPublishedDataService,
	triggerNodeName?: string,
): Promise<IWorkflowExecutionDataProcess> => {
	const { nodes, connections } = await getVersionDataForExecution(
		workflow,
		workflowId,
		executionMode,
		workflowsConfig,
		workflowPublishedDataService,
	);
	const triggerNode = resolveExecuteWorkflowTrigger(nodes, executionMode, triggerNodeName, inputs);

	// Generate a unique MCP message ID for this execution (used for queue mode correlation)
	const mcpMessageId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

	const isManualExecution = executionMode === 'manual';
	const runData: IWorkflowExecutionDataProcess = {
		executionMode: isManualExecution ? 'manual' : getExecutionModeForTrigger(triggerNode),
		workflowData: { ...workflow, nodes, connections },
		userId,
		// MCP metadata for queue mode support
		isMcpExecution: mcpService.isQueueMode,
		mcpType: 'service',
		mcpSessionId: mcpMessageId, // Using messageId as sessionId for MCP Service (no persistent session)
		mcpMessageId,
	};

	// Set the trigger node as the start node and pin data for it
	// This will enable us to run the workflow from the trigger node with the provided inputs without waiting for an actual trigger event
	runData.startNodes = [{ name: triggerNode.name, sourceData: null }];

	const triggerPinData = await getPinDataForTrigger(triggerNode, inputs);
	const workflowPinData = isManualExecution ? (workflow.pinData ?? {}) : {};
	runData.pinData = { ...workflowPinData, ...triggerPinData };

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

	return runData;
};

const resolveExecuteWorkflowTrigger = (
	nodes: INode[],
	executionMode: ExecutionMode,
	triggerNodeName: string | undefined,
	inputs: ExecuteWorkflowInput['inputs'],
): INode => {
	const eligible = findEnabledEligibleTriggers(nodes, (node) =>
		isMcpSupportedTriggerType(node.type, executionMode),
	);
	const available = formatTriggerNames(eligible);

	if (inputs && !triggerNodeName) {
		// Checked here too: with no eligible trigger, `available` is "none", so asking
		// for a name would leave the caller nothing to act on.
		if (eligible.length === 0) throw noEligibleTriggerError(executionMode);
		throw new WorkflowAccessError(
			`Provide triggerNodeName when passing inputs. Available triggers: ${available}.`,
			'invalid_inputs',
		);
	}

	if (triggerNodeName) {
		const named = nodes.find((node) => node.name === triggerNodeName);
		if (!named) {
			throw new WorkflowAccessError(
				`Trigger node "${triggerNodeName}" was not found. Available triggers: ${available}.`,
				'unsupported_trigger',
			);
		}
		if (named.disabled) {
			throw new WorkflowAccessError(
				`Trigger node "${triggerNodeName}" is disabled. Enable it or choose another trigger: ${available}.`,
				'unsupported_trigger',
			);
		}
		if (!isMcpSupportedTriggerType(named.type, executionMode)) {
			if (named.type === MANUAL_TRIGGER_NODE_TYPE && executionMode === 'production') {
				throw new WorkflowAccessError(
					`Trigger node "${triggerNodeName}" cannot be used in production mode. Use a webhook, form, chat, or schedule trigger, or execute in manual mode.`,
					'unsupported_trigger',
				);
			}
			throw new WorkflowAccessError(
				`Trigger node "${triggerNodeName}" is not supported for MCP execution. Available triggers: ${available}.`,
				'unsupported_trigger',
			);
		}

		validateInputsForTrigger(named, inputs);
		return named;
	}

	const noPayloadTriggers = eligible.filter((node) => !triggerRequiresInputs(node.type));
	if (eligible.length === 1 && noPayloadTriggers.length === 1) {
		return noPayloadTriggers[0];
	}

	if (eligible.length === 0) throw noEligibleTriggerError(executionMode);

	if (eligible.every((node) => triggerRequiresInputs(node.type))) {
		throw new WorkflowAccessError(
			`Provide triggerNodeName and inputs to execute this workflow. Available triggers: ${available}.`,
			'invalid_inputs',
		);
	}

	throw new WorkflowAccessError(
		`This workflow has multiple triggers. Provide triggerNodeName to specify which one to execute. Available triggers: ${available}.`,
		'unsupported_trigger',
	);
};

const validateInputsForTrigger = (node: INode, inputs: ExecuteWorkflowInput['inputs']): void => {
	if (!triggerRequiresInputs(node.type)) {
		if (inputs) {
			throw new WorkflowAccessError(
				`Trigger node "${node.name}" does not accept inputs. Omit inputs.`,
				'invalid_inputs',
			);
		}
		return;
	}

	if (!inputs || !inputsMatchTrigger(node.type, inputs)) {
		throw new WorkflowAccessError(
			`Trigger node "${node.name}" requires inputs matching ${getExpectedInputsDescription(node.type)}.`,
			'invalid_inputs',
		);
	}
};

const inputsMatchTrigger = (nodeType: string, inputs: WorkflowInputs): boolean => {
	switch (nodeType) {
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chatInput' in inputs;
		case FORM_TRIGGER_NODE_TYPE:
			return 'formData' in inputs;
		case WEBHOOK_NODE_TYPE:
			return 'webhookData' in inputs;
		default:
			return false;
	}
};

const formatTriggerNames = (nodes: INode[]): string =>
	nodes.length > 0 ? nodes.map((node) => node.name).join(', ') : 'none';

/**
 * Raised when the workflow holds no trigger this mode can drive. Names the supported
 * types rather than the workflow's own triggers, since there are none to list.
 */
const noEligibleTriggerError = (executionMode: ExecutionMode): WorkflowAccessError =>
	new WorkflowAccessError(
		`This workflow has no trigger that can be executed in ${executionMode} mode. Supported triggers: ${getSupportedTriggerNamesForMode(executionMode).join(', ')}.`,
		'unsupported_trigger',
	);

/**
 * Gets the execution mode based on the trigger node type.
 */
const getExecutionModeForTrigger = (node: INode): WorkflowExecuteMode => {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case MANUAL_TRIGGER_NODE_TYPE:
			return 'manual';
		case FORM_TRIGGER_NODE_TYPE:
			return 'trigger';
		default:
			return 'trigger';
	}
};

/**
 * Constructs pin data for the trigger node based on provided inputs.
 * Callers must validate inputs against the trigger before this runs.
 */
const getPinDataForTrigger = async (
	node: INode,
	inputs: ExecuteWorkflowInput['inputs'],
): Promise<IPinData> => {
	switch (node.type) {
		case MANUAL_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [{ json: {} }],
			};
		case WEBHOOK_NODE_TYPE: {
			const webhookData = inputs && 'webhookData' in inputs ? inputs.webhookData : undefined;
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
		case CHAT_TRIGGER_NODE_TYPE: {
			const chatInput = inputs && 'chatInput' in inputs ? inputs.chatInput : '';
			return {
				[node.name]: [
					{
						json: {
							sessionId: `mcp-session-${Date.now()}`,
							action: 'sendMessage',
							chatInput,
						},
					},
				],
			};
		}
		case FORM_TRIGGER_NODE_TYPE: {
			const formData = inputs && 'formData' in inputs ? inputs.formData : {};
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'mcp',
							...formData,
						},
					},
				],
			};
		}
		case SCHEDULE_TRIGGER_NODE_TYPE: {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const moment = (await import('moment-timezone')).default;
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
			return { [node.name]: [{ json: {} }] };
	}
};

const getSupportedTriggerNamesForMode = (executionMode: ExecutionMode): string[] => {
	return executionMode === 'production'
		? Object.values(SUPPORTED_PRODUCTION_MCP_TRIGGERS)
		: Object.values(SUPPORTED_MCP_TRIGGERS);
};

/**
 * Reduce inputs to metadata that will be sent to telemetry.
 */
const getInputMetaData = (
	inputs: ExecuteWorkflowInput['inputs'],
	triggerNodeName?: string,
): ExecuteWorkflowsInputMeta | undefined => {
	if (!inputs && !triggerNodeName) {
		return undefined;
	}

	const metadata: ExecuteWorkflowsInputMeta = {};
	if (triggerNodeName) {
		metadata.triggerNodeName = triggerNodeName;
	}
	if (!inputs) {
		return metadata;
	}
	if ('chatInput' in inputs) {
		metadata.type = 'chat';
		metadata.parameter_count = 1;
	} else if ('formData' in inputs) {
		metadata.type = 'form';
		metadata.parameter_count = Object.keys(inputs.formData ?? {}).length;
	} else if ('webhookData' in inputs) {
		metadata.type = 'webhook';
		metadata.parameter_count = [
			inputs.webhookData?.body ? Object.keys(inputs.webhookData.body).length : 0,
			inputs.webhookData?.query ? Object.keys(inputs.webhookData.query).length : 0,
			inputs.webhookData?.headers ? Object.keys(inputs.webhookData.headers).length : 0,
		].reduce((a, b) => a + b, 0);
	}
	return metadata;
};
