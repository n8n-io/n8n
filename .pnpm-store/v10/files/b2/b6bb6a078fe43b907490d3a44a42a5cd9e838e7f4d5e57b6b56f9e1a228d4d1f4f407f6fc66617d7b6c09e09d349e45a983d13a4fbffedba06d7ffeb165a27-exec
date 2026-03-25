import WebSocket from './WebSocket'

import {
  CHANNEL_EVENTS,
  CONNECTION_STATE,
  DEFAULT_HEADERS,
  DEFAULT_TIMEOUT,
  SOCKET_STATES,
  TRANSPORTS,
  VSN,
  WS_CLOSE_NORMAL,
} from './lib/constants'

import Serializer from './lib/serializer'
import Timer from './lib/timer'

import { httpEndpointURL } from './lib/transformers'
import RealtimeChannel from './RealtimeChannel'
import type { RealtimeChannelOptions } from './RealtimeChannel'

type Fetch = typeof fetch

export type Channel = {
  name: string
  inserted_at: string
  updated_at: string
  id: number
}
export type LogLevel = 'info' | 'warn' | 'error'

export type RealtimeMessage = {
  topic: string
  event: string
  payload: any
  ref: string
  join_ref?: string
}

export type RealtimeRemoveChannelResponse = 'ok' | 'timed out' | 'error'
export type HeartbeatStatus =
  | 'sent'
  | 'ok'
  | 'error'
  | 'timeout'
  | 'disconnected'

const noop = () => {}

export interface WebSocketLikeConstructor {
  new (
    address: string | URL,
    _ignored?: any,
    options?: { headers: Object | undefined }
  ): WebSocketLike
}

export type WebSocketLike = WebSocket | WSWebSocketDummy

export interface WebSocketLikeError {
  error: any
  message: string
  type: string
}

export type RealtimeClientOptions = {
  transport?: WebSocketLikeConstructor
  timeout?: number
  heartbeatIntervalMs?: number
  logger?: Function
  encode?: Function
  decode?: Function
  reconnectAfterMs?: Function
  headers?: { [key: string]: string }
  params?: { [key: string]: any }
  //Deprecated: Use it in favour of correct casing `logLevel`
  log_level?: LogLevel
  logLevel?: LogLevel
  fetch?: Fetch
  worker?: boolean
  workerUrl?: string
  accessToken?: () => Promise<string | null>
}

const WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`

export default class RealtimeClient {
  accessTokenValue: string | null = null
  apiKey: string | null = null
  channels: RealtimeChannel[] = new Array()
  endPoint: string = ''
  httpEndpoint: string = ''
  headers?: { [key: string]: string } = DEFAULT_HEADERS
  params?: { [key: string]: string } = {}
  timeout: number = DEFAULT_TIMEOUT
  transport: WebSocketLikeConstructor | null
  heartbeatIntervalMs: number = 25000
  heartbeatTimer: ReturnType<typeof setInterval> | undefined = undefined
  pendingHeartbeatRef: string | null = null
  heartbeatCallback: (status: HeartbeatStatus) => void = noop
  ref: number = 0
  reconnectTimer: Timer
  logger: Function = noop
  logLevel?: LogLevel
  encode: Function
  decode: Function
  reconnectAfterMs: Function
  conn: WebSocketLike | null = null
  sendBuffer: Function[] = []
  serializer: Serializer = new Serializer()
  stateChangeCallbacks: {
    open: Function[]
    close: Function[]
    error: Function[]
    message: Function[]
  } = {
    open: [],
    close: [],
    error: [],
    message: [],
  }
  fetch: Fetch
  accessToken: (() => Promise<string | null>) | null = null
  worker?: boolean
  workerUrl?: string
  workerRef?: Worker

  /**
   * Initializes the Socket.
   *
   * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
   * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
   * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
   * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
   * @param options.params The optional params to pass when connecting.
   * @param options.headers The optional headers to pass when connecting.
   * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
   * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
   * @param options.logLevel Sets the log level for Realtime
   * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
   * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
   * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
   * @param options.worker Use Web Worker to set a side flow. Defaults to false.
   * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
   */
  constructor(endPoint: string, options?: RealtimeClientOptions) {
    this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`
    this.httpEndpoint = httpEndpointURL(endPoint)
    if (options?.transport) {
      this.transport = options.transport
    } else {
      this.transport = null
    }
    if (options?.params) this.params = options.params
    if (options?.headers) this.headers = { ...this.headers, ...options.headers }
    if (options?.timeout) this.timeout = options.timeout
    if (options?.logger) this.logger = options.logger
    if (options?.logLevel || options?.log_level) {
      this.logLevel = options.logLevel || options.log_level
      this.params = { ...this.params, log_level: this.logLevel as string }
    }

    if (options?.heartbeatIntervalMs)
      this.heartbeatIntervalMs = options.heartbeatIntervalMs

    const accessTokenValue = options?.params?.apikey
    if (accessTokenValue) {
      this.accessTokenValue = accessTokenValue
      this.apiKey = accessTokenValue
    }

    this.reconnectAfterMs = options?.reconnectAfterMs
      ? options.reconnectAfterMs
      : (tries: number) => {
          return [1000, 2000, 5000, 10000][tries - 1] || 10000
        }
    this.encode = options?.encode
      ? options.encode
      : (payload: JSON, callback: Function) => {
          return callback(JSON.stringify(payload))
        }
    this.decode = options?.decode
      ? options.decode
      : this.serializer.decode.bind(this.serializer)
    this.reconnectTimer = new Timer(async () => {
      this.disconnect()
      this.connect()
    }, this.reconnectAfterMs)

    this.fetch = this._resolveFetch(options?.fetch)
    if (options?.worker) {
      if (typeof window !== 'undefined' && !window.Worker) {
        throw new Error('Web Worker is not supported')
      }
      this.worker = options?.worker || false
      this.workerUrl = options?.workerUrl
    }
    this.accessToken = options?.accessToken || null
  }

  /**
   * Connects the socket, unless already connected.
   */
  connect(): void {
    if (this.conn) {
      return
    }
    if (!this.transport) {
      this.transport = WebSocket
    }
    if (this.transport) {
      // Detect if using the native browser WebSocket
      const isBrowser =
        typeof window !== 'undefined' && this.transport === window.WebSocket
      if (isBrowser) {
        this.conn = new this.transport(this.endpointURL())
      } else {
        this.conn = new this.transport(this.endpointURL(), undefined, {
          headers: this.headers,
        })
      }
      this.setupConnection()
      return
    }
    this.conn = new WSWebSocketDummy(this.endpointURL(), undefined, {
      close: () => {
        this.conn = null
      },
    })
  }

  /**
   * Returns the URL of the websocket.
   * @returns string The URL of the websocket.
   */
  endpointURL(): string {
    return this._appendParams(
      this.endPoint,
      Object.assign({}, this.params, { vsn: VSN })
    )
  }

  /**
   * Disconnects the socket.
   *
   * @param code A numeric status code to send on disconnect.
   * @param reason A custom reason for the disconnect.
   */
  disconnect(code?: number, reason?: string): void {
    if (this.conn) {
      this.conn.onclose = function () {} // noop
      if (code) {
        this.conn.close(code, reason ?? '')
      } else {
        this.conn.close()
      }
      this.conn = null

      // remove open handles
      this.heartbeatTimer && clearInterval(this.heartbeatTimer)
      this.reconnectTimer.reset()
      this.channels.forEach((channel) => channel.teardown())
    }
  }

  /**
   * Returns all created channels
   */
  getChannels(): RealtimeChannel[] {
    return this.channels
  }

  /**
   * Unsubscribes and removes a single channel
   * @param channel A RealtimeChannel instance
   */
  async removeChannel(
    channel: RealtimeChannel
  ): Promise<RealtimeRemoveChannelResponse> {
    const status = await channel.unsubscribe()
    this.channels = this.channels.filter((c) => c._joinRef !== channel._joinRef)

    if (this.channels.length === 0) {
      this.disconnect()
    }

    return status
  }

  /**
   * Unsubscribes and removes all channels
   */
  async removeAllChannels(): Promise<RealtimeRemoveChannelResponse[]> {
    const values_1 = await Promise.all(
      this.channels.map((channel) => channel.unsubscribe())
    )
    this.channels = []
    this.disconnect()
    return values_1
  }

  /**
   * Logs the message.
   *
   * For customized logging, `this.logger` can be overridden.
   */
  log(kind: string, msg: string, data?: any) {
    this.logger(kind, msg, data)
  }

  /**
   * Returns the current state of the socket.
   */
  connectionState(): CONNECTION_STATE {
    switch (this.conn && this.conn.readyState) {
      case SOCKET_STATES.connecting:
        return CONNECTION_STATE.Connecting
      case SOCKET_STATES.open:
        return CONNECTION_STATE.Open
      case SOCKET_STATES.closing:
        return CONNECTION_STATE.Closing
      default:
        return CONNECTION_STATE.Closed
    }
  }

  /**
   * Returns `true` is the connection is open.
   */
  isConnected(): boolean {
    return this.connectionState() === CONNECTION_STATE.Open
  }

  channel(
    topic: string,
    params: RealtimeChannelOptions = { config: {} }
  ): RealtimeChannel {
    const realtimeTopic = `realtime:${topic}`
    const exists = this.getChannels().find(
      (c: RealtimeChannel) => c.topic === realtimeTopic
    )

    if (!exists) {
      const chan = new RealtimeChannel(`realtime:${topic}`, params, this)
      this.channels.push(chan)

      return chan
    } else {
      return exists
    }
  }

  /**
   * Push out a message if the socket is connected.
   *
   * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
   */
  push(data: RealtimeMessage): void {
    const { topic, event, payload, ref } = data
    const callback = () => {
      this.encode(data, (result: any) => {
        this.conn?.send(result)
      })
    }
    this.log('push', `${topic} ${event} (${ref})`, payload)
    if (this.isConnected()) {
      callback()
    } else {
      this.sendBuffer.push(callback)
    }
  }

  /**
   * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
   *
   * If param is null it will use the `accessToken` callback function or the token set on the client.
   *
   * On callback used, it will set the value of the token internal to the client.
   *
   * @param token A JWT string to override the token set on the client.
   */
  async setAuth(token: string | null = null): Promise<void> {
    let tokenToSend =
      token ||
      (this.accessToken && (await this.accessToken())) ||
      this.accessTokenValue

    if (this.accessTokenValue != tokenToSend) {
      this.accessTokenValue = tokenToSend
      this.channels.forEach((channel) => {
        tokenToSend &&
          channel.updateJoinPayload({
            access_token: tokenToSend,
            version: this.headers && this.headers['X-Client-Info'],
          })

        if (channel.joinedOnce && channel._isJoined()) {
          channel._push(CHANNEL_EVENTS.access_token, {
            access_token: tokenToSend,
          })
        }
      })
    }
  }
  /**
   * Sends a heartbeat message if the socket is connected.
   */
  async sendHeartbeat() {
    if (!this.isConnected()) {
      this.heartbeatCallback('disconnected')
      return
    }
    if (this.pendingHeartbeatRef) {
      this.pendingHeartbeatRef = null
      this.log(
        'transport',
        'heartbeat timeout. Attempting to re-establish connection'
      )
      this.heartbeatCallback('timeout')
      this.conn?.close(WS_CLOSE_NORMAL, 'hearbeat timeout')
      return
    }
    this.pendingHeartbeatRef = this._makeRef()
    this.push({
      topic: 'phoenix',
      event: 'heartbeat',
      payload: {},
      ref: this.pendingHeartbeatRef,
    })
    this.heartbeatCallback('sent')
    await this.setAuth()
  }

  onHeartbeat(callback: (status: HeartbeatStatus) => void): void {
    this.heartbeatCallback = callback
  }
  /**
   * Flushes send buffer
   */
  flushSendBuffer() {
    if (this.isConnected() && this.sendBuffer.length > 0) {
      this.sendBuffer.forEach((callback) => callback())
      this.sendBuffer = []
    }
  }

  /**
   * Use either custom fetch, if provided, or default fetch to make HTTP requests
   *
   * @internal
   */
  _resolveFetch = (customFetch?: Fetch): Fetch => {
    let _fetch: Fetch
    if (customFetch) {
      _fetch = customFetch
    } else if (typeof fetch === 'undefined') {
      _fetch = (...args) =>
        import('@supabase/node-fetch' as any).then(({ default: fetch }) =>
          fetch(...args)
        )
    } else {
      _fetch = fetch
    }
    return (...args) => _fetch(...args)
  }

  /**
   * Return the next message ref, accounting for overflows
   *
   * @internal
   */
  _makeRef(): string {
    let newRef = this.ref + 1
    if (newRef === this.ref) {
      this.ref = 0
    } else {
      this.ref = newRef
    }

    return this.ref.toString()
  }

  /**
   * Unsubscribe from channels with the specified topic.
   *
   * @internal
   */
  _leaveOpenTopic(topic: string): void {
    let dupChannel = this.channels.find(
      (c) => c.topic === topic && (c._isJoined() || c._isJoining())
    )
    if (dupChannel) {
      this.log('transport', `leaving duplicate topic "${topic}"`)
      dupChannel.unsubscribe()
    }
  }

  /**
   * Removes a subscription from the socket.
   *
   * @param channel An open subscription.
   *
   * @internal
   */
  _remove(channel: RealtimeChannel) {
    this.channels = this.channels.filter((c) => c.topic !== channel.topic)
  }

  /**
   * Sets up connection handlers.
   *
   * @internal
   */
  private setupConnection(): void {
    if (this.conn) {
      this.conn.binaryType = 'arraybuffer'
      this.conn.onopen = () => this._onConnOpen()
      this.conn.onerror = (error: WebSocketLikeError) =>
        this._onConnError(error as WebSocketLikeError)
      this.conn.onmessage = (event: any) => this._onConnMessage(event)
      this.conn.onclose = (event: any) => this._onConnClose(event)
    }
  }

  /** @internal */
  private _onConnMessage(rawMessage: { data: any }) {
    this.decode(rawMessage.data, (msg: RealtimeMessage) => {
      let { topic, event, payload, ref } = msg

      if (topic === 'phoenix' && event === 'phx_reply') {
        this.heartbeatCallback(msg.payload.status == 'ok' ? 'ok' : 'error')
      }

      if (ref && ref === this.pendingHeartbeatRef) {
        this.pendingHeartbeatRef = null
      }

      this.log(
        'receive',
        `${payload.status || ''} ${topic} ${event} ${
          (ref && '(' + ref + ')') || ''
        }`,
        payload
      )

      Array.from(this.channels)
        .filter((channel: RealtimeChannel) => channel._isMember(topic))
        .forEach((channel: RealtimeChannel) =>
          channel._trigger(event, payload, ref)
        )

      this.stateChangeCallbacks.message.forEach((callback) => callback(msg))
    })
  }

  /** @internal */
  private _onConnOpen() {
    this.log('transport', `connected to ${this.endpointURL()}`)
    this.flushSendBuffer()
    this.reconnectTimer.reset()
    if (!this.worker) {
      this.heartbeatTimer && clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = setInterval(
        () => this.sendHeartbeat(),
        this.heartbeatIntervalMs
      )
    } else {
      if (this.workerUrl) {
        this.log('worker', `starting worker for from ${this.workerUrl}`)
      } else {
        this.log('worker', `starting default worker`)
      }
      const objectUrl = this._workerObjectUrl(this.workerUrl!)
      this.workerRef = new Worker(objectUrl)
      this.workerRef.onerror = (error) => {
        this.log('worker', 'worker error', (error as ErrorEvent).message)
        this.workerRef!.terminate()
      }
      this.workerRef.onmessage = (event) => {
        if (event.data.event === 'keepAlive') {
          this.sendHeartbeat()
        }
      }
      this.workerRef.postMessage({
        event: 'start',
        interval: this.heartbeatIntervalMs,
      })
    }
    this.stateChangeCallbacks.open.forEach((callback) => callback())
  }

  /** @internal */
  private _onConnClose(event: any) {
    this.log('transport', 'close', event)
    this._triggerChanError()
    this.heartbeatTimer && clearInterval(this.heartbeatTimer)
    this.reconnectTimer.scheduleTimeout()
    this.stateChangeCallbacks.close.forEach((callback) => callback(event))
  }

  /** @internal */
  private _onConnError(error: WebSocketLikeError) {
    this.log('transport', error.message)
    this._triggerChanError()
    this.stateChangeCallbacks.error.forEach((callback) => callback(error))
  }

  /** @internal */
  private _triggerChanError() {
    this.channels.forEach((channel: RealtimeChannel) =>
      channel._trigger(CHANNEL_EVENTS.error)
    )
  }

  /** @internal */
  private _appendParams(
    url: string,
    params: { [key: string]: string }
  ): string {
    if (Object.keys(params).length === 0) {
      return url
    }
    const prefix = url.match(/\?/) ? '&' : '?'
    const query = new URLSearchParams(params)
    return `${url}${prefix}${query}`
  }

  private _workerObjectUrl(url: string | undefined): string {
    let result_url: string
    if (url) {
      result_url = url
    } else {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' })
      result_url = URL.createObjectURL(blob)
    }
    return result_url
  }
}

class WSWebSocketDummy {
  binaryType: string = 'arraybuffer'
  close: Function
  onclose: Function = () => {}
  onerror: Function = () => {}
  onmessage: Function = () => {}
  onopen: Function = () => {}
  readyState: number = SOCKET_STATES.connecting
  send: Function = () => {}
  url: string | URL | null = null

  constructor(
    address: string,
    _protocols: undefined,
    options: { close: Function }
  ) {
    this.url = address
    this.close = options.close
  }
}
