let _WebSocket;
if (typeof WebSocket !== "undefined") {
    _WebSocket = WebSocket;
} else if (typeof global !== "undefined") {
    _WebSocket = global.WebSocket;
} else if (typeof window !== "undefined") {
    _WebSocket = window.WebSocket;
} else if (typeof self !== "undefined") {
    _WebSocket = self.WebSocket;
}
export { _WebSocket as WebSocket };
