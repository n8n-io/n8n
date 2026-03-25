// Node.js WebSocket entry point

let WebSocketImpl: any

if (typeof window === 'undefined') {
  // Node.js environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebSocketImpl = require('ws')
} else {
  // Browser environment
  WebSocketImpl = window.WebSocket
}

export default WebSocketImpl
