import { MessageTupleManager, toMessageDict } from "./messages.js";
import { getToolCallsWithResults } from "../utils/tools.js";
//#region src/ui/subagents.ts
/**
* Default tool names that indicate subagent invocation.
* Can be customized via SubagentManager options.
*/
const DEFAULT_SUBAGENT_TOOL_NAMES = ["task"];
/**
* Checks if a namespace indicates a subagent/subgraph message.
*
* Subagent namespaces contain a "tools:" segment indicating they
* originate from a tool call that spawned a subgraph.
*
* @param namespace - The namespace array from stream events (or checkpoint_ns string)
* @returns True if this is a subagent namespace
*/
function isSubagentNamespace(namespace) {
	if (!namespace) return false;
	if (typeof namespace === "string") return namespace.includes("tools:");
	return namespace.some((s) => s.startsWith("tools:"));
}
/**
* Extracts the tool call ID from a namespace path.
*
* Namespaces follow the pattern: ["tools:call_abc123", "model_request:xyz", ...]
* This function extracts "call_abc123" from the first "tools:" segment.
*
* @param namespace - The namespace array from stream events
* @returns The tool call ID, or undefined if not found
*/
function extractToolCallIdFromNamespace(namespace) {
	if (!namespace || namespace.length === 0) return void 0;
	for (const segment of namespace) if (segment.startsWith("tools:")) return segment.slice(6);
}
/**
* Calculates the depth of a subagent based on its namespace.
* Counts the number of "tools:" segments in the namespace.
*
* @param namespace - The namespace array
* @returns The depth (0 for main agent, 1+ for subagents)
*/
function calculateDepthFromNamespace(namespace) {
	if (!namespace) return 0;
	return namespace.filter((s) => s.startsWith("tools:")).length;
}
/**
* Extracts the parent tool call ID from a namespace.
*
* For nested subagents, the namespace looks like:
* ["tools:parent_id", "tools:child_id", ...]
*
* @param namespace - The namespace array
* @returns The parent tool call ID, or null if this is a top-level subagent
*/
function extractParentIdFromNamespace(namespace) {
	if (!namespace || namespace.length < 2) return null;
	const toolSegments = namespace.filter((s) => s.startsWith("tools:"));
	if (toolSegments.length < 2) return null;
	return toolSegments[toolSegments.length - 2]?.slice(6) ?? null;
}
/**
* Manages subagent execution state.
*
* Tracks subagents from the moment they are invoked (AI message with tool calls)
* through streaming to completion (tool message result).
*/
var SubagentManager = class {
	subagents = /* @__PURE__ */ new Map();
	/**
	* Maps namespace IDs (pregel task IDs) to tool call IDs.
	* LangGraph subgraphs use internal pregel task IDs in their namespace,
	* which are different from the tool_call_id used to invoke them.
	*/
	namespaceToToolCallId = /* @__PURE__ */ new Map();
	/**
	* Pending namespace matches that couldn't be resolved immediately.
	* These are retried when new tool calls are registered.
	*/
	pendingMatches = /* @__PURE__ */ new Map();
	/**
	* Message managers for each subagent.
	* Uses the same MessageTupleManager as the main stream for proper
	* message chunk concatenation.
	*/
	messageManagers = /* @__PURE__ */ new Map();
	subagentToolNames;
	onSubagentChange;
	toMessage;
	constructor(options) {
		this.subagentToolNames = new Set(options?.subagentToolNames ?? DEFAULT_SUBAGENT_TOOL_NAMES);
		this.onSubagentChange = options?.onSubagentChange;
		this.toMessage = options?.toMessage ?? toMessageDict;
	}
	/**
	* Get or create a MessageTupleManager for a subagent.
	*/
	getMessageManager(toolCallId) {
		let manager = this.messageManagers.get(toolCallId);
		if (!manager) {
			manager = new MessageTupleManager();
			this.messageManagers.set(toolCallId, manager);
		}
		return manager;
	}
	/**
	* Get messages for a subagent with proper chunk concatenation.
	* This mirrors how the main stream handles messages.
	*/
	getMessagesForSubagent(toolCallId) {
		const manager = this.messageManagers.get(toolCallId);
		if (!manager) return [];
		const messages = [];
		for (const entry of Object.values(manager.chunks)) if (entry.chunk) messages.push(this.toMessage(entry.chunk));
		return messages;
	}
	/**
	* Create a complete SubagentStream object with all derived properties.
	* This ensures consistency with UseStream interface.
	*/
	createSubagentStream(base) {
		const { messages } = base;
		const allToolCalls = getToolCallsWithResults(messages);
		return {
			...base,
			isLoading: base.status === "running",
			toolCalls: allToolCalls,
			getToolCalls: (message) => {
				return allToolCalls.filter((tc) => tc.aiMessage.id === message.id);
			},
			interrupt: void 0,
			interrupts: [],
			switchThread: () => {},
			subagents: /* @__PURE__ */ new Map(),
			activeSubagents: [],
			getSubagent: () => void 0,
			getSubagentsByType: () => [],
			getSubagentsByMessage: () => []
		};
	}
	/**
	* Get the tool call ID for a given namespace ID.
	* Returns the namespace ID itself if no mapping exists.
	*/
	getToolCallIdFromNamespace(namespaceId) {
		return this.namespaceToToolCallId.get(namespaceId) ?? namespaceId;
	}
	/**
	* Try to match a subgraph to a pending subagent by description.
	* Creates a mapping from namespace ID to tool call ID if a match is found.
	*
	* Uses a multi-pass matching strategy:
	* 1. Exact description match
	* 2. Description contains/partial match
	* 3. Any unmapped pending subagent (fallback)
	*
	* @param namespaceId - The namespace ID (pregel task ID) from the subgraph
	* @param description - The description from the subgraph's initial message
	* @returns The matched tool call ID, or undefined if no match
	*/
	matchSubgraphToSubagent(namespaceId, description) {
		if (this.namespaceToToolCallId.has(namespaceId)) return this.namespaceToToolCallId.get(namespaceId);
		const mappedToolCallIds = new Set(this.namespaceToToolCallId.values());
		const establishMapping = (toolCallId) => {
			this.namespaceToToolCallId.set(namespaceId, toolCallId);
			const subagent = this.subagents.get(toolCallId);
			if (subagent && subagent.status === "pending") {
				this.subagents.set(toolCallId, {
					...subagent,
					status: "running",
					namespace: [namespaceId],
					startedAt: /* @__PURE__ */ new Date()
				});
				this.onSubagentChange?.();
			}
			return toolCallId;
		};
		for (const [toolCallId, subagent] of this.subagents) if ((subagent.status === "pending" || subagent.status === "running") && !mappedToolCallIds.has(toolCallId) && subagent.toolCall.args.description === description) return establishMapping(toolCallId);
		for (const [toolCallId, subagent] of this.subagents) if ((subagent.status === "pending" || subagent.status === "running") && !mappedToolCallIds.has(toolCallId)) {
			const subagentDesc = subagent.toolCall.args.description || "";
			if (subagentDesc && description.includes(subagentDesc) || subagentDesc && subagentDesc.includes(description)) {
				if (description.length > subagentDesc.length) this.subagents.set(toolCallId, {
					...subagent,
					toolCall: {
						...subagent.toolCall,
						args: {
							...subagent.toolCall.args,
							description
						}
					}
				});
				return establishMapping(toolCallId);
			}
		}
		if (description) this.pendingMatches.set(namespaceId, description);
	}
	/**
	* Check if a tool call is a subagent invocation.
	*/
	isSubagentToolCall(toolName) {
		return this.subagentToolNames.has(toolName);
	}
	/**
	* Check if a subagent_type value is valid.
	* Valid types are proper identifiers like "weather-scout", "experience-curator".
	*/
	isValidSubagentType(type) {
		if (!type || typeof type !== "string") return false;
		if (type.length < 3) return false;
		if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(type)) return false;
		if (type.length > 50) return false;
		return true;
	}
	/**
	* Check if a subagent should be shown to the user.
	* Subagents are only shown once they've actually started running.
	*
	* This filters out:
	* - Pending subagents that haven't been matched to a namespace yet
	* - Streaming artifacts with partial/corrupted data
	*
	* The idea is: we register subagents internally when we see tool calls,
	* but we only show them to the user once LangGraph confirms they're
	* actually executing (via namespace events).
	*/
	isValidSubagent(subagent) {
		return subagent.status === "running" || subagent.status === "complete";
	}
	/**
	* Build a complete SubagentStream from internal state.
	* Adds messages and derived properties.
	*/
	buildExecution(base) {
		const messages = this.getMessagesForSubagent(base.id);
		return this.createSubagentStream({
			...base,
			messages
		});
	}
	/**
	* Get all subagents as a Map.
	* Filters out incomplete/phantom subagents that lack subagent_type.
	*/
	getSubagents() {
		const result = /* @__PURE__ */ new Map();
		for (const [id, subagent] of this.subagents) if (this.isValidSubagent(subagent)) result.set(id, this.buildExecution(subagent));
		return result;
	}
	/**
	* Get all currently running subagents.
	* Filters out incomplete/phantom subagents.
	*/
	getActiveSubagents() {
		return [...this.subagents.values()].filter((s) => s.status === "running" && this.isValidSubagent(s)).map((s) => this.buildExecution(s));
	}
	/**
	* Get a specific subagent by tool call ID.
	*/
	getSubagent(toolCallId) {
		const subagent = this.subagents.get(toolCallId);
		return subagent ? this.buildExecution(subagent) : void 0;
	}
	/**
	* Get all subagents of a specific type.
	*/
	getSubagentsByType(type) {
		return [...this.subagents.values()].filter((s) => s.toolCall.args.subagent_type === type).map((s) => this.buildExecution(s));
	}
	/**
	* Get all subagents triggered by a specific AI message.
	*
	* @param messageId - The ID of the AI message.
	* @returns Array of subagent streams triggered by that message.
	*/
	getSubagentsByMessage(messageId) {
		return [...this.subagents.values()].filter((s) => s.aiMessageId === messageId && this.isValidSubagent(s)).map((s) => this.buildExecution(s));
	}
	/**
	* Parse tool call args, handling both object and string formats.
	* During streaming, args might come as a string that needs parsing.
	*/
	parseArgs(args) {
		if (!args) return {};
		if (typeof args === "string") try {
			return JSON.parse(args);
		} catch {
			return {};
		}
		return args;
	}
	/**
	* Register new subagent(s) from AI message tool calls.
	*
	* Called when an AI message is received with tool calls.
	* Creates pending subagent entries for each subagent tool call.
	*
	* @param toolCalls - The tool calls from an AI message
	* @param aiMessageId - The ID of the AI message that triggered the tool calls
	*/
	registerFromToolCalls(toolCalls, aiMessageId) {
		let hasChanges = false;
		for (const toolCall of toolCalls) {
			if (!toolCall.id) continue;
			if (!this.isSubagentToolCall(toolCall.name)) continue;
			const parsedArgs = this.parseArgs(toolCall.args);
			const hasValidType = this.isValidSubagentType(parsedArgs.subagent_type);
			const existing = this.subagents.get(toolCall.id);
			if (existing) {
				const newType = parsedArgs.subagent_type || "";
				const oldType = existing.toolCall.args.subagent_type || "";
				const newDesc = parsedArgs.description || "";
				const oldDesc = existing.toolCall.args.description || "";
				const shouldUpdateType = this.isValidSubagentType(newType) && newType.length > oldType.length;
				const shouldUpdateDesc = newDesc.length > oldDesc.length;
				if (shouldUpdateType || shouldUpdateDesc) {
					this.subagents.set(toolCall.id, {
						...existing,
						toolCall: {
							...existing.toolCall,
							args: {
								...existing.toolCall.args,
								...parsedArgs,
								description: shouldUpdateDesc ? newDesc : oldDesc,
								subagent_type: shouldUpdateType ? newType : oldType
							}
						}
					});
					hasChanges = true;
				}
				continue;
			}
			if (!hasValidType) continue;
			const subagentToolCall = {
				id: toolCall.id,
				name: toolCall.name,
				args: {
					description: parsedArgs.description,
					subagent_type: parsedArgs.subagent_type,
					...parsedArgs
				}
			};
			const execution = {
				id: toolCall.id,
				toolCall: subagentToolCall,
				status: "pending",
				values: {},
				result: null,
				error: null,
				namespace: [],
				messages: [],
				aiMessageId: aiMessageId ?? null,
				parentId: null,
				depth: 0,
				startedAt: null,
				completedAt: null
			};
			this.subagents.set(toolCall.id, execution);
			this.getMessageManager(toolCall.id);
			hasChanges = true;
		}
		if (hasChanges) {
			this.retryPendingMatches();
			this.onSubagentChange?.();
		}
	}
	/**
	* Retry matching pending namespaces to newly registered tool calls.
	*/
	retryPendingMatches() {
		if (this.pendingMatches.size === 0) return;
		for (const [namespaceId, description] of this.pendingMatches) {
			if (this.namespaceToToolCallId.has(namespaceId)) {
				this.pendingMatches.delete(namespaceId);
				continue;
			}
			if (this.matchSubgraphToSubagent(namespaceId, description)) this.pendingMatches.delete(namespaceId);
		}
	}
	/**
	* Mark a subagent as running and update its namespace.
	*
	* Called when update events are received with a namespace indicating
	* which subagent is streaming.
	*
	* @param toolCallId - The tool call ID of the subagent
	* @param options - Additional update options
	*/
	markRunning(toolCallId, options) {
		const existing = this.subagents.get(toolCallId);
		if (!existing) return;
		const namespace = options?.namespace ?? existing.namespace;
		this.subagents.set(toolCallId, {
			...existing,
			status: "running",
			namespace,
			parentId: existing.parentId ?? extractParentIdFromNamespace(namespace) ?? null,
			depth: existing.depth || calculateDepthFromNamespace(namespace),
			startedAt: existing.startedAt ?? /* @__PURE__ */ new Date()
		});
		this.onSubagentChange?.();
	}
	/**
	* Mark a subagent as running using a namespace ID.
	* Resolves the namespace ID to the actual tool call ID via the mapping.
	*
	* @param namespaceId - The namespace ID (pregel task ID) from the subgraph
	* @param namespace - The full namespace array
	*/
	markRunningFromNamespace(namespaceId, namespace) {
		const toolCallId = this.getToolCallIdFromNamespace(namespaceId);
		this.markRunning(toolCallId, { namespace });
	}
	/**
	* Add a serialized message to a subagent from stream events.
	*
	* This method handles the raw serialized message data from SSE events.
	* Uses MessageTupleManager for proper chunk concatenation, matching
	* how the main stream handles messages.
	*
	* @param namespaceId - The namespace ID (pregel task ID) from the stream
	* @param serialized - The serialized message from the stream
	* @param metadata - Optional metadata from the stream event
	*/
	addMessageToSubagent(namespaceId, serialized, metadata) {
		if (serialized.type === "human" && typeof serialized.content === "string") this.matchSubgraphToSubagent(namespaceId, serialized.content);
		const toolCallId = this.getToolCallIdFromNamespace(namespaceId);
		const existing = this.subagents.get(toolCallId);
		if (!existing) return;
		if (this.getMessageManager(toolCallId).add(serialized, metadata)) if (serialized.type === "ai") this.subagents.set(toolCallId, {
			...existing,
			status: "running",
			startedAt: existing.startedAt ?? /* @__PURE__ */ new Date(),
			messages: this.getMessagesForSubagent(toolCallId)
		});
		else this.subagents.set(toolCallId, {
			...existing,
			messages: this.getMessagesForSubagent(toolCallId)
		});
		this.onSubagentChange?.();
	}
	/**
	* Update subagent values from a values stream event.
	*
	* Called when a values event is received from a subagent's namespace.
	* This populates the subagent's state values, making them accessible
	* via the `values` property.
	*
	* @param namespaceId - The namespace ID (pregel task ID) from the stream
	* @param values - The state values from the stream event
	*/
	updateSubagentValues(namespaceId, values) {
		const toolCallId = this.getToolCallIdFromNamespace(namespaceId);
		const existing = this.subagents.get(toolCallId);
		if (!existing) return;
		this.subagents.set(toolCallId, {
			...existing,
			values,
			status: existing.status === "pending" ? "running" : existing.status,
			startedAt: existing.startedAt ?? /* @__PURE__ */ new Date()
		});
		this.onSubagentChange?.();
	}
	/**
	* Complete a subagent with a result.
	*
	* Called when a tool message is received for the subagent.
	*
	* @param toolCallId - The tool call ID of the subagent
	* @param result - The result content
	* @param status - The final status (complete or error)
	*/
	complete(toolCallId, result, status = "complete") {
		const existing = this.subagents.get(toolCallId);
		if (!existing) return;
		this.subagents.set(toolCallId, {
			...existing,
			status,
			result: status === "complete" ? result : null,
			error: status === "error" ? result : null,
			completedAt: /* @__PURE__ */ new Date()
		});
		this.onSubagentChange?.();
	}
	/**
	* Clear all subagent state.
	*/
	clear() {
		this.subagents.clear();
		this.namespaceToToolCallId.clear();
		this.messageManagers.clear();
		this.pendingMatches.clear();
		this.onSubagentChange?.();
	}
	/**
	* Process a tool message to complete a subagent.
	*
	* @param toolCallId - The tool call ID from the tool message
	* @param content - The result content
	* @param status - Whether the tool execution was successful
	*/
	processToolMessage(toolCallId, content, status = "success") {
		if (!this.subagents.get(toolCallId)) return;
		this.complete(toolCallId, content, status === "success" ? "complete" : "error");
	}
	/**
	* Reconstruct subagent state from historical messages.
	*
	* This method parses an array of messages (typically from thread history)
	* to identify subagent executions and their results. It's used to restore
	* subagent state after:
	* - Page refresh (when stream has already completed)
	* - Loading thread history
	* - Navigating between threads
	*
	* The reconstruction process:
	* 1. Find AI messages with tool calls matching subagent tool names
	* 2. Find corresponding tool messages with results
	* 3. Create SubagentStream entries with "complete" status
	*
	* Note: Internal subagent messages (their streaming conversation) are not
	* reconstructed since they are not persisted in the main thread state.
	*
	* @param messages - Array of messages from thread history
	* @param options - Optional configuration
	* @param options.skipIfPopulated - If true, skip reconstruction if subagents already exist
	*/
	reconstructFromMessages(messages, options) {
		if (options?.skipIfPopulated && this.subagents.size > 0) return;
		const toolResults = /* @__PURE__ */ new Map();
		for (const message of messages) if (message.type === "tool" && "tool_call_id" in message) {
			const toolCallId = message.tool_call_id;
			const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
			const status = "status" in message && message.status === "error" ? "error" : "success";
			toolResults.set(toolCallId, {
				content,
				status
			});
		}
		let hasChanges = false;
		for (const message of messages) {
			if (message.type !== "ai" || !("tool_calls" in message) || !Array.isArray(message.tool_calls)) continue;
			for (const toolCall of message.tool_calls) {
				if (!toolCall.id) continue;
				if (!this.isSubagentToolCall(toolCall.name)) continue;
				if (this.subagents.has(toolCall.id)) continue;
				const parsedArgs = this.parseArgs(toolCall.args);
				if (!this.isValidSubagentType(parsedArgs.subagent_type)) continue;
				const subagentToolCall = {
					id: toolCall.id,
					name: toolCall.name,
					args: {
						description: parsedArgs.description,
						subagent_type: parsedArgs.subagent_type,
						...parsedArgs
					}
				};
				const toolResult = toolResults.get(toolCall.id);
				const isComplete = !!toolResult;
				const status = isComplete ? toolResult.status === "error" ? "error" : "complete" : "running";
				const execution = {
					id: toolCall.id,
					toolCall: subagentToolCall,
					status,
					values: {},
					result: isComplete && status === "complete" ? toolResult.content : null,
					error: isComplete && status === "error" ? toolResult.content : null,
					namespace: [],
					messages: [],
					aiMessageId: message.id ?? null,
					parentId: null,
					depth: 0,
					startedAt: null,
					completedAt: isComplete ? /* @__PURE__ */ new Date() : null
				};
				this.subagents.set(toolCall.id, execution);
				hasChanges = true;
			}
		}
		if (hasChanges) this.onSubagentChange?.();
	}
	/**
	* Check if any subagents are currently tracked.
	*/
	hasSubagents() {
		return this.subagents.size > 0;
	}
};
//#endregion
export { SubagentManager, calculateDepthFromNamespace, extractParentIdFromNamespace, extractToolCallIdFromNamespace, isSubagentNamespace };

//# sourceMappingURL=subagents.js.map