import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Tool } from '@langchain/core/tools';
import { ExecuteContext, StructuredToolkit, SupplyDataContext } from 'n8n-core';
import type {
	CloseFunction,
	IExecuteData,
	INode,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	ITaskDataConnections,
	NodeOutput,
} from 'n8n-workflow';
import {
	Workflow,
	Node,
	UserError,
	AI_VENDOR_NODE_TYPES,
	createEmptyRunExecutionData,
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';

/** Minimal tool shape for constructing an in-memory single-node execution. */
export type EphemeralWorkflowToolLike = {
	projectId: string;
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	credentials?: Record<string, INodeCredentialsDetails> | null;
};

export interface InlineNodeExecutionRequest {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	/** Credential type name → credential instance display name (resolved at execution). */
	credentials?: Record<string, string>;
	/**
	 * Pre-resolved credential ids (e.g. from ToolFromNode which has { id, name } from list_credentials).
	 */
	credentialDetails?: Record<string, INodeCredentialsDetails>;
	inputData: INodeExecutionData[];
	projectId: string;
}

export interface NodeExecutionResult {
	status: 'success' | 'error';
	data: INodeExecutionData[];
	error?: string;
}

// send and wait requires persistent workflows to handle the wait logic
const OPERATION_BLACKLIST = [SEND_AND_WAIT_OPERATION, 'dispatchAndWait'];

/**
 * Vendor-API nodes the agent runtime can execute even though they aren't
 * marked `usableAsTool`. They expose the full provider API (image generation,
 * audio, files, embeddings, etc.) — not just chat completion — and are
 * designed to back LangChain agents rather than be called as agent tools, so
 * they ship without the flag. Surfacing them here lets the agent builder use
 * e.g. OpenAI image generation as a tool.
 *
 * Scope this list to *provider* nodes only. Don't add the agent node itself,
 * the LM Chat sub-models (`lmChatOpenAi`, etc.), or generic LangChain helpers
 * like summarization — those have different semantics.
 */
export const AGENT_PROVIDER_NODE_WHITELIST = new Set<string>([...AI_VENDOR_NODE_TYPES]);

export function isAgentProviderNode(nodeType: string): boolean {
	return AGENT_PROVIDER_NODE_WHITELIST.has(nodeType);
}

/**
 * Two classes of node are legitimate agent tools:
 *
 *   1. Standard nodes whose description carries `usableAsTool: true`. The
 *      node-types resolver can wrap these into a Tool variant on demand
 *      (`convertNodeToAiTool`), and agent-created node tools should use that
 *      `*Tool` node type.
 *   2. Native tool nodes (e.g. `toolWikipedia`, `toolCalculator`) that declare
 *      `outputs: [AiTool]` up front. These never carry `usableAsTool` — they
 *      *are* tools — so a plain `usableAsTool` check rejects them.
 *
 * Accept either signal so the agent runtime works for both families.
 * Provider nodes (see {@link AGENT_PROVIDER_NODE_WHITELIST}) are admitted
 * separately by id at the call site.
 */
export function isUsableAsAgentTool(description: {
	usableAsTool?: unknown;
	outputs?: unknown;
}): boolean {
	if (description.usableAsTool) return true;
	const outputs = description.outputs;
	if (!Array.isArray(outputs)) return false;
	return outputs.some((o: unknown) => {
		if (typeof o === 'string') return o === NodeConnectionTypes.AiTool;
		if (o && typeof o === 'object' && 'type' in o) {
			return (o as { type: unknown }).type === NodeConnectionTypes.AiTool;
		}
		return false;
	});
}

@Service()
export class EphemeralNodeExecutor {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolve credential type + display name to IDs for workflow execution,
	 * scoped to the project's accessible credentials.
	 */
	private async resolveInlineCredentials(
		projectId: string,
		credentials?: Record<string, string>,
	): Promise<Record<string, INodeCredentialsDetails> | null> {
		if (!credentials || Object.keys(credentials).length === 0) {
			return null;
		}

		const accessible = await this.credentialsRepository.findAllCredentialsForProject(projectId);

		const resolved: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, credName] of Object.entries(credentials)) {
			const matches = accessible.filter(
				(c) => c.type === credType && c.name.toLowerCase() === credName.toLowerCase(),
			);

			if (matches.length === 0) {
				throw new UserError(
					`No accessible credential found for type "${credType}" with name "${credName}"`,
					{ extra: { credType, credName } },
				);
			}

			if (matches.length > 1) {
				throw new UserError(
					`Multiple credentials match type "${credType}" with name "${credName}". Use a unique credential name.`,
					{ extra: { credType, credName } },
				);
			}

			const entity = matches[0];
			resolved[credType] = { id: entity.id, name: entity.name };
		}

		return resolved;
	}

	private async verifyCredentialDetailsForProject(
		projectId: string,
		details: Record<string, INodeCredentialsDetails>,
	): Promise<Record<string, INodeCredentialsDetails>> {
		const verified: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, d] of Object.entries(details)) {
			if (!d.id) {
				throw new UserError(
					`Credential reference for "${credType}" is missing an id (required for execution).`,
					{ extra: { credType, name: d.name } },
				);
			}

			const sharedCredential = await this.sharedCredentialsRepository.findOne({
				where: { credentialsId: d.id, projectId },
				relations: { credentials: true },
			});

			if (!sharedCredential) {
				throw new UserError(`Credential "${d.name}" is not accessible or does not exist.`, {
					extra: { credType, credentialId: d.id },
				});
			}

			if (sharedCredential.credentials.type !== credType) {
				throw new UserError(
					`Credential "${sharedCredential.credentials.name}" has type "${sharedCredential.credentials.type}" but the node expects credential slot "${credType}".`,
					{
						extra: {
							credType,
							actualType: sharedCredential.credentials.type,
							credentialId: d.id,
						},
					},
				);
			}

			verified[credType] = {
				id: sharedCredential.credentials.id,
				name: sharedCredential.credentials.name,
			};
		}

		return verified;
	}

	private validateNodeForExecution(
		nodeType: string,
		typeVersion: number,
		nodeParameters: INodeParameters,
	): void {
		const resolved = this.nodeTypes.getByNameAndVersion(nodeType, typeVersion);

		if (!isUsableAsAgentTool(resolved.description) && !isAgentProviderNode(nodeType)) {
			throw new UserError('Node is not usable as a tool', { extra: { nodeType } });
		}

		if (resolved.description.group.includes('trigger')) {
			throw new UserError('Trigger nodes cannot be executed standalone', { extra: { nodeType } });
		}

		const operation = nodeParameters.operation;

		if (operation && typeof operation === 'string' && OPERATION_BLACKLIST.includes(operation)) {
			throw new UserError(`The "${operation}" is not supported for agent tool execution.`, {
				extra: { nodeType, operation },
			});
		}
	}

	/**
	 * Assemble the shared pieces (node, ephemeral workflow, additionalData,
	 * execute data) both context classes need. Keeps `executeNodeDirectly` and
	 * `withSupplyDataTool` from drifting — the setup is identical up to the
	 * choice of context class.
	 */
	private async buildEphemeralContextParts(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	) {
		const node: INode = {
			id: uuid(),
			name: 'Target Node',
			type: tool.nodeType,
			typeVersion: tool.nodeTypeVersion,
			position: [0, 0],
			parameters: tool.nodeParameters,
			credentials: tool.credentials ?? undefined,
		};
		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});
		const additionalData = await getBase({ projectId: tool.projectId });
		const runExecutionData = createEmptyRunExecutionData();
		const inputData: ITaskDataConnections = { main: [inputItems] };
		const executeData: IExecuteData = { node, data: inputData, source: null };
		const mode = 'internal' as const;
		return {
			node,
			workflow,
			additionalData,
			runExecutionData,
			inputData,
			executeData,
			mode,
		};
	}

	/**
	 * Execute a node directly without persisting a workflow or execution to the DB.
	 * Mirrors the pattern from WorkflowExecute.executeNode and DynamicNodeParametersService.
	 */
	private async executeNodeDirectly(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	): Promise<NodeExecutionResult> {
		const parts = await this.buildEphemeralContextParts(tool, inputItems);

		const context = new ExecuteContext(
			parts.workflow,
			parts.node,
			parts.additionalData,
			parts.mode,
			parts.runExecutionData,
			0,
			inputItems,
			parts.inputData,
			parts.executeData,
			[],
		);

		const nodeType = this.nodeTypes.getByNameAndVersion(tool.nodeType, tool.nodeTypeVersion);

		if (!nodeType.execute) {
			return { status: 'error', data: [], error: 'Node type does not have an execute method' };
		}

		let output: NodeOutput;
		try {
			output =
				nodeType instanceof Node
					? await nodeType.execute(context)
					: await nodeType.execute.call(context);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.debug('Node execution failed', { nodeType: tool.nodeType, error: message });
			return { status: 'error', data: [], error: message };
		}

		if (!Array.isArray(output) || !output[0]) {
			return { status: 'error', data: [], error: 'No output data' };
		}
		return { status: 'success', data: output[0] };
	}

	async executeInline(request: InlineNodeExecutionRequest): Promise<NodeExecutionResult> {
		// Validation failures (unknown node type, trigger nodes, blacklisted
		// operations like send-and-wait) need to surface to the agent as a
		// tool error rather than crashing silently. Returning the standard
		// `{ status: 'error', error }` shape lets `run_node_tool` translate
		// it into a tool-result the LLM sees AND lets the ExecutionRecorder
		// record it as a failed tool call in the session timeline.
		try {
			this.validateNodeForExecution(
				request.nodeType,
				request.nodeTypeVersion,
				request.nodeParameters,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.debug('Node execution validation failed', {
				nodeType: request.nodeType,
				error: message,
			});
			return {
				status: 'error',
				data: [],
				error: `Cannot execute node "${request.nodeType}": ${message}`,
			};
		}

		const fromNames =
			(await this.resolveInlineCredentials(request.projectId, request.credentials)) ?? {};

		let fromDetails: Record<string, INodeCredentialsDetails> = {};
		if (request.credentialDetails && Object.keys(request.credentialDetails).length > 0) {
			fromDetails = await this.verifyCredentialDetailsForProject(
				request.projectId,
				request.credentialDetails,
			);
		}

		const mergedCredentials =
			Object.keys(fromNames).length === 0 && Object.keys(fromDetails).length === 0
				? null
				: { ...fromNames, ...fromDetails };

		const tool: EphemeralWorkflowToolLike = {
			projectId: request.projectId,
			nodeType: request.nodeType,
			nodeTypeVersion: request.nodeTypeVersion,
			nodeParameters: request.nodeParameters,
			credentials: mergedCredentials,
		};

		// Native tool nodes (toolWikipedia, toolCalculator, etc.) expose their real
		// behavior via `supplyData`, which returns a LangChain `Tool`. Calling their
		// `execute` method bypasses that and loses the LLM's arguments. Pick the
		// right path based on which method the node implements.
		const nodeType = this.nodeTypes.getByNameAndVersion(tool.nodeType, tool.nodeTypeVersion);
		if (typeof nodeType.supplyData === 'function') {
			return await this.invokeSupplyDataTool(tool, request.inputData);
		}

		// TODO: for nodes with send and wait operations implement persistent workflows to handle the wait logic
		return await this.executeNodeDirectly(tool, request.inputData);
	}

	/**
	 * Instantiate the LangChain tool (or toolkit) that a `supplyData` node
	 * exposes, run a caller-supplied action against it, and clean up. Both
	 * invocation (with LLM args) and schema introspection (at tool-registration
	 * time) need the same setup/teardown, so they share this helper.
	 *
	 * `supplyData` legitimately returns either a single LangChain `Tool` or a
	 * `StructuredToolkit` (the shape MCP client nodes produce — see
	 * `SupplyDataToolResponse` in `@n8n/core`). Callers branch on which shape
	 * arrived; a `null`/malformed response is treated as an error.
	 */
	private async withSupplyDataTool<T>(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
		onTool: (response: Tool | StructuredToolkit) => Promise<T> | T,
	): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
		const parts = await this.buildEphemeralContextParts(tool, inputItems);
		const closeFunctions: CloseFunction[] = [];

		const context = new SupplyDataContext(
			parts.workflow,
			parts.node,
			parts.additionalData,
			parts.mode,
			parts.runExecutionData,
			0,
			inputItems,
			parts.inputData,
			NodeConnectionTypes.AiTool,
			parts.executeData,
			closeFunctions,
		);

		const nodeType = this.nodeTypes.getByNameAndVersion(tool.nodeType, tool.nodeTypeVersion);
		if (typeof nodeType.supplyData !== 'function') {
			return { ok: false, error: 'Node does not implement supplyData' };
		}

		try {
			const supplyDataResult = await nodeType.supplyData.call(context, 0);
			const response = supplyDataResult.response as Tool | StructuredToolkit | undefined;

			if (response instanceof StructuredToolkit) {
				return { ok: true, value: await onTool(response) };
			}
			if (response && typeof response.invoke === 'function') {
				return { ok: true, value: await onTool(response) };
			}
			return {
				ok: false,
				error: `Node "${tool.nodeType}" did not return a valid LangChain tool or toolkit`,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { ok: false, error: message };
		} finally {
			for (const closeFunction of closeFunctions) {
				try {
					await closeFunction();
				} catch (error) {
					this.logger.warn(`Error closing tool resource: ${String(error)}`);
				}
			}
		}
	}

	/**
	 * Run a native tool node (one with `supplyData`) by instantiating its
	 * LangChain tool and invoking that tool with the LLM's arguments. Mirrors
	 * the pattern in `scaling/job-processor.ts:invokeTool` but scoped to the
	 * ephemeral, single-node execution the agent runtime wants.
	 *
	 * MCP client nodes return a `StructuredToolkit` (multiple LangChain tools
	 * keyed by MCP method) rather than a single tool — the ephemeral runtime
	 * currently treats one `AgentJsonToolRef` as one invocable target, so
	 * toolkit dispatch is surfaced as an explicit error. Proper per-method
	 * expansion is tracked separately.
	 */
	private async invokeSupplyDataTool(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	): Promise<NodeExecutionResult> {
		// The LLM's structured input is the first inputItem's `json` (see
		// node-tool-factory.ts). Pass it straight through to the LangChain tool.
		const toolArgs = (inputItems[0]?.json ?? {}) as Record<string, unknown>;

		const result = await this.withSupplyDataTool(tool, inputItems, async (response) => {
			if (response instanceof StructuredToolkit) {
				// TODO(AGENT-26 follow-up): expand toolkit members into per-method
				// BuiltTools at registration so the LLM can name the specific MCP
				// tool to dispatch. For now, fail with a clear message rather than
				// silently invoke a non-existent `.invoke` on the toolkit.
				throw new Error(
					`Node "${tool.nodeType}" returned a StructuredToolkit (${response.tools.length} tools); multi-tool dispatch via the ephemeral runtime isn't supported yet.`,
				);
			}
			return (await response.invoke(toolArgs)) as unknown;
		});

		if (!result.ok) {
			this.logger.debug('supplyData tool invocation failed', {
				nodeType: tool.nodeType,
				error: result.error,
			});
			return { status: 'error', data: [], error: result.error };
		}

		return {
			status: 'success',
			data: [{ json: { response: result.value as INodeExecutionData['json'] } }],
		};
	}

	/**
	 * Instantiate the LangChain tool a `supplyData` node exposes and return its
	 * Zod schema (if it's a StructuredTool / DynamicStructuredTool / N8nTool).
	 * Used by the tool factory at registration time so the schema the LLM sees
	 * matches what `tool.invoke(args)` will zod-parse against at call time.
	 *
	 * Returns `null` when the tool has no structured schema (base `Tool` /
	 * `DynamicTool` — caller falls back to `{ input: string }`) or when
	 * introspection fails for any reason (credentials missing, MCP server
	 * unreachable). Swallowing failures here keeps tool registration robust:
	 * a bad MCP connection shouldn't prevent the agent from loading.
	 */
	async introspectSupplyDataToolSchema(tool: EphemeralWorkflowToolLike): Promise<unknown> {
		const result = await this.withSupplyDataTool(tool, [], (response) => {
			// Toolkits hold multiple tools, each with its own schema — there's no
			// single Zod schema to hand back. Return null so the factory falls
			// through to its `{ input: string }` default; proper per-method
			// introspection ships with multi-tool expansion.
			if (response instanceof StructuredToolkit) return null;
			const maybeSchema = (response as unknown as { schema?: unknown }).schema;
			return maybeSchema ?? null;
		});

		if (!result.ok) {
			// Warn (not debug) so MCP / credential introspection bugs surface in the
			// normal dev loop — registration continues either way via `null`, but an
			// invisible failure here has historically been a source of "why is the
			// LLM being told a different schema than the one it's called against?".
			this.logger.warn('supplyData tool introspection failed', {
				nodeType: tool.nodeType,
				error: result.error,
			});
			return null;
		}

		return result.value;
	}
}
