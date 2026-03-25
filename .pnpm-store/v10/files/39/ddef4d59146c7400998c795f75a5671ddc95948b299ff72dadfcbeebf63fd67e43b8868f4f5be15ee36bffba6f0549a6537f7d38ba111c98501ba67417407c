import { Interceptor } from '../../Interceptor'
import {
  type WebSocketClientConnectionProtocol,
  WebSocketClientConnection,
} from './WebSocketClientConnection'
import { WebSocketServerConnection } from './WebSocketServerConnection'
import { WebSocketClassTransport } from './WebSocketClassTransport'
import {
  kClose,
  kPassthroughPromise,
  WebSocketOverride,
} from './WebSocketOverride'
import { bindEvent } from './utils/bindEvent'
import { hasConfigurableGlobal } from '../../utils/hasConfigurableGlobal'

export { type WebSocketData, WebSocketTransport } from './WebSocketTransport'
export {
  WebSocketClientConnection,
  WebSocketClientConnectionProtocol,
  WebSocketServerConnection,
}

export type WebSocketEventMap = {
  connection: [args: WebSocketConnectionData]
}

export type WebSocketConnectionData = {
  /**
   * The incoming WebSocket client connection.
   */
  client: WebSocketClientConnection

  /**
   * The original WebSocket server connection.
   */
  server: WebSocketServerConnection

  /**
   * The connection information.
   */
  info: {
    /**
     * The protocols supported by the WebSocket client.
     */
    protocols: string | Array<string> | undefined
  }
}

/**
 * Intercept the outgoing WebSocket connections created using
 * the global `WebSocket` class.
 */
export class WebSocketInterceptor extends Interceptor<WebSocketEventMap> {
  static symbol = Symbol('websocket')

  constructor() {
    super(WebSocketInterceptor.symbol)
  }

  protected checkEnvironment(): boolean {
    return hasConfigurableGlobal('WebSocket')
  }

  protected setup(): void {
    const originalWebSocketDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'WebSocket'
    )

    const WebSocketProxy = new Proxy(globalThis.WebSocket, {
      construct: (
        target,
        args: ConstructorParameters<typeof globalThis.WebSocket>,
        newTarget
      ) => {
        const [url, protocols] = args

        const createConnection = (): WebSocket => {
          return Reflect.construct(target, args, newTarget)
        }

        // All WebSocket instances are mocked and don't forward
        // any events to the original server (no connection established).
        // To forward the events, the user must use the "server.send()" API.
        const socket = new WebSocketOverride(url, protocols)
        const transport = new WebSocketClassTransport(socket)

        // Emit the "connection" event to the interceptor on the next tick
        // so the client can modify WebSocket options, like "binaryType"
        // while the connection is already pending.
        queueMicrotask(() => {
          try {
            const server = new WebSocketServerConnection(
              socket,
              transport,
              createConnection
            )

            // The "globalThis.WebSocket" class stands for
            // the client-side connection. Assume it's established
            // as soon as the WebSocket instance is constructed.
            const hasConnectionListeners = this.emitter.emit('connection', {
              client: new WebSocketClientConnection(socket, transport),
              server,
              info: {
                protocols,
              },
            })

            if (hasConnectionListeners) {
              socket[kPassthroughPromise].resolve(false)
            } else {
              socket[kPassthroughPromise].resolve(true)

              server.connect()

              // Forward the "open" event from the original server
              // to the mock WebSocket client in the case of a passthrough connection.
              server.addEventListener('open', () => {
                socket.dispatchEvent(bindEvent(socket, new Event('open')))

                // Forward the original connection protocol to the
                // mock WebSocket client.
                if (server['realWebSocket']) {
                  socket.protocol = server['realWebSocket'].protocol
                }
              })
            }
          } catch (error) {
            /**
             * @note Translate unhandled exceptions during the connection
             * handling (i.e. interceptor exceptions) as WebSocket connection
             * closures with error. This prevents from the exceptions occurring
             * in `queueMicrotask` from being process-wide and uncatchable.
             */
            if (error instanceof Error) {
              socket.dispatchEvent(new Event('error'))

              // No need to close the connection if it's already being closed.
              // E.g. the interceptor called `client.close()` and then threw an error.
              if (
                socket.readyState !== WebSocket.CLOSING &&
                socket.readyState !== WebSocket.CLOSED
              ) {
                socket[kClose](1011, error.message, false)
              }

              console.error(error)
            }
          }
        })

        return socket
      },
    })

    Object.defineProperty(globalThis, 'WebSocket', {
      value: WebSocketProxy,
      configurable: true,
    })

    this.subscriptions.push(() => {
      Object.defineProperty(
        globalThis,
        'WebSocket',
        originalWebSocketDescriptor!
      )
    })
  }
}
