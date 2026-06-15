import { DynamicTool } from '@langchain/core/tools';
import type { Tool } from '@langchain/core/tools';
import type { Logger } from 'n8n-workflow';

import type { ToolInvocationRequest, ToolInvocationResponse } from './PendingCallsManager';
import { PendingCallsManager } from './PendingCallsManager';

/**
 * Type definition for the communication function that sends tool invocation requests
 * from workers to the main instance.
 */
export type ToolInvocationSender = (request: ToolInvocationRequest) => Promise<void>;

/**
 * Queued execution strategy for MCP tools in distributed/queue mode.
 *
 * Problem Statement:
 * ==================
 * In Queue Mode, n8n distributes workflow executions across multiple worker processes.
 * When a workflow is queued, its data is serialized to JSON and sent to Redis/Bull queue.
 * However, MCP tools are LangChain Tool objects that:
 * 1. Contain JavaScript function references (invoke, supplyData methods)
 * 2. Cannot be JSON serialized - functions are stripped during serialization
 * 3. Are stored in McpServerManager singleton on the main instance only
 * 4. Are not available on worker processes
 *
 * Solution Approach:
 * ==================
 * This strategy implements a Remote Procedure Call (RPC) pattern:
 *
 * 1. On Worker: Instead of passing actual Tool objects (which can't be serialized),
 *    create proxy Tool objects that intercept invocations
 *
 * 2. Tool Invocation: When a proxy tool is invoked:
 *    a. Create a pending call with PendingCallsManager
 *    b. Send tool invocation request to main instance
 *    c. Wait for response from main instance
 *    d. Return result to caller
 *
 * 3. On Main Instance:
 *    a. Receive tool invocation request
 *    b. Look up actual tool in McpServerManager
 *    c. Execute tool.invoke() with the MCP connection
 *    d. Send result back to worker
 *
 * This maintains queue mode boundaries while enabling MCP tool execution.
 */
export class QueuedExecutionStrategy {
	private readonly pendingCallsManager: PendingCallsManager;
	private readonly logger: Logger;
	private readonly sendToolInvocation: ToolInvocationSender;
	private readonly sessionId?: string;

	/**
	 * @param logger Logger instance
	 * @param sendToolInvocation Function to send tool invocation requests to main instance
	 * @param sessionId Optional MCP session ID
	 * @param timeoutMs Timeout for tool invocations (default 30 seconds)
	 */
	constructor(
		logger: Logger,
		sendToolInvocation: ToolInvocationSender,
		sessionId?: string,
		timeoutMs: number = 30000,
	) {
		this.logger = logger.scoped('queued-execution-strategy');
		this.sendToolInvocation = sendToolInvocation;
		this.sessionId = sessionId;
		this.pendingCallsManager = new PendingCallsManager(logger, timeoutMs);
	}

	/**
	 * Executes a tool by sending an RPC request to the main instance.
	 *
	 * This method should NOT be called directly in queue mode because the Tool
	 * object doesn't exist on the worker. Instead, use prepareTools() to create
	 * proxy tools that handle the RPC mechanism.
	 *
	 * @throws Error if called directly (tools should be invoked via proxies)
	 */
	async executeTool(tool: Tool, args: Record<string, unknown>): Promise<string> {
		throw new Error(
			'executeTool should not be called directly in queue mode. ' +
				'Use prepareTools() to create proxy tools that handle remote execution.',
		);
	}

	/**
	 * Prepares tools for queue mode by creating proxy Tool objects.
	 *
	 * Each proxy tool:
	 * 1. Has the same name and description as the original tool
	 * 2. Intercepts invoke() calls
	 * 3. Sends RPC requests to main instance
	 * 4. Returns results from main instance
	 *
	 * This allows tools to be "serialized" as metadata (name, description)
	 * while the actual execution happens on the main instance.
	 *
	 * @param tools Original MCP tools from main instance
	 * @returns Proxy tools that work in queue mode
	 */
	prepareTools(tools: Tool[]): Tool[] {
		return tools.map((tool) => this.createProxyTool(tool));
	}

	/**
	 * Creates a proxy tool that delegates invocations to the main instance.
	 */
	private createProxyTool(originalTool: Tool): Tool {
		const toolName = originalTool.name;
		const toolDescription = originalTool.description;

		// Create a proxy tool that intercepts invocations
		const proxyTool = new DynamicTool({
			name: toolName,
			description: toolDescription,
			func: async (input: string) => {
				// Parse input (LangChain sometimes passes stringified JSON)
				let args: Record<string, unknown>;
				try {
					args = typeof input === 'string' ? JSON.parse(input) : input;
				} catch {
					args = { input };
				}

				// Create pending call and send request to main instance
				const resultPromise = this.invokeTool(toolName, args);

				// Wait for response from main instance
				return await resultPromise;
			},
		});

		return proxyTool;
	}

	/**
	 * Invokes a tool on the main instance via RPC.
	 *
	 * @param toolName Name of the tool to invoke
	 * @param args Arguments to pass to the tool
	 * @returns Promise that resolves with the tool execution result
	 */
	private async invokeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
		// Create pending call and get both callId and promise
		const { callId, promise } = this.pendingCallsManager.createPendingCall(
			toolName,
			args,
			this.sessionId,
		);

		// Log pending call creation
		const pendingCalls = this.pendingCallsManager.getPendingCallsCount();
		this.logger.debug(
			`Created pending call ${callId} for tool ${toolName} (total pending: ${pendingCalls})`,
		);

		// Prepare invocation request for main instance
		const request: ToolInvocationRequest = {
			callId,
			toolName,
			args,
			sessionId: this.sessionId,
		};

		// Send invocation request to main instance
		try {
			await this.sendToolInvocation(request);
			this.logger.debug(`Sent tool invocation request ${callId} to main instance`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error(`Failed to send tool invocation request ${callId}: ${errorMessage}`);

			// Reject the pending call since we couldn't send the request
			this.pendingCallsManager.rejectCall(
				callId,
				new Error(`Failed to send request: ${errorMessage}`),
			);

			throw new Error(`Failed to send tool invocation request: ${errorMessage}`);
		}

		// Wait for result from main instance
		return await promise;
	}

	/**
	 * Handles a tool invocation response from the main instance.
	 * This should be called when the main instance sends back results.
	 */
	handleResponse(response: ToolInvocationResponse): void {
		this.pendingCallsManager.handleResponse(response);
	}

	/**
	 * Cleans up resources when shutting down.
	 */
	async cleanup(): Promise<void> {
		this.pendingCallsManager.clearAll();
		this.logger.debug('Queued execution strategy cleaned up');
	}

	/**
	 * Gets statistics about pending calls (for monitoring/debugging).
	 */
	getStats() {
		return {
			pendingCalls: this.pendingCallsManager.getPendingCallsCount(),
		};
	}
}
