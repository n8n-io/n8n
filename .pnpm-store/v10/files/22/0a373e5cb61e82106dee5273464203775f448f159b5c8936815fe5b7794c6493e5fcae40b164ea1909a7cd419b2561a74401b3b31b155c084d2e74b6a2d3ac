//#region src/utils/iflytek_websocket_stream.ts
/**
* [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) with [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
*
* @see https://web.dev/websocketstream/
*/
var BaseWebSocketStream = class {
	url;
	connection;
	closed;
	close;
	constructor(url, options = {}) {
		if (options.signal?.aborted) throw new DOMException("This operation was aborted", "AbortError");
		this.url = url;
		const ws = this.openWebSocket(url, options);
		const closeWithInfo = ({ code, reason } = {}) => ws.close(code, reason);
		this.connection = new Promise((resolve, reject) => {
			ws.onopen = () => {
				resolve({
					readable: new ReadableStream({
						start(controller) {
							ws.onmessage = ({ data }) => controller.enqueue(data);
							ws.onerror = (e) => controller.error(e);
						},
						cancel: closeWithInfo
					}),
					writable: new WritableStream({
						write(chunk) {
							ws.send(chunk);
						},
						abort() {
							ws.close();
						},
						close: closeWithInfo
					}),
					protocol: ws.protocol,
					extensions: ws.extensions
				});
				ws.removeEventListener("error", reject);
			};
			ws.addEventListener("error", reject);
		});
		this.closed = new Promise((resolve, reject) => {
			ws.onclose = ({ code, reason }) => {
				resolve({
					code,
					reason
				});
				ws.removeEventListener("error", reject);
			};
			ws.addEventListener("error", reject);
		});
		if (options.signal) {
			const abort = ws.close.bind(ws);
			options.signal.addEventListener("abort", abort, { once: true });
		}
		this.close = closeWithInfo;
	}
};

//#endregion
export { BaseWebSocketStream };
//# sourceMappingURL=iflytek_websocket_stream.js.map