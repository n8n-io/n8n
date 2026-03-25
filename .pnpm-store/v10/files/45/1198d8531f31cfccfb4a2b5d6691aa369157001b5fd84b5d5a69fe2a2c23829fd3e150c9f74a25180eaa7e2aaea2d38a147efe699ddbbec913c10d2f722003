import { createMiddleware } from "../middleware.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";
import { interopParse } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/hitl.ts
const DescriptionFunctionSchema = z.function().args(z.custom(), z.custom(), z.custom()).returns(z.union([z.string(), z.promise(z.string())]));
/**
* The type of decision a human can make.
*/
const ALLOWED_DECISIONS = [
	"approve",
	"edit",
	"reject"
];
const DecisionType = z.enum(ALLOWED_DECISIONS);
const InterruptOnConfigSchema = z.object({
	allowedDecisions: z.array(DecisionType),
	description: z.union([z.string(), DescriptionFunctionSchema]).optional(),
	argsSchema: z.record(z.any()).optional()
});
const contextSchema = z.object({
	interruptOn: z.record(z.union([z.boolean(), InterruptOnConfigSchema])).optional(),
	descriptionPrefix: z.string().default("Tool execution requires approval")
});
/**
* Creates a Human-in-the-Loop (HITL) middleware for tool approval and oversight.
*
* This middleware intercepts tool calls made by an AI agent and provides human oversight
* capabilities before execution. It enables selective approval workflows where certain tools
* require human intervention while others can execute automatically.
*
* A invocation result that has been interrupted by the middleware will have a `__interrupt__`
* property that contains the interrupt request.
*
* ```ts
* import { type HITLRequest, type HITLResponse } from "langchain";
* import { type Interrupt } from "langchain";
*
* const result = await agent.invoke(request);
* const interruptRequest = result.__interrupt__?.[0] as Interrupt<HITLRequest>;
*
* // Examine the action requests and review configs
* const actionRequests = interruptRequest.value.actionRequests;
* const reviewConfigs = interruptRequest.value.reviewConfigs;
*
* // Create decisions for each action
* const resume: HITLResponse = {
*   decisions: actionRequests.map((action, i) => {
*     if (action.name === "calculator") {
*       return { type: "approve" };
*     } else if (action.name === "write_file") {
*       return {
*         type: "edit",
*         editedAction: { name: "write_file", args: { filename: "safe.txt", content: "Safe content" } }
*       };
*     }
*     return { type: "reject", message: "Action not allowed" };
*   })
* };
*
* // Resume with decisions
* await agent.invoke(new Command({ resume }), config);
* ```
*
* ## Features
*
* - **Selective Tool Approval**: Configure which tools require human approval
* - **Multiple Decision Types**: Approve, edit, or reject tool calls
* - **Asynchronous Workflow**: Uses LangGraph's interrupt mechanism for non-blocking approval
* - **Custom Approval Messages**: Provide context-specific descriptions for approval requests
*
* ## Decision Types
*
* When a tool requires approval, the human operator can respond with:
* - `approve`: Execute the tool with original arguments
* - `edit`: Modify the tool name and/or arguments before execution
* - `reject`: Provide a manual response instead of executing the tool
*
* @param options - Configuration options for the middleware
* @param options.interruptOn - Per-tool configuration mapping tool names to their settings
* @param options.interruptOn[toolName].allowedDecisions - Array of decision types allowed for this tool (e.g., ["approve", "edit", "reject"])
* @param options.interruptOn[toolName].description - Custom approval message for the tool. Can be either a static string or a callable that dynamically generates the description based on agent state, runtime, and tool call information
* @param options.interruptOn[toolName].argsSchema - JSON schema for the arguments associated with the action, if edits are allowed
* @param options.descriptionPrefix - Default prefix for approval messages (default: "Tool execution requires approval"). Only used for tools that do not define a custom `description` in their InterruptOnConfig.
*
* @returns A middleware instance that can be passed to `createAgent`
*
* @example
* Basic usage with selective tool approval
* ```typescript
* import { humanInTheLoopMiddleware } from "langchain";
* import { createAgent } from "langchain";
*
* const hitlMiddleware = humanInTheLoopMiddleware({
*   interruptOn: {
*     // Interrupt write_file tool and allow edits or approvals
*     "write_file": {
*       allowedDecisions: ["approve", "edit"],
*       description: "⚠️ File write operation requires approval"
*     },
*     // Auto-approve read_file tool
*     "read_file": false
*   }
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4",
*   tools: [writeFileTool, readFileTool],
*   middleware: [hitlMiddleware]
* });
* ```
*
* @example
* Handling approval requests
* ```typescript
* import { type HITLRequest, type HITLResponse, type Interrupt } from "langchain";
* import { Command } from "@langchain/langgraph";
*
* // Initial agent invocation
* const result = await agent.invoke({
*   messages: [new HumanMessage("Write 'Hello' to output.txt")]
* }, config);
*
* // Check if agent is paused for approval
* if (result.__interrupt__) {
*   const interruptRequest = result.__interrupt__?.[0] as Interrupt<HITLRequest>;
*
*   // Show tool call details to user
*   console.log("Actions:", interruptRequest.value.actionRequests);
*   console.log("Review configs:", interruptRequest.value.reviewConfigs);
*
*   // Resume with approval
*   const resume: HITLResponse = {
*     decisions: [{ type: "approve" }]
*   };
*   await agent.invoke(
*     new Command({ resume }),
*     config
*   );
* }
* ```
*
* @example
* Different decision types
* ```typescript
* import { type HITLResponse } from "langchain";
*
* // Approve the tool call as-is
* const resume: HITLResponse = {
*   decisions: [{ type: "approve" }]
* };
*
* // Edit the tool arguments
* const resume: HITLResponse = {
*   decisions: [{
*     type: "edit",
*     editedAction: { name: "write_file", args: { filename: "safe.txt", content: "Modified" } }
*   }]
* };
*
* // Reject with feedback
* const resume: HITLResponse = {
*   decisions: [{
*     type: "reject",
*     message: "File operation not allowed in demo mode"
*   }]
* };
* ```
*
* @example
* Production use case with database operations
* ```typescript
* const hitlMiddleware = humanInTheLoopMiddleware({
*   interruptOn: {
*     "execute_sql": {
*       allowedDecisions: ["approve", "edit", "reject"],
*       description: "🚨 SQL query requires DBA approval\nPlease review for safety and performance"
*     },
*     "read_schema": false,  // Reading metadata is safe
*     "delete_records": {
*       allowedDecisions: ["approve", "reject"],
*       description: "⛔ DESTRUCTIVE OPERATION - Requires manager approval"
*     }
*   },
*   descriptionPrefix: "Database operation pending approval"
* });
* ```
*
* @example
* Using dynamic callable descriptions
* ```typescript
* import { type DescriptionFactory, type ToolCall } from "langchain";
* import type { AgentBuiltInState, Runtime } from "langchain/agents";
*
* // Define a dynamic description factory
* const formatToolDescription: DescriptionFactory = (
*   toolCall: ToolCall,
*   state: AgentBuiltInState,
*   runtime: Runtime<unknown>
* ) => {
*   return `Tool: ${toolCall.name}\nArguments:\n${JSON.stringify(toolCall.args, null, 2)}`;
* };
*
* const hitlMiddleware = humanInTheLoopMiddleware({
*   interruptOn: {
*     "write_file": {
*       allowedDecisions: ["approve", "edit"],
*       // Use dynamic description that can access tool call, state, and runtime
*       description: formatToolDescription
*     },
*     // Or use an inline function
*     "send_email": {
*       allowedDecisions: ["approve", "reject"],
*       description: (toolCall, state, runtime) => {
*         const { to, subject } = toolCall.args;
*         return `Email to ${to}\nSubject: ${subject}\n\nRequires approval before sending`;
*       }
*     }
*   }
* });
* ```
*
* @remarks
* - Tool calls are processed in the order they appear in the AI message
* - Auto-approved tools execute immediately without interruption
* - Multiple tools requiring approval are bundled into a single interrupt request
* - The middleware operates in the `afterModel` phase, intercepting before tool execution
* - Requires a checkpointer to maintain state across interruptions
*
* @see {@link createAgent} for agent creation
* @see {@link Command} for resuming interrupted execution
* @public
*/
function humanInTheLoopMiddleware(options) {
	const createActionAndConfig = async (toolCall, config, state, runtime) => {
		const toolName = toolCall.name;
		const toolArgs = toolCall.args;
		const descriptionValue = config.description;
		let description;
		if (typeof descriptionValue === "function") description = await descriptionValue(toolCall, state, runtime);
		else if (descriptionValue !== void 0) description = descriptionValue;
		else description = `${options.descriptionPrefix ?? "Tool execution requires approval"}\n\nTool: ${toolName}\nArgs: ${JSON.stringify(toolArgs, null, 2)}`;
		/**
		* Create ActionRequest with description
		*/
		const actionRequest = {
			name: toolName,
			args: toolArgs,
			description
		};
		/**
		* Create ReviewConfig
		*/
		const reviewConfig = {
			actionName: toolName,
			allowedDecisions: config.allowedDecisions
		};
		if (config.argsSchema) reviewConfig.argsSchema = config.argsSchema;
		return {
			actionRequest,
			reviewConfig
		};
	};
	const processDecision = (decision, toolCall, config) => {
		const allowedDecisions = config.allowedDecisions;
		if (decision.type === "approve" && allowedDecisions.includes("approve")) return {
			revisedToolCall: toolCall,
			toolMessage: null
		};
		if (decision.type === "edit" && allowedDecisions.includes("edit")) {
			const editedAction = decision.editedAction;
			/**
			* Validate edited action structure
			*/
			if (!editedAction || typeof editedAction.name !== "string") throw new Error(`Invalid edited action for tool "${toolCall.name}": name must be a string`);
			if (!editedAction.args || typeof editedAction.args !== "object") throw new Error(`Invalid edited action for tool "${toolCall.name}": args must be an object`);
			return {
				revisedToolCall: {
					type: "tool_call",
					name: editedAction.name,
					args: editedAction.args,
					id: toolCall.id
				},
				toolMessage: null
			};
		}
		if (decision.type === "reject" && allowedDecisions.includes("reject")) {
			/**
			* Validate that message is a string if provided
			*/
			if (decision.message !== void 0 && typeof decision.message !== "string") throw new Error(`Tool call response for "${toolCall.name}" must be a string, got ${typeof decision.message}`);
			return {
				revisedToolCall: toolCall,
				toolMessage: new ToolMessage({
					content: decision.message ?? `User rejected the tool call for \`${toolCall.name}\` with id ${toolCall.id}`,
					name: toolCall.name,
					tool_call_id: toolCall.id,
					status: "error"
				})
			};
		}
		const msg = `Unexpected human decision: ${JSON.stringify(decision)}. Decision type '${decision.type}' is not allowed for tool '${toolCall.name}'. Expected one of ${JSON.stringify(allowedDecisions)} based on the tool's configuration.`;
		throw new Error(msg);
	};
	return createMiddleware({
		name: "HumanInTheLoopMiddleware",
		contextSchema,
		afterModel: {
			canJumpTo: ["model"],
			hook: async (state, runtime) => {
				const config = interopParse(contextSchema, {
					...options,
					...runtime.context || {}
				});
				if (!config) return;
				const { messages } = state;
				if (!messages.length) return;
				/**
				* Don't do anything if the last message isn't an AI message with tool calls.
				*/
				const lastMessage = [...messages].reverse().find((msg) => AIMessage.isInstance(msg));
				if (!lastMessage || !lastMessage.tool_calls?.length) return;
				/**
				* If the user omits the interruptOn config, we don't do anything.
				*/
				if (!config.interruptOn) return;
				/**
				* Resolve per-tool configs (boolean true -> all decisions allowed; false -> auto-approve)
				*/
				const resolvedConfigs = {};
				for (const [toolName, toolConfig] of Object.entries(config.interruptOn)) if (typeof toolConfig === "boolean") {
					if (toolConfig === true) resolvedConfigs[toolName] = { allowedDecisions: [...ALLOWED_DECISIONS] };
				} else if (toolConfig.allowedDecisions) resolvedConfigs[toolName] = toolConfig;
				const interruptToolCalls = [];
				const autoApprovedToolCalls = [];
				for (const toolCall of lastMessage.tool_calls) if (toolCall.name in resolvedConfigs) interruptToolCalls.push(toolCall);
				else autoApprovedToolCalls.push(toolCall);
				/**
				* No interrupt tool calls, so we can just return.
				*/
				if (!interruptToolCalls.length) return;
				/**
				* Create action requests and review configs for all tools that need approval
				*/
				const actionRequests = [];
				const reviewConfigs = [];
				for (const toolCall of interruptToolCalls) {
					const interruptConfig = resolvedConfigs[toolCall.name];
					/**
					* Create ActionRequest and ReviewConfig using helper method
					*/
					const { actionRequest, reviewConfig } = await createActionAndConfig(toolCall, interruptConfig, state, runtime);
					actionRequests.push(actionRequest);
					reviewConfigs.push(reviewConfig);
				}
				const decisions = (await interrupt({
					actionRequests,
					reviewConfigs
				})).decisions;
				/**
				* Validate that decisions is a valid array before checking length
				*/
				if (!decisions || !Array.isArray(decisions)) throw new Error("Invalid HITLResponse: decisions must be a non-empty array");
				/**
				* Validate that the number of decisions matches the number of interrupt tool calls
				*/
				if (decisions.length !== interruptToolCalls.length) throw new Error(`Number of human decisions (${decisions.length}) does not match number of hanging tool calls (${interruptToolCalls.length}).`);
				const revisedToolCalls = [...autoApprovedToolCalls];
				const artificialToolMessages = [];
				const hasRejectedToolCalls = decisions.some((decision) => decision.type === "reject");
				/**
				* Process each decision using helper method
				*/
				for (let i = 0; i < decisions.length; i++) {
					const decision = decisions[i];
					const toolCall = interruptToolCalls[i];
					const interruptConfig = resolvedConfigs[toolCall.name];
					const { revisedToolCall, toolMessage } = processDecision(decision, toolCall, interruptConfig);
					if (revisedToolCall && (!hasRejectedToolCalls || decision.type === "reject")) revisedToolCalls.push(revisedToolCall);
					if (toolMessage) artificialToolMessages.push(toolMessage);
				}
				/**
				* Update the AI message to only include approved tool calls
				*/
				if (AIMessage.isInstance(lastMessage)) lastMessage.tool_calls = revisedToolCalls;
				const jumpTo = hasRejectedToolCalls ? "model" : void 0;
				return {
					messages: [lastMessage, ...artificialToolMessages],
					jumpTo
				};
			}
		}
	});
}

//#endregion
export { humanInTheLoopMiddleware };
//# sourceMappingURL=hitl.js.map