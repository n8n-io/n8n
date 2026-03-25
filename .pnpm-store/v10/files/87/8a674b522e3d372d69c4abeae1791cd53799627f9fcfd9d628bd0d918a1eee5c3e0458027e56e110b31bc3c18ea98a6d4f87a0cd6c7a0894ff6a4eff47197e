/* eslint-disable */
import { resolveRequestDocument } from './resolveRequestDocument.js'
import type { RequestDocument, Variables } from './types.js'
import { ClientError } from './types.js'
// import type WebSocket from 'ws'

const CONNECTION_INIT = `connection_init`
const CONNECTION_ACK = `connection_ack`
const PING = `ping`
const PONG = `pong`
const SUBSCRIBE = `subscribe`
const NEXT = `next`
const ERROR = `error`
const COMPLETE = `complete`

type MessagePayload = { [key: string]: any }

type SubscribePayload<V extends Variables = Variables, E = any> = {
  operationName?: string | null
  query: string
  variables?: V
  extensions?: E
}

class GraphQLWebSocketMessage<A = MessagePayload> {
  private _type: string
  private _id?: string
  private _payload?: A

  public get type(): string {
    return this._type
  }
  public get id(): string | undefined {
    return this._id
  }
  public get payload(): A | undefined {
    return this._payload
  }

  constructor(type: string, payload?: A, id?: string) {
    this._type = type
    this._payload = payload
    this._id = id
  }

  public get text(): string {
    const result: any = { type: this.type }
    if (this.id != null && this.id != undefined) result.id = this.id
    if (this.payload != null && this.payload != undefined) result.payload = this.payload
    return JSON.stringify(result)
  }

  static parse<A>(data: string, f: (payload: any) => A): GraphQLWebSocketMessage<A> {
    const { type, payload, id }: { type: string; payload: any; id: string } = JSON.parse(data)
    return new GraphQLWebSocketMessage(type, f(payload), id)
  }
}

export type SocketHandler = {
  onInit?: <T>() => Promise<T>
  onAcknowledged?: <A>(payload?: A) => Promise<void>
  onPing?: <In, Out>(payload: In) => Promise<Out>
  onPong?: <T>(payload: T) => any
  onClose?: () => any
}

export type UnsubscribeCallback = () => void

export interface GraphQLSubscriber<T, E = unknown> {
  next?(data: T, extensions?: E): void
  error?(errorValue: ClientError): void
  complete?(): void
}

type SubscriptionRecord = {
  subscriber: GraphQLSubscriber<unknown, unknown>
  query: string
  variables?: Variables
}

type SocketState = {
  acknowledged: boolean
  lastRequestId: number
  subscriptions: { [key: string]: SubscriptionRecord }
}

export class GraphQLWebSocketClient {
  static PROTOCOL = `graphql-transport-ws`

  private socket: WebSocket
  private socketState: SocketState = { acknowledged: false, lastRequestId: 0, subscriptions: {} }

  constructor(socket: WebSocket, { onInit, onAcknowledged, onPing, onPong }: SocketHandler) {
    this.socket = socket

    socket.addEventListener(`open`, async (e) => {
      this.socketState.acknowledged = false
      this.socketState.subscriptions = {}
      socket.send(ConnectionInit(onInit ? await onInit() : null).text)
    })

    socket.addEventListener(`close`, (e) => {
      this.socketState.acknowledged = false
      this.socketState.subscriptions = {}
    })

    socket.addEventListener(`error`, (e) => {
      console.error(e)
    })

    socket.addEventListener(`message`, (e) => {
      try {
        const message = parseMessage(e.data)
        switch (message.type) {
          case CONNECTION_ACK: {
            if (this.socketState.acknowledged) {
              console.warn(`Duplicate CONNECTION_ACK message ignored`)
            } else {
              this.socketState.acknowledged = true
              if (onAcknowledged) onAcknowledged(message.payload)
            }
            return
          }
          case PING: {
            if (onPing) onPing(message.payload).then((r) => socket.send(Pong(r).text))
            else socket.send(Pong(null).text)
            return
          }
          case PONG: {
            if (onPong) onPong(message.payload)
            return
          }
        }

        if (!this.socketState.acknowledged) {
          // Web-socket connection not acknowledged
          return
        }

        if (message.id === undefined || message.id === null || !this.socketState.subscriptions[message.id]) {
          // No subscription identifer or subscription indentifier is not found
          return
        }
        const { query, variables, subscriber } = this.socketState.subscriptions[message.id]!

        switch (message.type) {
          case NEXT: {
            if (!message.payload.errors && message.payload.data) {
              subscriber.next && subscriber.next(message.payload.data)
            }
            if (message.payload.errors) {
              subscriber.error &&
                subscriber.error(new ClientError({ ...message.payload, status: 200 }, { query, variables }))
            } else {
            }
            return
          }

          case ERROR: {
            subscriber.error &&
              subscriber.error(
                new ClientError({ errors: message.payload, status: 200 }, { query, variables })
              )
            return
          }

          case COMPLETE: {
            subscriber.complete && subscriber.complete()
            delete this.socketState.subscriptions[message.id]
            return
          }
        }
      } catch (e) {
        // Unexpected errors while handling graphql-ws message
        console.error(e)
        socket.close(1006)
      }
      socket.close(4400, `Unknown graphql-ws message.`)
    })
  }

