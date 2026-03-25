import { version } from './version'

export const DEFAULT_HEADERS = { 'X-Client-Info': `realtime-js/${version}` }

export const VSN: string = '1.0.0'

export const VERSION = version

export const DEFAULT_TIMEOUT = 10000

export const WS_CLOSE_NORMAL = 1000

export enum SOCKET_STATES {
  connecting = 0,
  open = 1,
  closing = 2,
  closed = 3,
}

export enum CHANNEL_STATES {
  closed = 'closed',
  errored = 'errored',
  joined = 'joined',
  joining = 'joining',
  leaving = 'leaving',
}

export enum CHANNEL_EVENTS {
  close = 'phx_close',
  error = 'phx_error',
  join = 'phx_join',
  reply = 'phx_reply',
  leave = 'phx_leave',
  access_token = 'access_token',
}

export enum TRANSPORTS {
  websocket = 'websocket',
}

export enum CONNECTION_STATE {
  Connecting = 'connecting',
  Open = 'open',
  Closing = 'closing',
  Closed = 'closed',
}
