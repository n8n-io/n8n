import { BytesLineDecoder, SSEDecoder } from "../utils/sse.js";
import { IterableReadableStream } from "../utils/stream.js";
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
		const stream = response.body.pipeThrough(BytesLineDecoder()).pipeThrough(SSEDecoder());
		return IterableReadableStream.fromReadableStream(stream);
	}
};
//#endregion
export { FetchStreamTransport };

//# sourceMappingURL=transport.js.map