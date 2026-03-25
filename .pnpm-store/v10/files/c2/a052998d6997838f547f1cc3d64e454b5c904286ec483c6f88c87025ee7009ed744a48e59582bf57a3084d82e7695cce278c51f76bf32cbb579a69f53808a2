const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_stream = require_rolldown_runtime.__toESM(require("@langchain/core/utils/stream"));

//#region src/utils/event_source_parse.ts
var event_source_parse_exports = {};
require_rolldown_runtime.__export(event_source_parse_exports, {
	EventStreamContentType: () => EventStreamContentType,
	convertEventStreamToIterableReadableDataStream: () => convertEventStreamToIterableReadableDataStream,
	getBytes: () => getBytes,
	getLines: () => getLines,
	getMessages: () => getMessages
});
const EventStreamContentType = "text/event-stream";
function isNodeJSReadable(x) {
	return x != null && typeof x === "object" && "on" in x;
}
/**
* Converts a ReadableStream into a callback pattern.
* @param stream The input ReadableStream.
* @param onChunk A function that will be called on each new byte chunk in the stream.
* @returns {Promise<void>} A promise that will be resolved when the stream closes.
*/
async function getBytes(stream, onChunk) {
	if (isNodeJSReadable(stream)) return new Promise((resolve) => {
		stream.on("readable", () => {
			let chunk;
			while (true) {
				chunk = stream.read();
				if (chunk == null) {
					onChunk(new Uint8Array(), true);
					break;
				}
				onChunk(chunk);
			}
			resolve();
		});
	});
	const reader = stream.getReader();
	while (true) {
		const result = await reader.read();
		if (result.done) {
			onChunk(new Uint8Array(), true);
			break;
		}
		onChunk(result.value);
	}
}
var ControlChars = /* @__PURE__ */ function(ControlChars$1) {
	ControlChars$1[ControlChars$1["NewLine"] = 10] = "NewLine";
	ControlChars$1[ControlChars$1["CarriageReturn"] = 13] = "CarriageReturn";
	ControlChars$1[ControlChars$1["Space"] = 32] = "Space";
	ControlChars$1[ControlChars$1["Colon"] = 58] = "Colon";
	return ControlChars$1;
}(ControlChars || {});
/**
* Parses arbitary byte chunks into EventSource line buffers.
* Each line should be of the format "field: value" and ends with \r, \n, or \r\n.
* @param onLine A function that will be called on each new EventSource line.
* @returns A function that should be called for each incoming byte chunk.
*/
function getLines(onLine) {
	let buffer;
	let position;
	let fieldLength;
	let discardTrailingNewline = false;
	return function onChunk(arr, flush) {
		if (flush) {
			onLine(arr, 0, true);
			return;
		}
		if (buffer === void 0) {
			buffer = arr;
			position = 0;
			fieldLength = -1;
		} else buffer = concat(buffer, arr);
		const bufLength = buffer.length;
		let lineStart = 0;
		while (position < bufLength) {
			if (discardTrailingNewline) {
				if (buffer[position] === ControlChars.NewLine) lineStart = ++position;
				discardTrailingNewline = false;
			}
			let lineEnd = -1;
			for (; position < bufLength && lineEnd === -1; ++position) switch (buffer[position]) {
				case ControlChars.Colon:
					if (fieldLength === -1) fieldLength = position - lineStart;
					break;
				case ControlChars.CarriageReturn: discardTrailingNewline = true;
				case ControlChars.NewLine:
					lineEnd = position;
					break;
			}
			if (lineEnd === -1) break;
			onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
			lineStart = position;
			fieldLength = -1;
		}
		if (lineStart === bufLength) buffer = void 0;
		else if (lineStart !== 0) {
			buffer = buffer.subarray(lineStart);
			position -= lineStart;
		}
	};
}
/**
* Parses line buffers into EventSourceMessages.
* @param onId A function that will be called on each `id` field.
* @param onRetry A function that will be called on each `retry` field.
* @param onMessage A function that will be called on each message.
* @returns A function that should be called for each incoming line buffer.
*/
function getMessages(onMessage, onId, onRetry) {
	let message = newMessage();
	const decoder = new TextDecoder();
	return function onLine(line, fieldLength, flush) {
		if (flush) {
			if (!isEmpty(message)) {
				onMessage?.(message);
				message = newMessage();
			}
			return;
		}
		if (line.length === 0) {
			onMessage?.(message);
			message = newMessage();
		} else if (fieldLength > 0) {
			const field = decoder.decode(line.subarray(0, fieldLength));
			const valueOffset = fieldLength + (line[fieldLength + 1] === ControlChars.Space ? 2 : 1);
			const value = decoder.decode(line.subarray(valueOffset));
			switch (field) {
				case "data":
					message.data = message.data ? message.data + "\n" + value : value;
					break;
				case "event":
					message.event = value;
					break;
				case "id":
					onId?.(message.id = value);
					break;
				case "retry": {
					const retry = parseInt(value, 10);
					if (!Number.isNaN(retry)) onRetry?.(message.retry = retry);
					break;
				}
			}
		}
	};
}
function concat(a, b) {
	const res = new Uint8Array(a.length + b.length);
	res.set(a);
	res.set(b, a.length);
	return res;
}
function newMessage() {
	return {
		data: "",
		event: "",
		id: "",
		retry: void 0
	};
}
function convertEventStreamToIterableReadableDataStream(stream) {
	const dataStream = new ReadableStream({ async start(controller) {
		const enqueueLine = getMessages((msg) => {
			if (msg.data) controller.enqueue(msg.data);
		});
		const onLine = (line, fieldLength, flush) => {
			enqueueLine(line, fieldLength, flush);
			if (flush) controller.close();
		};
		await getBytes(stream, getLines(onLine));
	} });
	return __langchain_core_utils_stream.IterableReadableStream.fromReadableStream(dataStream);
}
function isEmpty(message) {
	return message.data === "" && message.event === "" && message.id === "" && message.retry === void 0;
}

//#endregion
exports.EventStreamContentType = EventStreamContentType;
exports.convertEventStreamToIterableReadableDataStream = convertEventStreamToIterableReadableDataStream;
Object.defineProperty(exports, 'event_source_parse_exports', {
  enumerable: true,
  get: function () {
    return event_source_parse_exports;
  }
});
exports.getBytes = getBytes;
exports.getLines = getLines;
exports.getMessages = getMessages;
//# sourceMappingURL=event_source_parse.cjs.map