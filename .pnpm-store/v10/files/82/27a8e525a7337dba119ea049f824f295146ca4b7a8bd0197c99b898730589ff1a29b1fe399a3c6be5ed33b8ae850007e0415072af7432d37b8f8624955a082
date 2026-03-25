// By default, Node.js keeps the subprocess alive while it has a `message` or `disconnect` listener.
// We replicate the same logic for the events that we proxy.
// This ensures the subprocess is kept alive while `getOneMessage()` and `getEachMessage()` are ongoing.
// This is not a problem with `sendMessage()` since Node.js handles that method automatically.
// We do not use `anyProcess.channel.ref()` since this would prevent the automatic `.channel.refCounted()` Node.js is doing.
// We keep a reference to `anyProcess.channel` since it might be `null` while `getOneMessage()` or `getEachMessage()` is still processing debounced messages.
// See https://github.com/nodejs/node/blob/2aaeaa863c35befa2ebaa98fb7737ec84df4d8e9/lib/internal/child_process.js#L547
export const addReference = (channel, reference) => {
	if (reference) {
		addReferenceCount(channel);
	}
};

const addReferenceCount = channel => {
	channel.refCounted();
};

export const removeReference = (channel, reference) => {
	if (reference) {
		removeReferenceCount(channel);
	}
};

const removeReferenceCount = channel => {
	channel.unrefCounted();
};

// To proxy events, we setup some global listeners on the `message` and `disconnect` events.
// Those should not keep the subprocess alive, so we remove the automatic counting that Node.js is doing.
// See https://github.com/nodejs/node/blob/1b965270a9c273d4cf70e8808e9d28b9ada7844f/lib/child_process.js#L180
export const undoAddedReferences = (channel, isSubprocess) => {
	if (isSubprocess) {
		removeReferenceCount(channel);
		removeReferenceCount(channel);
	}
};

// Reverse it during `disconnect`
export const redoAddedReferences = (channel, isSubprocess) => {
	if (isSubprocess) {
		addReferenceCount(channel);
		addReferenceCount(channel);
	}
};
