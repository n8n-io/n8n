
//#region src/utils/sse.ts
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
const NULL = "\0".charCodeAt(0);
const COLON = ":".charCodeAt(0);
const SPACE = " ".charCodeAt(0);
const TRAILING_NEWLINE = [CR, LF];
function BytesLineDecoder() {
	let buffer = [];
	let trailingCr = false;
	return new TransformStream({
		start() {
			buffer = [];
			trailingCr = false;
		},
		transform(chunk, controller) {
			let text = chunk;
			if (trailingCr) {
				text = joinArrays([[CR], text]);
				trailingCr = false;
			}
			if (text.length > 0 && text.at(-1) === CR) {
				trailingCr = true;
				text = text.subarray(0, -1);
			}
			if (!text.length) return;
			const trailingNewline = TRAILING_NEWLINE.includes(text.at(-1));
			const lastIdx = text.length - 1;
			const { lines } = text.reduce((acc, cur, idx) => {
				if (acc.from > idx) return acc;
				if (cur === CR || cur === LF) {
					acc.lines.push(text.subarray(acc.from, idx));
					if (cur === CR && text[idx + 1] === LF) acc.from = idx + 2;
					else acc.from = idx + 1;
				}
				if (idx === lastIdx && acc.from <= lastIdx) acc.lines.push(text.subarray(acc.from));
				return acc;
			}, {
				lines: [],
				from: 0
			});
			if (lines.length === 1 && !trailingNewline) {
				buffer.push(lines[0]);
				return;
			}
			if (buffer.length) {
				buffer.push(lines[0]);
				lines[0] = joinArrays(buffer);
				buffer = [];
			}
			if (!trailingNewline) {
				if (lines.length) buffer = [lines.pop()];
			}
			for (const line of lines) controller.enqueue(line);
		},
		flush(controller) {
			if (buffer.length) controller.enqueue(joinArrays(buffer));
		}
	});
}
function SSEDecoder() {
	let event = "";
	let data = [];
	let lastEventId = "";
	let retry = null;
	const decoder = new TextDecoder();
	return new TransformStream({
		transform(chunk, controller) {
			if (!chunk.length) {
				if (!event && !data.length && !lastEventId && retry == null) return;
				const sse = {
					id: lastEventId || void 0,
					event,
					data: data.length ? decodeArraysToJson(decoder, data) : null
				};
				event = "";
				data = [];
				retry = null;
				controller.enqueue(sse);
				return;
			}
			if (chunk[0] === COLON) return;
			const sepIdx = chunk.indexOf(COLON);
			if (sepIdx === -1) return;
			const fieldName = decoder.decode(chunk.subarray(0, sepIdx));
			let value = chunk.subarray(sepIdx + 1);
			if (value[0] === SPACE) value = value.subarray(1);
			if (fieldName === "event") event = decoder.decode(value);
			else if (fieldName === "data") data.push(value);
			else if (fieldName === "id") {
				if (value.indexOf(NULL) === -1) lastEventId = decoder.decode(value);
			} else if (fieldName === "retry") {
				const retryNum = Number.parseInt(decoder.decode(value), 10);
				if (!Number.isNaN(retryNum)) retry = retryNum;
			}
		},
		flush(controller) {
			if (event) controller.enqueue({
				id: lastEventId || void 0,
				event,
				data: data.length ? decodeArraysToJson(decoder, data) : null
			});
		}
	});
}
function joinArrays(data) {
	const totalLength = data.reduce((acc, curr) => acc + curr.length, 0);
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	for (const c of data) {
		merged.set(c, offset);
		offset += c.length;
	}
	return merged;
}
function decodeArraysToJson(decoder, data) {
	return JSON.parse(decoder.decode(joinArrays(data)));
}

//#endregion
exports.BytesLineDecoder = BytesLineDecoder;
exports.SSEDecoder = SSEDecoder;
//# sourceMappingURL=sse.cjs.map