import { createAgentState } from "./annotation.js";
import { isClientTool, normalizeSystemPrompt, validateLLMHasNoBoundTools, wrapToolCall } from "./utils.js";
import { initializeMiddlewareStates, parseJumpToTarget } from "./nodes/utils.js";
import { AGENT_NODE_NAME, AgentNode } from "./nodes/AgentNode.js";
import { TOOLS_NODE_NAME, ToolNode } from "./nodes/ToolNode.js";
import { getHookConstraint } from "./middleware/utils.js";
import { BeforeAgentNode } from "./nodes/BeforeAgentNode.js";
import { BeforeModelNode } from "./nodes/BeforeModelNode.js";
import { AfterModelNode } from "./nodes/AfterModelNode.js";
import { AfterAgentNode } from "./nodes/AfterAgentNode.js";
import { StateManager } from "./state.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { mergeConfigs } from "@langchain/core/runnables";
import { Command, END, START, Send, StateGraph } from "@langchain/langgraph";

//#region src/agents/ReactAgent.ts
/**
* ReactAgent is a production-ready ReAct (Reasoning + Acting) agent that combines
* language models with tools and middleware.
*
* The agent is parameterized by a single type bag `Types` that encapsulates all
* type information:
*
* @typeParam Types - An {@link AgentTypeConfig} that bundles:
*   - `Response`: The structured response type
*   - `State`: The custom state schema type
*   - `Context`: The context schema type
*   - `Middleware`: The middleware array type
*   - `Tools`: The combined tools type from agent and middleware
*
* @example
* ```typescript
* // Using the type bag pattern
* type MyTypes = AgentTypeConfig<
*   { name: string },  // Response
*   typeof myState,    // State
*   typeof myContext,  // Context
*   typeof middleware, // Middleware
*   typeof tools       // Tools
* >;
*
* const agent: ReactAgent<MyTypes> = createAgent({ ... });
* ```
*/
var ReactAgent = class ReactAgent {
	#graph;
	#toolBehaviorVersion = "v2";
	#agentNode;
	#stateManager = new StateManager();
	#defaultConfig;
	constructor(options, defaultConfig) {
		this.options = options;
		this.#defaultConfig = defaultConfig ?? {};
		if (options.name) this.#defaultConfig = mergeConfigs(this.#defaultConfig, { metadata: { lc_agent_name: options.name } });
		this.#toolBehaviorVersion = options.version ?? this.#toolBehaviorVersion;
		/**
		* validate that model option is provided
		*/
		if (!options.model) throw new Error("`model` option is required to create an agent.");
		/**
		* Check if the LLM already has bound tools and throw if it does.
		*/
		if (typeof options.model !== "string") validateLLMHasNoBoundTools(options.model);
		/**
		* define complete list of tools based on options and middleware
		*/
		const middlewareTools = this.options.middleware?.filter((m) => m.tools).flatMap((m) => m.tools) ?? [];
		const toolClasses = [...options.tools ?? [], ...middlewareTools];
		/**
		* If any of the tools are configured to return_directly after running,
		* our graph needs to check if these were called
		*/
		const shouldReturnDirect = new Set(toolClasses.filter(isClientTool).filter((tool) => "returnDirect" in tool && tool.returnDirect).map((tool) => tool.name));
		/**
		* Create a schema that merges agent base schema with middleware state schemas
		* Using Zod with withLangGraph ensures LangGraph Studio gets proper metadata
		*/
		const { state, input, output } = createAgentState(this.options.responseFormat !== void 0, this.options.stateSchema, this.options.middleware);
		const allNodeWorkflows = new StateGraph(state, {
			input,
			output,
			context: this.options.contextSchema
		});
		const beforeAgentNodes = [];
		const beforeModelNodes = [];
		const afterModelNodes = [];
		const afterAgentNodes = [];
		const wrapModelCallHookMiddleware = [];
		this.#agentNode = new AgentNode({
			model: this.options.model,
			systemMessage: normalizeSystemPrompt(this.options.systemPrompt),
			includeAgentName: this.options.includeAgentName,
			name: this.options.name,
			responseFormat: this.options.responseFormat,
			middleware: this.options.middleware,
			toolClasses,
			shouldReturnDirect,
			signal: this.options.signal,
			wrapModelCallHookMiddleware
		});
		const middlewareNames = /* @__PURE__ */ new Set();
		const middleware = this.options.middleware ?? [];
		for (let i = 0; i < middleware.length; i++) {
			let beforeAgentNode;
			let beforeModelNode;
			let afterModelNode;
			let afterAgentNode;
			const m = middleware[i];
			if (middlewareNames.has(m.name)) throw new Error(`Middleware ${m.name} is defined multiple times`);
			middlewareNames.add(m.name);
			if (m.beforeAgent) {
				beforeAgentNode = new BeforeAgentNode(m, { getState: () => this.#stateManager.getState(m.name) });
				this.#stateManager.addNode(m, beforeAgentNode);
				const name = `${m.name}.before_agent`;
				beforeAgentNodes.push({
					index: i,
					name,
					allowed: getHookConstraint(m.beforeAgent)
				});
				allNodeWorkflows.addNode(name, beforeAgentNode, beforeAgentNode.nodeOptions);
			}
			if (m.beforeModel) {
				beforeModelNode = new BeforeModelNode(m, { getState: () => this.#stateManager.getState(m.name) });
				this.#stateManager.addNode(m, beforeModelNode);
				const name = `${m.name}.before_model`;
				beforeModelNodes.push({
					index: i,
					name,
					allowed: getHookConstraint(m.beforeModel)
				});
				allNodeWorkflows.addNode(name, beforeModelNode, beforeModelNode.nodeOptions);
			}
			if (m.afterModel) {
				afterModelNode = new AfterModelNode(m, { getState: () => this.#stateManager.getState(m.name) });
				this.#stateManager.addNode(m, afterModelNode);
				const name = `${m.name}.after_model`;
				afterModelNodes.push({
					index: i,
					name,
					allowed: getHookConstraint(m.afterModel)
				});
				allNodeWorkflows.addNode(name, afterModelNode, afterModelNode.nodeOptions);
			}
			if (m.afterAgent) {
				afterAgentNode = new AfterAgentNode(m, { getState: () => this.#stateManager.getState(m.name) });
				this.#stateManager.addNode(m, afterAgentNode);
				const name = `${m.name}.after_agent`;
				afterAgentNodes.push({
					index: i,
					name,
					allowed: getHookConstraint(m.afterAgent)
				});
				allNodeWorkflows.addNode(name, afterAgentNode, afterAgentNode.nodeOptions);
			}
			if (m.wrapModelCall) wrapModelCallHookMiddleware.push([m, () => this.#stateManager.getState(m.name)]);
		}
		/**
		* Add Nodes
		*/
		allNodeWorkflows.addNode(AGENT_NODE_NAME, this.#agentNode);
		/**
		* Check if any middleware has wrapToolCall defined.
		* If so, we need to create a ToolNode even without pre-registered tools
		* to allow middleware to handle dynamically registered tools.
		*/
		const hasWrapToolCallMiddleware = middleware.some((m) => m.wrapToolCall);
		const clientTools = toolClasses.filter(isClientTool);
		/**
		* Create ToolNode if we have client-side tools OR if middleware defines wrapToolCall
		* (which may handle dynamically registered tools)
		*/
		if (clientTools.length > 0 || hasWrapToolCallMiddleware) {
			const toolNode = new ToolNode(clientTools, {
				signal: this.options.signal,
				wrapToolCall: wrapToolCall(middleware)
			});
			allNodeWorkflows.addNode(TOOLS_NODE_NAME, toolNode);
		}
		/**
		* Add Edges
		*/
		let entryNode;
		if (beforeAgentNodes.length > 0) entryNode = beforeAgentNodes[0].name;
		else if (beforeModelNodes.length > 0) entryNode = beforeModelNodes[0].name;
		else entryNode = AGENT_NODE_NAME;
		const loopEntryNode = beforeModelNodes.length > 0 ? beforeModelNodes[0].name : AGENT_NODE_NAME;
		const exitNode = afterAgentNodes.length > 0 ? afterAgentNodes[afterAgentNodes.length - 1].name : END;
		allNodeWorkflows.addEdge(START, entryNode);
		/**
		* Determine if we have tools available for routing.
		* This includes both registered client tools AND dynamic tools via middleware.
		*/
		const hasToolsAvailable = clientTools.length > 0 || hasWrapToolCallMiddleware;
		for (let i = 0; i < beforeAgentNodes.length; i++) {
			const node = beforeAgentNodes[i];
			const current = node.name;
			const nextDefault = i === beforeAgentNodes.length - 1 ? loopEntryNode : beforeAgentNodes[i + 1].name;
			if (node.allowed && node.allowed.length > 0) {
				const allowedMapped = node.allowed.map((t) => parseJumpToTarget(t)).filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
				const destinations = Array.from(new Set([nextDefault, ...allowedMapped.map((dest) => dest === END ? exitNode : dest)]));
				allNodeWorkflows.addConditionalEdges(current, this.#createBeforeAgentRouter(clientTools, nextDefault, exitNode, hasToolsAvailable), destinations);
			} else allNodeWorkflows.addEdge(current, nextDefault);
		}
		for (let i = 0; i < beforeModelNodes.length; i++) {
			const node = beforeModelNodes[i];
			const current = node.name;
			const nextDefault = i === beforeModelNodes.length - 1 ? AGENT_NODE_NAME : beforeModelNodes[i + 1].name;
			if (node.allowed && node.allowed.length > 0) {
				const allowedMapped = node.allowed.map((t) => parseJumpToTarget(t)).filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
				const destinations = Array.from(new Set([nextDefault, ...allowedMapped]));
				allNodeWorkflows.addConditionalEdges(current, this.#createBeforeModelRouter(clientTools, nextDefault, hasToolsAvailable), destinations);
			} else allNodeWorkflows.addEdge(current, nextDefault);
		}
		const lastAfterModelNode = afterModelNodes.at(-1);
		if (afterModelNodes.length > 0 && lastAfterModelNode) allNodeWorkflows.addEdge(AGENT_NODE_NAME, lastAfterModelNode.name);
		else {
			const destinations = this.#getModelPaths(clientTools, false, hasToolsAvailable).map((p) => p === END ? exitNode : p);
			if (destinations.length === 1) allNodeWorkflows.addEdge(AGENT_NODE_NAME, destinations[0]);
			else allNodeWorkflows.addConditionalEdges(AGENT_NODE_NAME, this.#createModelRouter(exitNode), destinations);
		}
		for (let i = afterModelNodes.length - 1; i > 0; i--) {
			const node = afterModelNodes[i];
			const current = node.name;
			const nextDefault = afterModelNodes[i - 1].name;
			if (node.allowed && node.allowed.length > 0) {
				const allowedMapped = node.allowed.map((t) => parseJumpToTarget(t)).filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
				const destinations = Array.from(new Set([nextDefault, ...allowedMapped]));
				allNodeWorkflows.addConditionalEdges(current, this.#createAfterModelSequenceRouter(clientTools, node.allowed, nextDefault, hasToolsAvailable), destinations);
			} else allNodeWorkflows.addEdge(current, nextDefault);
		}
		if (afterModelNodes.length > 0) {
			const firstAfterModel = afterModelNodes[0];
			const firstAfterModelNode = firstAfterModel.name;
			const modelPaths = this.#getModelPaths(clientTools, true, hasToolsAvailable).filter((p) => p !== TOOLS_NODE_NAME || hasToolsAvailable);
			const allowJump = Boolean(firstAfterModel.allowed && firstAfterModel.allowed.length > 0);
			const destinations = modelPaths.map((p) => p === END ? exitNode : p);
			allNodeWorkflows.addConditionalEdges(firstAfterModelNode, this.#createAfterModelRouter(clientTools, allowJump, exitNode, hasToolsAvailable), destinations);
		}
		for (let i = afterAgentNodes.length - 1; i > 0; i--) {
			const node = afterAgentNodes[i];
			const current = node.name;
			const nextDefault = afterAgentNodes[i - 1].name;
			if (node.allowed && node.allowed.length > 0) {
				const allowedMapped = node.allowed.map((t) => parseJumpToTarget(t)).filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
				const destinations = Array.from(new Set([nextDefault, ...allowedMapped]));
				allNodeWorkflows.addConditionalEdges(current, this.#createAfterModelSequenceRouter(clientTools, node.allowed, nextDefault, hasToolsAvailable), destinations);
			} else allNodeWorkflows.addEdge(current, nextDefault);
		}
		if (afterAgentNodes.length > 0) {
			const firstAfterAgent = afterAgentNodes[0];
			const firstAfterAgentNode = firstAfterAgent.name;
			if (firstAfterAgent.allowed && firstAfterAgent.allowed.length > 0) {
				const allowedMapped = firstAfterAgent.allowed.map((t) => parseJumpToTarget(t)).filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
				/**
				* For after_agent, only use explicitly allowed destinations (don't add loopEntryNode)
				* The default destination (when no jump occurs) should be END
				*/
				const destinations = Array.from(new Set([END, ...allowedMapped]));
				allNodeWorkflows.addConditionalEdges(firstAfterAgentNode, this.#createAfterModelSequenceRouter(clientTools, firstAfterAgent.allowed, END, hasToolsAvailable), destinations);
			} else allNodeWorkflows.addEdge(firstAfterAgentNode, END);
		}
		/**
		* add edges for tools node (includes both registered tools and dynamic tools via middleware)
		*/
		if (hasToolsAvailable) {
			const toolReturnTarget = loopEntryNode;
			if (shouldReturnDirect.size > 0) allNodeWorkflows.addConditionalEdges(TOOLS_NODE_NAME, this.#createToolsRouter(shouldReturnDirect, exitNode), [toolReturnTarget, exitNode]);
			else allNodeWorkflows.addEdge(TOOLS_NODE_NAME, toolReturnTarget);
		}
		/**
		* compile the graph
		*/
		this.#graph = allNodeWorkflows.compile({
			checkpointer: this.options.checkpointer,
			store: this.options.store,
			name: this.options.name,
			description: this.options.description
		});
	}
	/**
	* Get the compiled {@link https://docs.langchain.com/oss/javascript/langgraph/use-graph-api | StateGraph}.
	*/
	get graph() {
		return this.#graph;
	}
	get checkpointer() {
		return this.#graph.checkpointer;
	}
	set checkpointer(value) {
		this.#graph.checkpointer = value;
	}
	get store() {
		return this.#graph.store;
	}
	set store(value) {
		this.#graph.store = value;
	}
	/**
	* Creates a new ReactAgent with the given config merged into the existing config.
	* Follows the same pattern as LangGraph's Pregel.withConfig().
	*
	* The merged config is applied as a default that gets merged with any config
	* passed at invocation time (invoke/stream). Invocation-time config takes precedence.
	*
	* @param config - Configuration to merge with existing config
	* @returns A new ReactAgent instance with the merged configuration
	*
	* @example
	* ```typescript
	* const agent = createAgent({ model: "gpt-4o", tools: [...] });
	*
	* // Set a default recursion limit
	* const configuredAgent = agent.withConfig({ recursionLimit: 1000 });
	*
	* // Chain multiple configs
	* const debugAgent = agent
	*   .withConfig({ recursionLimit: 1000 })
	*   .withConfig({ tags: ["debug"] });
	* ```
	*/
	withConfig(config) {
		return new ReactAgent(this.options, mergeConfigs(this.#defaultConfig, config));
	}
	/**
	* Get possible edge destinations from model node.
	* @param toolClasses names of tools to call
	* @param includeModelRequest whether to include "model_request" as a valid path (for jumpTo routing)
	* @param hasToolsAvailable whether tools are available (includes dynamic tools via middleware)
	* @returns list of possible edge destinations
	*/
	#getModelPaths(toolClasses, includeModelRequest = false, hasToolsAvailable = toolClasses.length > 0) {
		const paths = [];
		if (hasToolsAvailable) paths.push(TOOLS_NODE_NAME);
		if (includeModelRequest) paths.push(AGENT_NODE_NAME);
		paths.push(END);
		return paths;
	}
	/**
	* Create routing function for tools node conditional edges.
	*/
	#createToolsRouter(shouldReturnDirect, exitNode) {
		return (state) => {
			const messages = state.messages;
			const lastMessage = messages[messages.length - 1];
			if (ToolMessage.isInstance(lastMessage) && lastMessage.name && shouldReturnDirect.has(lastMessage.name)) return this.options.responseFormat ? AGENT_NODE_NAME : exitNode;
			return AGENT_NODE_NAME;
		};
	}
	/**
	* Create routing function for model node conditional edges.
	* @param exitNode - The exit node to route to (could be after_agent or END)
	*/
	#createModelRouter(exitNode = END) {
		/**
		* determine if the agent should continue or not
		*/
		return (state) => {
			const lastMessage = state.messages.at(-1);
			if (!AIMessage.isInstance(lastMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) return exitNode;
			if (lastMessage.tool_calls.every((toolCall) => toolCall.name.startsWith("extract-"))) return exitNode;
			/**
			* The tool node processes a single message.
			*/
			if (this.#toolBehaviorVersion === "v1") return TOOLS_NODE_NAME;
			/**
			* Route to tools node (filter out any structured response tool calls)
			*/
			const regularToolCalls = lastMessage.tool_calls.filter((toolCall) => !toolCall.name.startsWith("extract-"));
			if (regularToolCalls.length === 0) return exitNode;
			return regularToolCalls.map((toolCall) => new Send(TOOLS_NODE_NAME, {
				...state,
				lg_tool_call: toolCall
			}));
		};
	}
	/**
	* Create routing function for jumpTo functionality after afterModel hooks.
	*
	* This router checks if the `jumpTo` property is set in the state after afterModel middleware
	* execution. If set, it routes to the specified target ("model_request" or "tools").
	* If not set, it falls back to the normal model routing logic for afterModel context.
	*
	* The jumpTo property is automatically cleared after use to prevent infinite loops.
	*
	* @param toolClasses - Available tool classes for validation
	* @param allowJump - Whether jumping is allowed
	* @param exitNode - The exit node to route to (could be after_agent or END)
	* @param hasToolsAvailable - Whether tools are available (includes dynamic tools via middleware)
	* @returns Router function that handles jumpTo logic and normal routing
	*/
	#createAfterModelRouter(toolClasses, allowJump, exitNode, hasToolsAvailable = toolClasses.length > 0) {
		const hasStructuredResponse = Boolean(this.options.responseFormat);
		return (state) => {
			const builtInState = state;
			const messages = builtInState.messages;
			const lastMessage = messages.at(-1);
			if (AIMessage.isInstance(lastMessage) && (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)) return exitNode;
			if (allowJump && builtInState.jumpTo) {
				const destination = parseJumpToTarget(builtInState.jumpTo);
				if (destination === END) return exitNode;
				if (destination === TOOLS_NODE_NAME) {
					if (!hasToolsAvailable) return exitNode;
					return new Send(TOOLS_NODE_NAME, {
						...state,
						jumpTo: void 0
					});
				}
				return new Send(AGENT_NODE_NAME, {
					...state,
					jumpTo: void 0
				});
			}
			const toolMessages = messages.filter(ToolMessage.isInstance);
			const lastAiMessage = messages.filter(AIMessage.isInstance).at(-1);
			const pendingToolCalls = lastAiMessage?.tool_calls?.filter((call) => !toolMessages.some((m) => m.tool_call_id === call.id));
			if (pendingToolCalls && pendingToolCalls.length > 0) return pendingToolCalls.map((toolCall) => new Send(TOOLS_NODE_NAME, {
				...state,
				lg_tool_call: toolCall
			}));
			const hasStructuredResponseCalls = lastAiMessage?.tool_calls?.some((toolCall) => toolCall.name.startsWith("extract-"));
			if (pendingToolCalls && pendingToolCalls.length === 0 && !hasStructuredResponseCalls && hasStructuredResponse) return AGENT_NODE_NAME;
			if (!AIMessage.isInstance(lastMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) return exitNode;
			const hasOnlyStructuredResponseCalls = lastMessage.tool_calls.every((toolCall) => toolCall.name.startsWith("extract-"));
			const hasRegularToolCalls = lastMessage.tool_calls.some((toolCall) => !toolCall.name.startsWith("extract-"));
			if (hasOnlyStructuredResponseCalls || !hasRegularToolCalls) return exitNode;
			/**
			* For routing from afterModel nodes, always use simple string paths
			* The Send API is handled at the model_request node level
			*/
			return TOOLS_NODE_NAME;
		};
	}
	/**
	* Router for afterModel sequence nodes (connecting later middlewares to earlier ones),
	* honoring allowed jump targets and defaulting to the next node.
	* @param toolClasses - Available tool classes for validation
	* @param allowed - List of allowed jump targets
	* @param nextDefault - Default node to route to
	* @param hasToolsAvailable - Whether tools are available (includes dynamic tools via middleware)
	*/
	#createAfterModelSequenceRouter(toolClasses, allowed, nextDefault, hasToolsAvailable = toolClasses.length > 0) {
		const allowedSet = new Set(allowed.map((t) => parseJumpToTarget(t)));
		return (state) => {
			const builtInState = state;
			if (builtInState.jumpTo) {
				const dest = parseJumpToTarget(builtInState.jumpTo);
				if (dest === END && allowedSet.has(END)) return END;
				if (dest === TOOLS_NODE_NAME && allowedSet.has(TOOLS_NODE_NAME)) {
					if (!hasToolsAvailable) return END;
					return new Send(TOOLS_NODE_NAME, {
						...state,
						jumpTo: void 0
					});
				}
				if (dest === AGENT_NODE_NAME && allowedSet.has(AGENT_NODE_NAME)) return new Send(AGENT_NODE_NAME, {
					...state,
					jumpTo: void 0
				});
			}
			return nextDefault;
		};
	}
	/**
	* Create routing function for jumpTo functionality after beforeAgent hooks.
	* Falls back to the default next node if no jumpTo is present.
	* When jumping to END, routes to exitNode (which could be an afterAgent node).
	* @param toolClasses - Available tool classes for validation
	* @param nextDefault - Default node to route to
	* @param exitNode - Exit node to route to (could be after_agent or END)
	* @param hasToolsAvailable - Whether tools are available (includes dynamic tools via middleware)
	*/
	#createBeforeAgentRouter(toolClasses, nextDefault, exitNode, hasToolsAvailable = toolClasses.length > 0) {
		return (state) => {
			const builtInState = state;
			if (!builtInState.jumpTo) return nextDefault;
			const destination = parseJumpToTarget(builtInState.jumpTo);
			if (destination === END)
 /**
			* When beforeAgent jumps to END, route to exitNode (first afterAgent node)
			*/
			return exitNode;
			if (destination === TOOLS_NODE_NAME) {
				if (!hasToolsAvailable) return exitNode;
				return new Send(TOOLS_NODE_NAME, {
					...state,
					jumpTo: void 0
				});
			}
			return new Send(AGENT_NODE_NAME, {
				...state,
				jumpTo: void 0
			});
		};
	}
	/**
	* Create routing function for jumpTo functionality after beforeModel hooks.
	* Falls back to the default next node if no jumpTo is present.
	* @param toolClasses - Available tool classes for validation
	* @param nextDefault - Default node to route to
	* @param hasToolsAvailable - Whether tools are available (includes dynamic tools via middleware)
	*/
	#createBeforeModelRouter(toolClasses, nextDefault, hasToolsAvailable = toolClasses.length > 0) {
		return (state) => {
			const builtInState = state;
			if (!builtInState.jumpTo) return nextDefault;
			const destination = parseJumpToTarget(builtInState.jumpTo);
			if (destination === END) return END;
			if (destination === TOOLS_NODE_NAME) {
				if (!hasToolsAvailable) return END;
				return new Send(TOOLS_NODE_NAME, {
					...state,
					jumpTo: void 0
				});
			}
			return new Send(AGENT_NODE_NAME, {
				...state,
				jumpTo: void 0
			});
		};
	}
	/**
	* Initialize middleware states if not already present in the input state.
	*/
	async #initializeMiddlewareStates(state, config) {
		if (!this.options.middleware || this.options.middleware.length === 0 || state instanceof Command || !state) return state;
		const defaultStates = await initializeMiddlewareStates(this.options.middleware, state);
		const updatedState = {
			...(await this.#graph.getState(config).catch(() => ({ values: {} }))).values,
			...state
		};
		if (!updatedState) return updatedState;
		for (const [key, value] of Object.entries(defaultStates)) if (!(key in updatedState)) updatedState[key] = value;
		return updatedState;
	}
	/**
	* Executes the agent with the given state and returns the final state after all processing.
	*
	* This method runs the agent's entire workflow synchronously, including:
	* - Processing the input messages through any configured middleware
	* - Calling the language model to generate responses
	* - Executing any tool calls made by the model
	* - Running all middleware hooks (beforeModel, afterModel, etc.)
	*
	* @param state - The initial state for the agent execution. Can be:
	*   - An object containing `messages` array and any middleware-specific state properties
	*   - A Command object for more advanced control flow
	*
	* @param config - Optional runtime configuration including:
	* @param config.context - The context for the agent execution.
	* @param config.configurable - LangGraph configuration options like `thread_id`, `run_id`, etc.
	* @param config.store - The store for the agent execution for persisting state, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/memory#memory-storage | Memory storage}.
	* @param config.signal - An optional {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal | `AbortSignal`} for the agent execution.
	* @param config.recursionLimit - The recursion limit for the agent execution.
	*
	* @returns A Promise that resolves to the final agent state after execution completes.
	*          The returned state includes:
	*          - a `messages` property containing an array with all messages (input, AI responses, tool calls/results)
	*          - a `structuredResponse` property containing the structured response (if configured)
	*          - all state values defined in the middleware
	*
	* @example
	* ```typescript
	* const agent = new ReactAgent({
	*   llm: myModel,
	*   tools: [calculator, webSearch],
	*   responseFormat: z.object({
	*     weather: z.string(),
	*   }),
	* });
	*
	* const result = await agent.invoke({
	*   messages: [{ role: "human", content: "What's the weather in Paris?" }]
	* });
	*
	* console.log(result.structuredResponse.weather); // outputs: "It's sunny and 75°F."
	* ```
	*/
	async invoke(state, config) {
		const mergedConfig = mergeConfigs(this.#defaultConfig, config);
		const initializedState = await this.#initializeMiddlewareStates(state, mergedConfig);
		return this.#graph.invoke(initializedState, mergedConfig);
	}
	/**
	* Executes the agent with streaming, returning an async iterable of state updates as they occur.
	*
	* This method runs the agent's workflow similar to `invoke`, but instead of waiting for
	* completion, it streams high-level state updates in real-time. This allows you to:
	* - Display intermediate results to users as they're generated
	* - Monitor the agent's progress through each step
	* - React to state changes as nodes complete
	*
	* For more granular event-level streaming (like individual LLM tokens), use `streamEvents` instead.
	*
	* @param state - The initial state for the agent execution. Can be:
	*   - An object containing `messages` array and any middleware-specific state properties
	*   - A Command object for more advanced control flow
	*
	* @param config - Optional runtime configuration including:
	* @param config.context - The context for the agent execution.
	* @param config.configurable - LangGraph configuration options like `thread_id`, `run_id`, etc.
	* @param config.store - The store for the agent execution for persisting state, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/memory#memory-storage | Memory storage}.
	* @param config.signal - An optional {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal | `AbortSignal`} for the agent execution.
	* @param config.streamMode - The streaming mode for the agent execution, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/streaming#supported-stream-modes | Supported stream modes}.
	* @param config.recursionLimit - The recursion limit for the agent execution.
	*
	* @returns A Promise that resolves to an IterableReadableStream of state updates.
	*          Each update contains the current state after a node completes.
	*
	* @example
	* ```typescript
	* const agent = new ReactAgent({
	*   llm: myModel,
	*   tools: [calculator, webSearch]
	* });
	*
	* const stream = await agent.stream({
	*   messages: [{ role: "human", content: "What's 2+2 and the weather in NYC?" }]
	* });
	*
	* for await (const chunk of stream) {
	*   console.log(chunk); // State update from each node
	* }
	* ```
	*/
	async stream(state, config) {
		const mergedConfig = mergeConfigs(this.#defaultConfig, config);
		const initializedState = await this.#initializeMiddlewareStates(state, mergedConfig);
		return this.#graph.stream(initializedState, mergedConfig);
	}
	/**
	* Visualize the graph as a PNG image.
	* @param params - Parameters for the drawMermaidPng method.
	* @param params.withStyles - Whether to include styles in the graph.
	* @param params.curveStyle - The style of the graph's curves.
	* @param params.nodeColors - The colors of the graph's nodes.
	* @param params.wrapLabelNWords - The maximum number of words to wrap in a node's label.
	* @param params.backgroundColor - The background color of the graph.
	* @returns PNG image as a buffer
	*/
	async drawMermaidPng(params) {
		const arrayBuffer = await (await (await this.#graph.getGraphAsync()).drawMermaidPng(params)).arrayBuffer();
		return new Uint8Array(arrayBuffer);
	}
	/**
	* Draw the graph as a Mermaid string.
	* @param params - Parameters for the drawMermaid method.
	* @param params.withStyles - Whether to include styles in the graph.
	* @param params.curveStyle - The style of the graph's curves.
	* @param params.nodeColors - The colors of the graph's nodes.
	* @param params.wrapLabelNWords - The maximum number of words to wrap in a node's label.
	* @param params.backgroundColor - The background color of the graph.
	* @returns Mermaid string
	*/
	async drawMermaid(params) {
		return (await this.#graph.getGraphAsync()).drawMermaid(params);
	}
	/**
	* The following are internal methods to enable support for LangGraph Platform.
	* They are not part of the createAgent public API.
	*
	* Note: we intentionally return as `never` to avoid type errors due to type inference.
	*/
	/**
	* @internal
	*/
	streamEvents(state, config, streamOptions) {
		const mergedConfig = mergeConfigs(this.#defaultConfig, config);
		return this.#graph.streamEvents(state, {
			...mergedConfig,
			version: config?.version ?? "v2"
		}, streamOptions);
	}
	/**
	* @internal
	*/
	getGraphAsync(config) {
		return this.#graph.getGraphAsync(config);
	}
	/**
	* @internal
	*/
	getState(config, options) {
		return this.#graph.getState(config, options);
	}
	/**
	* @internal
	*/
	getStateHistory(config, options) {
		return this.#graph.getStateHistory(config, options);
	}
	/**
	* @internal
	*/
	getSubgraphs(namespace, recurse) {
		return this.#graph.getSubgraphs(namespace, recurse);
	}
	/**
	* @internal
	*/
	getSubgraphAsync(namespace, recurse) {
		return this.#graph.getSubgraphsAsync(namespace, recurse);
	}
	/**
	* @internal
	*/
	updateState(inputConfig, values, asNode) {
		return this.#graph.updateState(inputConfig, values, asNode);
	}
	/**
	* @internal
	*/
	get builder() {
		return this.#graph.builder;
	}
};

//#endregion
export { ReactAgent };
//# sourceMappingURL=ReactAgent.js.map