  private makeSubscribe<T, V extends Variables, E>(
    query: string,
    operationName: string | undefined,
    subscriber: GraphQLSubscriber<T, E>,
    variables?: V
  ): UnsubscribeCallback {
    const subscriptionId = (this.socketState.lastRequestId++).toString()
    this.socketState.subscriptions[subscriptionId] = { query, variables, subscriber }
    this.socket.send(Subscribe(subscriptionId, { query, operationName, variables }).text)
    return () => {
      this.socket.send(Complete(subscriptionId).text)
      delete this.socketState.subscriptions[subscriptionId]
    }
  }

  rawRequest<T = any, V extends Variables = Variables, E = any>(
    query: string,
    variables?: V
  ): Promise<{ data: T; extensions?: E }> {
    return new Promise<{ data: T; extensions?: E; headers?: Headers; status?: number }>((resolve, reject) => {
      let result: { data: T; extensions?: E }
      this.rawSubscribe(
        query,
        {
          next: (data: T, extensions: E) => (result = { data, extensions }),
          error: reject,
          complete: () => resolve(result),
        },
        variables
      )
    })
  }

  request<T = any, V extends Variables = Variables>(document: RequestDocument, variables?: V): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let result: T
      this.subscribe(
        document,
        {
          next: (data: T) => (result = data),
          error: reject,
          complete: () => resolve(result),
        },
        variables
      )
    })
  }

  subscribe<T = any, V extends Variables = Variables, E = any>(
    document: RequestDocument,
    subscriber: GraphQLSubscriber<T, E>,
    variables?: V
  ): UnsubscribeCallback {
    const { query, operationName } = resolveRequestDocument(document)
    return this.makeSubscribe(query, operationName, subscriber, variables)
  }

  rawSubscribe<T = any, V extends Variables = Variables, E = any>(
    query: string,
    subscriber: GraphQLSubscriber<T, E>,
    variables?: V
  ): UnsubscribeCallback {
    return this.makeSubscribe(query, undefined, subscriber, variables)
  }

  ping(payload: Variables) {
    this.socket.send(Ping(payload).text)
  }

  close() {
    this.socket.close(1000)
  }
}

// Helper functions

function parseMessage<A = any>(data: string, f: (payload: any) => A = (a) => a): GraphQLWebSocketMessage<A> {
  const m = GraphQLWebSocketMessage.parse<A>(data, f)
  return m
}

function ConnectionInit<A>(payload?: A) {
  return new GraphQLWebSocketMessage(CONNECTION_INIT, payload)
}

function Ping(payload: any) {
  return new GraphQLWebSocketMessage(PING, payload, undefined)
}
function Pong(payload: any) {
  return new GraphQLWebSocketMessage(PONG, payload, undefined)
}

function Subscribe(id: string, payload: SubscribePayload) {
  return new GraphQLWebSocketMessage(SUBSCRIBE, payload, id)
}

function Complete(id: string) {
  return new GraphQLWebSocketMessage(COMPLETE, undefined, id)
}
