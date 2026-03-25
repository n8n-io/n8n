import { INTERRUPT } from "../constants.js";
import { PregelNode } from "./read.js";

//#region src/pregel/validate.ts
var GraphValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "GraphValidationError";
	}
};
function validateGraph({ nodes, channels, inputChannels, outputChannels, streamChannels, interruptAfterNodes, interruptBeforeNodes }) {
	if (!channels) throw new GraphValidationError("Channels not provided");
	const subscribedChannels = /* @__PURE__ */ new Set();
	const allOutputChannels = /* @__PURE__ */ new Set();
	for (const [name, node] of Object.entries(nodes)) {
		if (name === INTERRUPT) throw new GraphValidationError(`"Node name ${INTERRUPT} is reserved"`);
		if (node.constructor === PregelNode) node.triggers.forEach((trigger) => subscribedChannels.add(trigger));
		else throw new GraphValidationError(`Invalid node type ${typeof node}, expected PregelNode`);
	}
	for (const chan of subscribedChannels) if (!(chan in channels)) throw new GraphValidationError(`Subscribed channel '${String(chan)}' not in channels`);
	if (!Array.isArray(inputChannels)) {
		if (!subscribedChannels.has(inputChannels)) throw new GraphValidationError(`Input channel ${String(inputChannels)} is not subscribed to by any node`);
	} else if (inputChannels.every((channel) => !subscribedChannels.has(channel))) throw new GraphValidationError(`None of the input channels ${inputChannels} are subscribed to by any node`);
	if (!Array.isArray(outputChannels)) allOutputChannels.add(outputChannels);
	else outputChannels.forEach((chan) => allOutputChannels.add(chan));
	if (streamChannels && !Array.isArray(streamChannels)) allOutputChannels.add(streamChannels);
	else if (Array.isArray(streamChannels)) streamChannels.forEach((chan) => allOutputChannels.add(chan));
	for (const chan of allOutputChannels) if (!(chan in channels)) throw new GraphValidationError(`Output channel '${String(chan)}' not in channels`);
	if (interruptAfterNodes && interruptAfterNodes !== "*") {
		for (const node of interruptAfterNodes) if (!(node in nodes)) throw new GraphValidationError(`Node ${String(node)} not in nodes`);
	}
	if (interruptBeforeNodes && interruptBeforeNodes !== "*") {
		for (const node of interruptBeforeNodes) if (!(node in nodes)) throw new GraphValidationError(`Node ${String(node)} not in nodes`);
	}
}
function validateKeys(keys, channels) {
	if (Array.isArray(keys)) {
		for (const key of keys) if (!(key in channels)) throw new Error(`Key ${String(key)} not found in channels`);
	} else if (!(keys in channels)) throw new Error(`Key ${String(keys)} not found in channels`);
}

//#endregion
export { validateGraph, validateKeys };
//# sourceMappingURL=validate.js.map