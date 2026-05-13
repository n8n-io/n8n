import type { User } from '@n8n/db';
import type { INodeCredentialsDetails, INodeExecutionData, INodeParameters } from 'n8n-workflow';
import { ensureError, jsonStringify } from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import type { ProjectService } from '@/services/project.service.ee';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const credentialRefSchema = z.object({
	id: z.string().describe('Credential ID from list_credentials.'),
	name: z.string().describe('Credential name from list_credentials.'),
});

const inputDataItemSchema = z.object({
	json: z
		.record(z.unknown())
		.describe('JSON payload exposed to the node as $json during execution.'),
});

const inputSchema = {
	projectId: z
		.string()
		.describe(
			'The n8n project that owns the credentials. Use the homeProject.id from list_credentials.',
		),
	nodeType: z
		.string()
		.describe(
			'Canonical node id, e.g. "n8n-nodes-base.httpRequest". Get from search_workflow_nodes.',
		),
	nodeTypeVersion: z
		.number()
		.describe('Node type version to execute (e.g. 4.2). Get from search_workflow_nodes.'),
	nodeParameters: z
		.record(z.unknown())
		.describe(
			'Parameters block for the node — same shape as a workflow JSON. Use n8n expressions like ={{ $json.url }} to reference inputData.',
		),
	credentials: z
		.record(credentialRefSchema)
		.optional()
		.describe(
			'Credentials keyed by credential type (e.g. "httpHeaderAuth"). Each value is { id, name } from list_credentials. Omit for nodes that need no credential.',
		),
	inputData: z
		.array(inputDataItemSchema)
		.optional()
		.describe(
			'Items passed to the node as input. Each item drives one iteration of the node — passing an empty array short-circuits to no output. ' +
				'For nodes that take no input (e.g. an HTTP request, a "getAll" call), omit this field and the tool will execute the node once with an empty item.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	status: z
		.enum(['success', 'error'])
		.describe('"success" when the node ran, "error" when validation or execution failed.'),
	data: z
		.array(z.object({ json: z.unknown() }).passthrough())
		.describe('Node output items. Empty array on error.'),
	error: z.string().optional().describe('Error message when status is "error".'),
} satisfies z.ZodRawShape;

type ExecuteEphemeralNodeInput = z.infer<z.ZodObject<typeof inputSchema>>;
type ExecuteEphemeralNodeOutput = {
	status: 'success' | 'error';
	data: INodeExecutionData[];
	error?: string;
};

export const createExecuteEphemeralNodeTool = (
	user: User,
	ephemeralNodeExecutor: EphemeralNodeExecutor,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'execute_ephemeral_node',
	config: {
		description:
			'Run a single n8n node against real credentials without saving a workflow or execution. ' +
			'Use this for one-shot calls — testing an HTTP request, sending a Slack message, querying a DB — ' +
			'when the user does not have an existing workflow. ' +
			'For invoking an existing workflow, use execute_workflow instead. ' +
			'Always call list_credentials first to get credential id + name, and search_workflow_nodes to confirm nodeType + nodeTypeVersion. ' +
			'Trigger nodes are not supported. ' +
			'Operations that wait for human input (sendAndWait, dispatchAndWait) are not supported.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Execute Single Node',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},
	handler: async ({
		projectId,
		nodeType,
		nodeTypeVersion,
		nodeParameters,
		credentials,
		inputData,
	}: ExecuteEphemeralNodeInput) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'execute_ephemeral_node',
			parameters: {
				nodeType,
				nodeTypeVersion,
				projectId,
				hasCredentials: credentials ? Object.keys(credentials).length > 0 : false,
				hasInput: inputData ? inputData.length > 0 : false,
			},
		};

		const respond = (output: ExecuteEphemeralNodeOutput) => ({
			content: [{ type: 'text' as const, text: jsonStringify(output) }],
			structuredContent: output,
		});

		try {
			const project = await projectService.getProjectWithScope(user, projectId, [
				'ephemeralNode:execute',
			]);

			if (!project) {
				const output: ExecuteEphemeralNodeOutput = {
					status: 'error',
					data: [],
					error: `Project "${projectId}" not found or you lack the ephemeralNode:execute scope on it.`,
				};
				telemetryPayload.results = {
					success: false,
					error: output.error,
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				return respond(output);
			}

			// n8n nodes iterate once per input item. Passing [] makes the node
			// short-circuit to empty output with no error — a silent footgun that
			// looks like an auth/permissions issue. The internal agent runtime
			// (agents-tools.service.ts) sidesteps this by always sending one item;
			// mirror that here so omitting `inputData` Does The Right Thing.
			const effectiveInputData: INodeExecutionData[] =
				inputData && inputData.length > 0 ? (inputData as INodeExecutionData[]) : [{ json: {} }];

			const result = await ephemeralNodeExecutor.executeInline({
				projectId,
				nodeType,
				nodeTypeVersion,
				nodeParameters: nodeParameters as INodeParameters,
				credentialDetails: credentials as Record<string, INodeCredentialsDetails> | undefined,
				inputData: effectiveInputData,
			});

			telemetryPayload.results = {
				success: result.status === 'success',
				data: { status: result.status },
				...(result.status === 'error' ? { error: result.error ?? 'Unknown error' } : {}),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return respond(result);
		} catch (er) {
			const error = ensureError(er);
			const output: ExecuteEphemeralNodeOutput = {
				status: 'error',
				data: [],
				error: error.message || `${error.constructor.name}: (no message)`,
			};
			telemetryPayload.results = {
				success: false,
				error: { message: error.message, name: error.constructor.name },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return respond(output);
		}
	},
});
