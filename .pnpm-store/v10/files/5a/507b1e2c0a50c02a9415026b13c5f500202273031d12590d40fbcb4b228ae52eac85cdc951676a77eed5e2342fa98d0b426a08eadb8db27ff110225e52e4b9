
//#region src/utils/stream.ts
/**
* Parse an SSE event line into key-value pair.
* Format: "field: value" or "field:value" (with optional whitespace after colon)
*
* Uses string operations instead of regex to avoid ReDoS vulnerabilities.
* This is safer and more performant than regex-based parsing.
*/
function parseEventLine(line) {
	const colonIndex = line.indexOf(":");
	if (colonIndex === -1 || colonIndex === 0) return null;
	const key = line.substring(0, colonIndex).trim();
	if (key.length === 0) return null;
	let valueStart = colonIndex + 1;
	while (valueStart < line.length && (line[valueStart] === " " || line[valueStart] === "	" || line[valueStart] === "\r" || line[valueStart] === "\n")) valueStart++;
	return {
		key,
		value: line.substring(valueStart)
	};
}
function complexValue(value) {
	if (value === null || typeof value === "undefined") return;
	else if (typeof value === "object") if (Array.isArray(value)) return { list_val: value.map((avalue) => complexValue(avalue)) };
	else {
		const ret = {};
		const v = value;
		Object.keys(v).forEach((key) => {
			ret[key] = complexValue(v[key]);
		});
		return { struct_val: ret };
	}
	else if (typeof value === "number") if (Number.isInteger(value)) return { int_val: value };
	else return { float_val: value };
	else return { string_val: [value] };
}
function simpleValue(val) {
	if (val && typeof val === "object" && !Array.isArray(val)) if (val.hasOwnProperty("stringVal")) return val.stringVal[0];
	else if (val.hasOwnProperty("boolVal")) return val.boolVal[0];
	else if (val.hasOwnProperty("listVal")) {
		const { listVal } = val;
		return listVal.map((aval) => simpleValue(aval));
	} else if (val.hasOwnProperty("structVal")) {
		const ret = {};
		const struct = val.structVal;
		Object.keys(struct).forEach((key) => {
			ret[key] = simpleValue(struct[key]);
		});
		return ret;
	} else {
		const ret = {};
		const struct = val;
		Object.keys(struct).forEach((key) => {
			ret[key] = simpleValue(struct[key]);
		});
		return ret;
	}
	else if (Array.isArray(val)) return val.map((aval) => simpleValue(aval));
	else return val;
}
var JsonStream = class {
	_buffer = "";
	_bufferOpen = true;
	_firstRun = true;
	/**
	* Add data to the buffer. This may cause chunks to be generated, if available.
	* @param data
	*/
	appendBuffer(data) {
		this._buffer += data;
		if (this._firstRun) {
			this._skipTo("[");
			this._firstRun = false;
		}
		this._parseBuffer();
	}
	/**
	* Indicate there is no more data that will be added to the text buffer.
	* This should be called when all the data has been read and added to indicate
	* that we should process everything remaining in the buffer.
	*/
	closeBuffer() {
		this._bufferOpen = false;
		this._parseBuffer();
	}
	/**
	* Skip characters in the buffer till we get to the start of an object.
	* Then attempt to read a full object.
	* If we do read a full object, turn it into a chunk and send it to the chunk handler.
	* Repeat this for as much as we can.
	*/
	_parseBuffer() {
		let obj = null;
		do {
			this._skipTo("{");
			obj = this._getFullObject();
			if (obj !== null) {
				const chunk = this._simplifyObject(obj);
				this._handleChunk(chunk);
			}
		} while (obj !== null);
		if (!this._bufferOpen) {
			this._handleChunk(null);
			this._buffer = "";
		}
	}
	/**
	* If the string is present, move the start of the buffer to the first occurrence
	* of that string. This is useful for skipping over elements or parts that we're not
	* really interested in parsing. (ie - the opening characters, comma separators, etc.)
	* @param start The string to start the buffer with
	*/
	_skipTo(start) {
		const index = this._buffer.indexOf(start);
		if (index > 0) this._buffer = this._buffer.slice(index);
	}
	/**
	* Given what is in the buffer, parse a single object out of it.
	* If a complete object isn't available, return null.
	* Assumes that we are at the start of an object to parse.
	*/
	_getFullObject() {
		let ret = null;
		let index = 0;
		while (ret === null && this._buffer.length > index) {
			index = this._buffer.indexOf("}", index + 1);
			if (index === -1) return null;
			try {
				const objStr = this._buffer.substring(0, index + 1);
				ret = JSON.parse(objStr);
				this._buffer = this._buffer.slice(index + 1);
			} catch {}
		}
		return ret;
	}
	_simplifyObject(obj) {
		return obj;
	}
	_chunkResolution;
	_chunkPending = null;
	_chunkQueue = [];
	/**
	* Register that we have another chunk available for consumption.
	* If we are waiting for a chunk, resolve the promise waiting for it immediately.
	* If not, then add it to the queue.
	* @param chunk
	*/
	_handleChunk(chunk) {
		if (this._chunkPending) {
			this._chunkResolution(chunk);
			this._chunkPending = null;
		} else this._chunkQueue.push(chunk);
	}
	/**
	* Get the next chunk that is coming from the stream.
	* This chunk may be null, usually indicating the last chunk in the stream.
	*/
	async nextChunk() {
		if (this._chunkQueue.length > 0) return this._chunkQueue.shift();
		else {
			this._chunkPending = new Promise((resolve) => {
				this._chunkResolution = resolve;
			});
			return this._chunkPending;
		}
	}
	/**
	* Is the stream done?
	* A stream is only done if all of the following are true:
	* - There is no more data to be added to the text buffer
	* - There is no more data in the text buffer
	* - There are no chunks that are waiting to be consumed
	*/
	get streamDone() {
		return !this._bufferOpen && this._buffer.length === 0 && this._chunkQueue.length === 0 && this._chunkPending === null;
	}
};
var ComplexJsonStream = class extends JsonStream {
	_simplifyObject(obj) {
		return simpleValue(obj);
	}
};
var ReadableAbstractStream = class {
	baseStream;
	decoder;
	constructor(baseStream, body) {
		this.baseStream = baseStream;
		this.decoder = new TextDecoder("utf-8");
		if (body) this.run(body);
		else console.error("Unexpected empty body while streaming");
	}
	appendBuffer(data) {
		return this.baseStream.appendBuffer(data);
	}
	closeBuffer() {
		return this.baseStream.closeBuffer();
	}
	nextChunk() {
		return this.baseStream.nextChunk();
	}
	get streamDone() {
		return this.baseStream.streamDone;
	}
	async run(body) {
		if (typeof body[Symbol.asyncIterator] === "function") {
			for await (const value of body) {
				const svalue = this.decoder.decode(value, { stream: true });
				this.appendBuffer(svalue);
			}
			this.closeBuffer();
		} else throw Error("Stream must implement async iterator.");
	}
};
var ReadableJsonStream = class extends ReadableAbstractStream {
	constructor(body) {
		super(new JsonStream(), body);
	}
};
var SseStream = class {
	_buffer = "";
	_bufferOpen = true;
	appendBuffer(data) {
		this._buffer += data;
		this._parseBuffer();
	}
	closeBuffer() {
		this._bufferOpen = false;
		this._parseBuffer();
	}
	/**
	* Attempt to load an entire event.
	* For each entire event we load,
	* send them to be handled.
	*/
	_parseBuffer() {
		const events = this._buffer.split(/\n\n/);
		this._buffer = events.pop() ?? "";
		events.forEach((event) => this._handleEvent(event.trim()));
		if (!this._bufferOpen) {
			this._handleEvent(null);
			this._buffer = "";
		}
	}
	/**
	* Given an event string, get all the fields
	* in the event. It is assumed there is one field
	* per line, but that field names can be duplicated,
	* indicating to append the new value to the previous value
	* @param event
	*/
	_parseEvent(event) {
		if (!event || event.trim() === "") return null;
		const ret = {};
		event.split(/\n/).forEach((line) => {
			const parsed = parseEventLine(line);
			if (parsed) {
				const { key, value } = parsed;
				ret[key] = `${ret[key] ?? ""}${value}`;
			}
		});
		return ret;
	}
	_chunkResolution;
	_chunkPending = null;
	_chunkQueue = [];
	_handleEvent(event) {
		const chunk = this._parseEvent(event);
		if (this._chunkPending) {
			this._chunkResolution(chunk);
			this._chunkPending = null;
		} else this._chunkQueue.push(chunk);
	}
	async nextChunk() {
		if (this._chunkQueue.length > 0) return this._chunkQueue.shift();
		else {
			this._chunkPending = new Promise((resolve) => {
				this._chunkResolution = resolve;
			});
			return this._chunkPending;
		}
	}
	get streamDone() {
		return !this._bufferOpen && this._buffer.length === 0 && this._chunkQueue.length === 0 && this._chunkPending === null;
	}
};
var ReadableSseStream = class extends ReadableAbstractStream {
	constructor(body) {
		super(new SseStream(), body);
	}
};
var SseJsonStream = class extends SseStream {
	_jsonAttribute = "data";
	constructor(jsonAttribute) {
		super();
		this._jsonAttribute = jsonAttribute ?? this._jsonAttribute;
	}
	async nextChunk() {
		const json = (await super.nextChunk())?.[this._jsonAttribute];
		if (!json) return null;
		else return JSON.parse(json);
	}
};
var ReadableSseJsonStream = class extends ReadableAbstractStream {
	constructor(body) {
		super(new SseJsonStream(), body);
	}
};

//#endregion
exports.ComplexJsonStream = ComplexJsonStream;
exports.JsonStream = JsonStream;
exports.ReadableAbstractStream = ReadableAbstractStream;
exports.ReadableJsonStream = ReadableJsonStream;
exports.ReadableSseJsonStream = ReadableSseJsonStream;
exports.ReadableSseStream = ReadableSseStream;
exports.SseJsonStream = SseJsonStream;
exports.SseStream = SseStream;
exports.complexValue = complexValue;
exports.simpleValue = simpleValue;
//# sourceMappingURL=stream.cjs.map