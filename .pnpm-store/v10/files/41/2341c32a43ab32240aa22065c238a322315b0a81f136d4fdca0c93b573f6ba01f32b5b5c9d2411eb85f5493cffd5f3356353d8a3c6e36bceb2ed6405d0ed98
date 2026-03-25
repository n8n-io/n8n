import { IterableReadableStream } from "../utils/stream.js";
//#region src/runnables/wrappers.ts
function convertToHttpEventStream(stream) {
	const encoder = new TextEncoder();
	const finalStream = new ReadableStream({ async start(controller) {
		for await (const chunk of stream) controller.enqueue(encoder.encode(`event: data\ndata: ${JSON.stringify(chunk)}\n\n`));
		controller.enqueue(encoder.encode("event: end\n\n"));
		controller.close();
	} });
	return IterableReadableStream.fromReadableStream(finalStream);
}
//#endregion
export { convertToHttpEventStream };

//# sourceMappingURL=wrappers.js.map