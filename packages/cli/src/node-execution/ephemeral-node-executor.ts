import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Tool } from '@langchain/core/tools';
import { ExecuteContext, SupplyDataContext } from 'n8n-core';
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
 * Two classes of node are legitimate agent tools:
 *
 *   1. Standard nodes whose description carries `usableAsTool: true` — the
 *      node-types resolver can wrap these into a Tool variant on demand
 *      (`convertNodeToAiTool`), but when invoked by the agent we execute the
 *      base description directly.
 *   2. Native tool nodes (e.g. `toolWikipedia`, `toolCalculator`) that declare
 *      `outputs: [AiTool]` up front. These never carry `usableAsTool` — they
 *      *are* tools — so a plain `usableAsTool` check rejects them.
 *
 * Accept either signal so the agent runtime works for both families.
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

		if (!isUsableAsAgentTool(resolved.description)) {
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
	 * Execute a node directly without persisting a workflow or execution to the DB.
	 * Mirrors the pattern from WorkflowExecute.executeNode and DynamicNodeParametersService.
	 */
	private async executeNodeDirectly(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	): Promise<NodeExecutionResult> {
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
		const mode = 'internal' as const;
		const runIndex = 0;
		const connectionInputData = inputItems;

		const inputData: ITaskDataConnections = {
			main: [inputItems],
		};

		const executeData: IExecuteData = {
			node,
			data: inputData,
			source: null,
		};

		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
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
		this.validateNodeForExecution(
			request.nodeType,
			request.nodeTypeVersion,
			request.nodeParameters,
		);

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
	 * Instantiate the LangChain tool that a `supplyData` node exposes, run a
	 * caller-supplied action against it, and clean up. Both invocation (with
	 * LLM args) and schema introspection (at tool-registration time) need the
	 * same setup/teardown, so they share this helper.
	 */
	private async withSupplyDataTool<T>(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
		onTool: (langchainTool: Tool) => Promise<T> | T,
	): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
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
		const mode = 'internal' as const;
		const inputData: ITaskDataConnections = { main: [inputItems] };
		const executeData: IExecuteData = { node, data: inputData, source: null };
		const closeFunctions: CloseFunction[] = [];

		const context = new SupplyDataContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			0,
			inputItems,
			inputData,
			NodeConnectionTypes.AiTool,
			executeData,
			closeFunctions,
		);

		const nodeType = this.nodeTypes.getByNameAndVersion(tool.nodeType, tool.nodeTypeVersion);
		if (typeof nodeType.supplyData !== 'function') {
			return { ok: false, error: 'Node does not implement supplyData' };
		}

		try {
			const supplyDataResult = await nodeType.supplyData.call(context, 0);
			const langchainTool = supplyDataResult.response as Tool | undefined;

			if (!langchainTool || typeof langchainTool.invoke !== 'function') {
				return {
					ok: false,
					error: `Node "${tool.nodeType}" did not return a valid LangChain tool`,
				};
			}

			return { ok: true, value: await onTool(langchainTool) };
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
	 */
	private async invokeSupplyDataTool(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	): Promise<NodeExecutionResult> {
		// The LLM's structured input is the first inputItem's `json` (see
		// node-tool-factory.ts). Pass it straight through to the LangChain tool.
		const toolArgs = (inputItems[0]?.json ?? {}) as Record<string, unknown>;

		const result = await this.withSupplyDataTool(
			tool,
			inputItems,
			async (langchainTool): Promise<unknown> => await langchainTool.invoke(toolArgs),
		);

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
		const result = await this.withSupplyDataTool(tool, [], (langchainTool) => {
			const maybeSchema = (langchainTool as unknown as { schema?: unknown }).schema;
			return maybeSchema ?? null;
		});

		if (!result.ok) {
			this.logger.debug('supplyData tool introspection failed', {
				nodeType: tool.nodeType,
				error: result.error,
			});
			return null;
		}

		return result.value;
	}
}
