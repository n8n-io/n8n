
//#region src/errors.ts
/** @category Errors */
var BaseLangGraphError = class extends Error {
	lc_error_code;
	constructor(message, fields) {
		let finalMessage = message ?? "";
		if (fields?.lc_error_code) finalMessage = `${finalMessage}\n\nTroubleshooting URL: https://docs.langchain.com/oss/javascript/langgraph/${fields.lc_error_code}/\n`;
		super(finalMessage);
		this.lc_error_code = fields?.lc_error_code;
	}
};
var GraphBubbleUp = class extends BaseLangGraphError {
	get is_bubble_up() {
		return true;
	}
};
var GraphRecursionError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "GraphRecursionError";
	}
	static get unminifiable_name() {
		return "GraphRecursionError";
	}
};
var GraphValueError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "GraphValueError";
	}
	static get unminifiable_name() {
		return "GraphValueError";
	}
};
var GraphInterrupt = class extends GraphBubbleUp {
	interrupts;
	constructor(interrupts, fields) {
		super(JSON.stringify(interrupts, null, 2), fields);
		this.name = "GraphInterrupt";
		this.interrupts = interrupts ?? [];
	}
	static get unminifiable_name() {
		return "GraphInterrupt";
	}
};
/** Raised by a node to interrupt execution. */
var NodeInterrupt = class extends GraphInterrupt {
	constructor(message, fields) {
		super([{ value: message }], fields);
		this.name = "NodeInterrupt";
	}
	static get unminifiable_name() {
		return "NodeInterrupt";
	}
};
var ParentCommand = class extends GraphBubbleUp {
	command;
	constructor(command) {
		super();
		this.name = "ParentCommand";
		this.command = command;
	}
	static get unminifiable_name() {
		return "ParentCommand";
	}
};
function isParentCommand(e) {
	return e !== void 0 && e.name === ParentCommand.unminifiable_name;
}
function isGraphBubbleUp(e) {
	return e !== void 0 && e.is_bubble_up === true;
}
function isGraphInterrupt(e) {
	return e !== void 0 && [GraphInterrupt.unminifiable_name, NodeInterrupt.unminifiable_name].includes(e.name);
}
var EmptyInputError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "EmptyInputError";
	}
	static get unminifiable_name() {
		return "EmptyInputError";
	}
};
var EmptyChannelError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "EmptyChannelError";
	}
	static get unminifiable_name() {
		return "EmptyChannelError";
	}
};
var InvalidUpdateError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "InvalidUpdateError";
	}
	static get unminifiable_name() {
		return "InvalidUpdateError";
	}
};
/**
* @deprecated This exception type is no longer thrown.
*/
var MultipleSubgraphsError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "MultipleSubgraphError";
	}
	static get unminifiable_name() {
		return "MultipleSubgraphError";
	}
};
var UnreachableNodeError = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "UnreachableNodeError";
	}
	static get unminifiable_name() {
		return "UnreachableNodeError";
	}
};
/**
* Exception raised when an error occurs in the remote graph.
*/
var RemoteException = class extends BaseLangGraphError {
	constructor(message, fields) {
		super(message, fields);
		this.name = "RemoteException";
	}
	static get unminifiable_name() {
		return "RemoteException";
	}
};
/**
* Error thrown when invalid input is provided to a StateGraph.
*
* This typically means that the input to the StateGraph constructor or builder
* did not match the required types. A valid input should be a
* StateDefinition, an Annotation.Root, or a Zod schema.
*
* @example
* // Example of incorrect usage:
* try {
*   new StateGraph({ foo: "bar" }); // Not a valid input
* } catch (err) {
*   if (err instanceof StateGraphInputError) {
*     console.error(err.message);
*   }
* }
*/
var StateGraphInputError = class extends BaseLangGraphError {
	/**
	* Create a new StateGraphInputError.
	* @param message - Optional custom error message.
	* @param fields - Optional additional error fields.
	*/
	constructor(message, fields) {
		super(message, fields);
		this.name = "StateGraphInputError";
		this.message = "Invalid StateGraph input. Make sure to pass a valid StateDefinition, Annotation.Root, or Zod schema.";
	}
	/**
	* The unminifiable (static, human-readable) error name for this error class.
	*/
	static get unminifiable_name() {
		return "StateGraphInputError";
	}
};
/**
* Used for subgraph detection.
*/
const getSubgraphsSeenSet = () => {
	if (globalThis[Symbol.for("LG_CHECKPOINT_SEEN_NS_SET")] === void 0) globalThis[Symbol.for("LG_CHECKPOINT_SEEN_NS_SET")] = /* @__PURE__ */ new Set();
	return globalThis[Symbol.for("LG_CHECKPOINT_SEEN_NS_SET")];
};

//#endregion
exports.BaseLangGraphError = BaseLangGraphError;
exports.EmptyChannelError = EmptyChannelError;
exports.EmptyInputError = EmptyInputError;
exports.GraphBubbleUp = GraphBubbleUp;
exports.GraphInterrupt = GraphInterrupt;
exports.GraphRecursionError = GraphRecursionError;
exports.GraphValueError = GraphValueError;
exports.InvalidUpdateError = InvalidUpdateError;
exports.MultipleSubgraphsError = MultipleSubgraphsError;
exports.NodeInterrupt = NodeInterrupt;
exports.ParentCommand = ParentCommand;
exports.RemoteException = RemoteException;
exports.StateGraphInputError = StateGraphInputError;
exports.UnreachableNodeError = UnreachableNodeError;
exports.getSubgraphsSeenSet = getSubgraphsSeenSet;
exports.isGraphBubbleUp = isGraphBubbleUp;
exports.isGraphInterrupt = isGraphInterrupt;
exports.isParentCommand = isParentCommand;
//# sourceMappingURL=errors.cjs.map