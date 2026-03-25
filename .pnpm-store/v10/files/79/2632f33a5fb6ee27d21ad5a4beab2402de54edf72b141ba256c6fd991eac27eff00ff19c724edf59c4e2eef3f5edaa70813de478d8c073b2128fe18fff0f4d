const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_middleware = require('../middleware.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/piiRedaction.ts
/**
* Configuration schema for the Input Guardrails middleware
*/
const contextSchema = zod_v3.z.object({ rules: zod_v3.z.record(zod_v3.z.string(), zod_v3.z.instanceof(RegExp).describe("Regular expression pattern to match PII")).optional() });
/**
* Generate a unique ID for a redaction
*/
function generateRedactionId() {
	return Math.random().toString(36).substring(2, 11);
}
/**
* Apply PII detection rules to text with ID tracking
*/
function applyPIIRules(text, rules, redactionMap) {
	let processedText = text;
	for (const [name, pattern] of Object.entries(rules)) {
		const replacement = name.toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "");
		processedText = processedText.replace(pattern, (match) => {
			const id = generateRedactionId();
			redactionMap[id] = match;
			return `[REDACTED_${replacement}_${id}]`;
		});
	}
	return processedText;
}
/**
* Process a single human message for PII detection and redaction
*/
async function processMessage(message, config) {
	/**
	* handle basic message types
	*/
	if (_langchain_core_messages.HumanMessage.isInstance(message) || _langchain_core_messages.ToolMessage.isInstance(message) || _langchain_core_messages.SystemMessage.isInstance(message)) {
		const content = message.content;
		const processedContent = await applyPIIRules(content, config.rules, config.redactionMap);
		if (processedContent !== content) {
			const MessageConstructor = Object.getPrototypeOf(message).constructor;
			return new MessageConstructor({
				...message,
				content: processedContent
			});
		}
		return message;
	}
	/**
	* Handle AI messages
	*/
	if (_langchain_core_messages.AIMessage.isInstance(message)) {
		const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
		const toolCalls = JSON.stringify(message.tool_calls);
		const processedContent = await applyPIIRules(content, config.rules, config.redactionMap);
		const processedToolCalls = await applyPIIRules(toolCalls, config.rules, config.redactionMap);
		if (processedContent !== content || processedToolCalls !== toolCalls) return new _langchain_core_messages.AIMessage({
			...message,
			content: typeof message.content === "string" ? processedContent : JSON.parse(processedContent),
			tool_calls: JSON.parse(processedToolCalls)
		});
		return message;
	}
	throw new Error(`Unsupported message type: ${message.type}`);
}
/**
* Restore original values from redacted text using the redaction map
*/
function restoreRedactedValues(text, redactionMap) {
	let restoredText = text;
	restoredText = restoredText.replace(/\[REDACTED_[A-Z_]+_(\w+)\]/g, (match, id) => {
		if (redactionMap[id]) return redactionMap[id];
		return match;
	});
	return restoredText;
}
/**
* Restore redacted values in a message (creates a new message object)
*/
function restoreMessage(message, redactionMap) {
	/**
	* handle basic message types
	*/
	if (_langchain_core_messages.HumanMessage.isInstance(message) || _langchain_core_messages.ToolMessage.isInstance(message) || _langchain_core_messages.SystemMessage.isInstance(message)) {
		const content = message.content;
		const restoredContent = restoreRedactedValues(content, redactionMap);
		if (restoredContent !== content) {
			const MessageConstructor = Object.getPrototypeOf(message).constructor;
			return {
				message: new MessageConstructor({
					...message,
					content: restoredContent
				}),
				changed: true
			};
		}
		return {
			message,
			changed: false
		};
	}
	/**
	* handle AI messages
	*/
	if (_langchain_core_messages.AIMessage.isInstance(message)) {
		const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
		const toolCalls = JSON.stringify(message.tool_calls);
		const processedContent = restoreRedactedValues(content, redactionMap);
		const processedToolCalls = restoreRedactedValues(toolCalls, redactionMap);
		if (processedContent !== content || processedToolCalls !== toolCalls) return {
			message: new _langchain_core_messages.AIMessage({
				...message,
				content: typeof message.content === "string" ? processedContent : JSON.parse(processedContent),
				tool_calls: JSON.parse(processedToolCalls)
			}),
			changed: true
		};
		return {
			message,
			changed: false
		};
	}
	throw new Error(`Unsupported message type: ${message.type}`);
}
/**
* Creates a middleware that detects and redacts personally identifiable information (PII)
* from messages before they are sent to model providers, and restores original values
* in model responses for tool execution.
*
* ## Mechanism
*
* The middleware intercepts agent execution at two points:
*
* ### Request Phase (`wrapModelCall`)
* - Applies regex-based pattern matching to all message content (HumanMessage, ToolMessage, SystemMessage, AIMessage)
* - Processes both message text and AIMessage tool call arguments
* - Each matched pattern generates:
*   - Unique identifier: `generateRedactionId()` → `"abc123"`
*   - Redaction marker: `[REDACTED_{RULE_NAME}_{ID}]` → `"[REDACTED_SSN_abc123]"`
*   - Redaction map entry: `{ "abc123": "123-45-6789" }`
* - Returns modified request with redacted message content
*
* ### Response Phase (`afterModel`)
* - Scans AIMessage responses for redaction markers matching pattern: `/\[REDACTED_[A-Z_]+_(\w+)\]/g`
* - Replaces markers with original values from redaction map
* - Handles both standard responses and structured output (via tool calls or JSON content)
* - For structured output, restores values in both the tool call arguments and the `structuredResponse` state field
* - Returns new message instances via RemoveMessage/AIMessage to update state
*
* ## Data Flow
*
* ```
* User Input: "My SSN is 123-45-6789"
*     ↓ [beforeModel]
* Model Request: "My SSN is [REDACTED_SSN_abc123]"
*     ↓ [model invocation]
* Model Response: tool_call({ "ssn": "[REDACTED_SSN_abc123]" })
*     ↓ [afterModel]
* Tool Execution: tool({ "ssn": "123-45-6789" })
* ```
*
* ## Limitations
*
* This middleware provides model provider isolation only. PII may still be present in:
* - LangGraph state checkpoints (memory, databases)
* - Network traffic between client and application server
* - Application logs and trace data
* - Tool execution arguments and responses
* - Final agent output
*
* For comprehensive PII protection, implement additional controls at the application,
* network, and storage layers.
*
* @param options - Configuration options
* @param options.rules - Record of detection rules mapping rule names to regex patterns.
*   Rule names are normalized to uppercase and used in redaction markers.
*   Patterns must use the global flag (`/pattern/g`) to match all occurrences.
*
* @returns Middleware instance for use with `createAgent`
*
* @example Basic usage with custom rules
* ```typescript
* import { piiRedactionMiddleware } from "langchain";
* import { createAgent } from "langchain";
* import { tool } from "@langchain/core/tools";
* import { z } from "zod/v3";
*
* const PII_RULES = {
*   ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
*   email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
*   phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
* };
*
* const lookupUser = tool(async ({ ssn }) => {
*   // Receives original value: "123-45-6789"
*   return { name: "John Doe", account: "active" };
* }, {
*   name: "lookup_user",
*   description: "Look up user by SSN",
*   schema: z.object({ ssn: z.string() })
* });
*
* const agent = createAgent({
*   model: new ChatOpenAI({ model: "gpt-4" }),
*   tools: [lookupUser],
*   middleware: [piiRedactionMiddleware({ rules: PII_RULES })]
* });
*
* const result = await agent.invoke({
*   messages: [new HumanMessage("Look up SSN 123-45-6789")]
* });
* // Model request: "Look up SSN [REDACTED_SSN_abc123]"
* // Model response: tool_call({ "ssn": "[REDACTED_SSN_abc123]" })
* // Tool receives: { "ssn": "123-45-6789" }
* ```
*
* @example Runtime rule configuration via context
* ```typescript
* const agent = createAgent({
*   model: new ChatOpenAI({ model: "gpt-4" }),
*   tools: [someTool],
*   middleware: [piiRedactionMiddleware()]
* });
*
* // Configure rules at runtime via middleware context
* const result = await agent.invoke(
*   { messages: [new HumanMessage("...")] },
*   {
*     configurable: {
*       PIIRedactionMiddleware: {
*         rules: {
*           ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
*           email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
*         }
*       }
*     }
*   }
* );
* ```
*
* @example Custom rule patterns
* ```typescript
* const customRules = {
*   employee_id: /EMP-\d{6}/g,
*   api_key: /sk-[a-zA-Z0-9]{32}/g,
*   credit_card: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
* };
*
* const middleware = piiRedactionMiddleware({ rules: customRules });
* // Generates markers like: [REDACTED_EMPLOYEE_ID_xyz789]
* ```
*
* @deprecated
*/
function piiRedactionMiddleware(options = {}) {
	const redactionMap = {};
	console.warn("DEPRECATED: piiRedactionMiddleware is deprecated. Please use piiMiddleware instead, go to https://docs.langchain.com/oss/javascript/langchain/middleware/built-in#pii-detection for more information.");
	return require_middleware.createMiddleware({
		name: "PIIRedactionMiddleware",
		contextSchema,
		wrapModelCall: async (request, handler) => {
			/**
			* Merge options with context, following bigTool.ts pattern
			*/
			const rules = request.runtime.context.rules ?? options.rules ?? {};
			/**
			* If no rules are provided, skip processing
			*/
			if (Object.keys(rules).length === 0) return handler(request);
			const processedMessages = await Promise.all(request.state.messages.map((message) => processMessage(message, {
				rules,
				redactionMap
			})));
			return handler({
				...request,
				messages: processedMessages
			});
		},
		afterModel: async (state) => {
			/**
			* If no redactions were made, skip processing
			*/
			if (Object.keys(redactionMap).length === 0) return;
			const lastMessage = state.messages.at(-1);
			if (!_langchain_core_messages.AIMessage.isInstance(lastMessage)) return;
			/**
			* In cases where we do structured output via tool calls, we also have to look at the second last message
			* as we add a custom last message to the messages array.
			*/
			const secondLastMessage = state.messages.at(-2);
			const { message: restoredLastMessage, changed } = restoreMessage(lastMessage, redactionMap);
			if (!changed) return;
			/**
			* Identify if the last message is a structured response and restore the values if so
			*/
			let structuredResponse;
			if (_langchain_core_messages.AIMessage.isInstance(lastMessage) && lastMessage?.tool_calls?.length === 0 && typeof lastMessage.content === "string" && lastMessage.content.startsWith("{") && lastMessage.content.endsWith("}")) try {
				structuredResponse = JSON.parse(restoreRedactedValues(lastMessage.content, redactionMap));
			} catch {}
			if (_langchain_core_messages.AIMessage.isInstance(secondLastMessage) && secondLastMessage?.tool_calls?.length !== 0 && secondLastMessage?.tool_calls?.some((call) => call.name.startsWith("extract-"))) {
				const { message: restoredSecondLastMessage, changed: changedSecondLastMessage } = restoreMessage(secondLastMessage, redactionMap);
				const structuredResponseRedacted = secondLastMessage.tool_calls?.find((call) => call.name.startsWith("extract-"))?.args;
				const structuredResponse = structuredResponseRedacted ? JSON.parse(restoreRedactedValues(JSON.stringify(structuredResponseRedacted), redactionMap)) : void 0;
				if (changed || changedSecondLastMessage) return {
					...state,
					...structuredResponse ? { structuredResponse } : {},
					messages: [
						new _langchain_core_messages.RemoveMessage({ id: secondLastMessage.id }),
						new _langchain_core_messages.RemoveMessage({ id: lastMessage.id }),
						restoredSecondLastMessage,
						restoredLastMessage
					]
				};
			}
			return {
				...state,
				...structuredResponse ? { structuredResponse } : {},
				messages: [new _langchain_core_messages.RemoveMessage({ id: lastMessage.id }), restoredLastMessage]
			};
		}
	});
}

//#endregion
exports.piiRedactionMiddleware = piiRedactionMiddleware;
//# sourceMappingURL=piiRedaction.cjs.map