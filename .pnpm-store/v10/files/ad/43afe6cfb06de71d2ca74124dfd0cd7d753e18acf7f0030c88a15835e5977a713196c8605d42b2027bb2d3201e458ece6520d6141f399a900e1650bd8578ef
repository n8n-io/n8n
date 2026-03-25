const require_base = require("../messages/base.cjs");
const require_messages_tool = require("../messages/tool.cjs");
const require_ai = require("../messages/ai.cjs");
const require_human = require("../messages/human.cjs");
const require_system = require("../messages/system.cjs");
require("../messages/index.cjs");
//#region src/testing/matchers.ts
function getMessageTypeName(msg) {
	if (!require_base.BaseMessage.isInstance(msg)) return typeof msg;
	return msg.constructor.name || msg.type;
}
function makeMessageTypeMatcher(typeName, isInstance) {
	return function(received, expected) {
		const { isNot, utils } = this;
		if (!isInstance(received)) return {
			pass: false,
			message: () => `${utils.matcherHint(`toBe${typeName}`, void 0, void 0)}\n\nExpected: ${isNot ? "not " : ""}${typeName}\nReceived: ${getMessageTypeName(received)}`,
			actual: getMessageTypeName(received),
			expected: typeName
		};
		if (expected === void 0) return {
			pass: true,
			message: () => `${utils.matcherHint(`toBe${typeName}`, void 0, void 0)}\n\nExpected: not ${typeName}\nReceived: ${typeName}`
		};
		const msg = received;
		if (typeof expected === "string") return {
			pass: msg.content === expected,
			message: () => `${utils.matcherHint(`toBe${typeName}`, void 0, void 0)}\n\nExpected: ${typeName} with content ${utils.printExpected(expected)}\nReceived: ${typeName} with content ${utils.printReceived(msg.content)}`,
			actual: msg.content,
			expected
		};
		return {
			pass: Object.entries(expected).every(([key, value]) => this.equals(msg[key], value)),
			message: () => {
				const receivedFields = {};
				for (const key of Object.keys(expected)) receivedFields[key] = msg[key];
				return `${utils.matcherHint(`toBe${typeName}`, void 0, void 0)}\n\nExpected: ${typeName} matching ${utils.printExpected(expected)}\nReceived: ${typeName} with ${utils.printReceived(receivedFields)}`;
			},
			actual: (() => {
				const receivedFields = {};
				for (const key of Object.keys(expected)) receivedFields[key] = msg[key];
				return receivedFields;
			})(),
			expected
		};
	};
}
const toBeHumanMessage = makeMessageTypeMatcher("HumanMessage", require_human.HumanMessage.isInstance);
const toBeAIMessage = makeMessageTypeMatcher("AIMessage", require_ai.AIMessage.isInstance);
const toBeSystemMessage = makeMessageTypeMatcher("SystemMessage", require_system.SystemMessage.isInstance);
const toBeToolMessage = makeMessageTypeMatcher("ToolMessage", require_messages_tool.ToolMessage.isInstance);
function toHaveToolCalls(received, expected) {
	const { isNot, utils } = this;
	if (!require_ai.AIMessage.isInstance(received)) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolCalls")}\n\nExpected: AIMessage\nReceived: ${getMessageTypeName(received)}`
	};
	const actual = received.tool_calls ?? [];
	if (actual.length !== expected.length) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolCalls")}\n\nExpected ${isNot ? "not " : ""}${expected.length} tool call(s), received ${actual.length}`,
		actual: actual.length,
		expected: expected.length
	};
	const unmatched = expected.filter((exp) => !actual.some((tc) => Object.entries(exp).every(([key, value]) => this.equals(tc[key], value))));
	if (unmatched.length > 0) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolCalls")}\n\nCould not find matching tool call(s) for:\n${utils.printExpected(unmatched)}\nReceived tool calls: ${utils.printReceived(actual.map((tc) => ({
			name: tc.name,
			id: tc.id,
			args: tc.args
		})))}`,
		actual: actual.map((tc) => ({
			name: tc.name,
			id: tc.id,
			args: tc.args
		})),
		expected
	};
	return {
		pass: true,
		message: () => `${utils.matcherHint("toHaveToolCalls")}\n\nExpected AIMessage not to have matching tool calls`
	};
}
function toHaveToolCallCount(received, expected) {
	const { isNot, utils } = this;
	if (!require_ai.AIMessage.isInstance(received)) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolCallCount")}\n\nExpected: AIMessage\nReceived: ${getMessageTypeName(received)}`
	};
	const actual = received.tool_calls?.length ?? 0;
	return {
		pass: actual === expected,
		message: () => `${utils.matcherHint("toHaveToolCallCount")}\n\nExpected ${isNot ? "not " : ""}${expected} tool call(s)\nReceived: ${actual}`,
		actual,
		expected
	};
}
function toContainToolCall(received, expected) {
	const { isNot, utils } = this;
	if (!require_ai.AIMessage.isInstance(received)) return {
		pass: false,
		message: () => `${utils.matcherHint("toContainToolCall")}\n\nExpected: AIMessage\nReceived: ${getMessageTypeName(received)}`
	};
	const actual = received.tool_calls ?? [];
	return {
		pass: actual.some((tc) => Object.entries(expected).every(([key, value]) => this.equals(tc[key], value))),
		message: () => `${utils.matcherHint("toContainToolCall")}\n\nExpected AIMessage ${isNot ? "not " : ""}to contain a tool call matching ${utils.printExpected(expected)}\nReceived tool calls: ${utils.printReceived(actual.map((tc) => ({
			name: tc.name,
			id: tc.id
		})))}`,
		actual: actual.map((tc) => ({
			name: tc.name,
			id: tc.id
		})),
		expected
	};
}
function toHaveToolMessages(received, expected) {
	const { isNot, utils } = this;
	if (!Array.isArray(received)) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolMessages")}\n\nExpected an array of messages\nReceived: ${typeof received}`
	};
	const toolMessages = received.filter(require_messages_tool.ToolMessage.isInstance);
	if (toolMessages.length !== expected.length) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveToolMessages")}\n\nExpected ${isNot ? "not " : ""}${expected.length} tool message(s), found ${toolMessages.length}`,
		actual: toolMessages.length,
		expected: expected.length
	};
	for (let i = 0; i < expected.length; i++) if (!Object.entries(expected[i]).every(([key, value]) => this.equals(toolMessages[i][key], value))) return {
		pass: false,
		message: () => {
			const receivedFields = {};
			for (const key of Object.keys(expected[i])) receivedFields[key] = toolMessages[i][key];
			return `${utils.matcherHint("toHaveToolMessages")}\n\nTool message at index ${i} did not match:\nExpected: ${utils.printExpected(expected[i])}\nReceived: ${utils.printReceived(receivedFields)}`;
		},
		actual: toolMessages[i],
		expected: expected[i]
	};
	return {
		pass: true,
		message: () => `${utils.matcherHint("toHaveToolMessages")}\n\nExpected messages not to contain matching tool messages`
	};
}
function toHaveBeenInterrupted(received, expectedValue) {
	const { isNot, utils } = this;
	const interrupts = received?.__interrupt__;
	if (!(Array.isArray(interrupts) && interrupts.length > 0)) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveBeenInterrupted")}\n\nExpected result ${isNot ? "not " : ""}to have been interrupted\nReceived __interrupt__: ${utils.printReceived(interrupts)}`
	};
	if (expectedValue === void 0) return {
		pass: true,
		message: () => `${utils.matcherHint("toHaveBeenInterrupted")}\n\nExpected result not to have been interrupted\nReceived ${interrupts.length} interrupt(s)`
	};
	const actualValue = interrupts[0]?.value;
	return {
		pass: this.equals(actualValue, expectedValue),
		message: () => `${utils.matcherHint("toHaveBeenInterrupted")}\n\nExpected interrupt value: ${utils.printExpected(expectedValue)}\nReceived interrupt value: ${utils.printReceived(actualValue)}`,
		actual: actualValue,
		expected: expectedValue
	};
}
function toHaveStructuredResponse(received, expected) {
	const { isNot, utils } = this;
	const structuredResponse = received?.structuredResponse;
	if (!(structuredResponse !== void 0)) return {
		pass: false,
		message: () => `${utils.matcherHint("toHaveStructuredResponse")}\n\nExpected result ${isNot ? "not " : ""}to have a structured response\nReceived structuredResponse: undefined`
	};
	if (expected === void 0) return {
		pass: true,
		message: () => `${utils.matcherHint("toHaveStructuredResponse")}\n\nExpected result not to have a structured response`
	};
	return {
		pass: Object.entries(expected).every(([key, value]) => this.equals(structuredResponse[key], value)),
		message: () => `${utils.matcherHint("toHaveStructuredResponse")}\n\nExpected structured response: ${utils.printExpected(expected)}\nReceived structured response: ${utils.printReceived(structuredResponse)}`,
		actual: structuredResponse,
		expected
	};
}
/**
* All matcher functions bundled for convenient use with `expect.extend()`.
*/
const langchainMatchers = {
	toBeHumanMessage,
	toBeAIMessage,
	toBeSystemMessage,
	toBeToolMessage,
	toHaveToolCalls,
	toHaveToolCallCount,
	toContainToolCall,
	toHaveToolMessages,
	toHaveBeenInterrupted,
	toHaveStructuredResponse
};
//#endregion
exports.langchainMatchers = langchainMatchers;
exports.toBeAIMessage = toBeAIMessage;
exports.toBeHumanMessage = toBeHumanMessage;
exports.toBeSystemMessage = toBeSystemMessage;
exports.toBeToolMessage = toBeToolMessage;
exports.toContainToolCall = toContainToolCall;
exports.toHaveBeenInterrupted = toHaveBeenInterrupted;
exports.toHaveStructuredResponse = toHaveStructuredResponse;
exports.toHaveToolCallCount = toHaveToolCallCount;
exports.toHaveToolCalls = toHaveToolCalls;
exports.toHaveToolMessages = toHaveToolMessages;

//# sourceMappingURL=matchers.cjs.map