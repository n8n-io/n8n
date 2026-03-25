const require_sse = require("../utils/sse.cjs");
const require_stream = require("../utils/stream.cjs");
//#region src/ui/transport.ts
var FetchStreamTransport = class {
	constructor(options) {
		this.options = options;
	}
	async stream(payload) {
		const { signal, ...body } = payload;
		let requestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.options.defaultHeaders
			},
			body: JSON.stringify(body),
			signal
		};
		if (this.options.onRequest) requestInit = await this.options.onRequest(this.options.apiUrl, requestInit);
		const response = await (this.options.fetch ?? fetch)(this.options.apiUrl, requestInit);
		if (!response.ok) throw new Error(`Failed to stream: ${response.statusText}`);
		if (!response.body) throw new Error("Expected response body from stream endpoint");
		const stream = response.body.pipeThrough(require_sse.BytesLineDecoder()).pipeThrough(require_sse.SSEDecoder());
		return require_stream.IterableReadableStream.fromReadableStream(stream);
	}
};
//#endregion
exports.FetchStreamTransport = FetchStreamTransport;

//# sourceMappingURL=transport.cjs.map