const require_utils_stream = require("../utils/stream.cjs");
//#region src/runnables/wrappers.ts
function convertToHttpEventStream(stream) {
	const encoder = new TextEncoder();
	const finalStream = new ReadableStream({ async start(controller) {
		for await (const chunk of stream) controller.enqueue(encoder.encode(`event: data\ndata: ${JSON.stringify(chunk)}\n\n`));
		controller.enqueue(encoder.encode("event: end\n\n"));
		controller.close();
	} });
	return require_utils_stream.IterableReadableStream.fromReadableStream(finalStream);
}
//#endregion
exports.convertToHttpEventStream = convertToHttpEventStream;

//# sourceMappingURL=wrappers.cjs.map