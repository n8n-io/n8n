import { SocketOptions, Socket, TlsOptions } from 'cloudflare:sockets'
import { EventEmitter } from 'events'

/**
 * Wrapper around the Cloudflare built-in socket that can be used by the `Connection`.
 */
export class CloudflareSocket extends EventEmitter {
  writable = false
  destroyed = false

  private _upgrading = false
  private _upgraded = false
  private _cfSocket: Socket | null = null
  private _cfWriter: WritableStreamDefaultWriter | null = null
  private _cfReader: ReadableStreamDefaultReader | null = null

  constructor(readonly ssl: boolean) {
    super()
  }

  setNoDelay() {
    return this
  }
  setKeepAlive() {
    return this
  }
  ref() {
    return this
  }
  unref() {
    return this
  }

  async connect(port: number, host: string, connectListener?: (...args: unknown[]) => void) {
    try {
      log('connecting')
      if (connectListener) this.once('connect', connectListener)

      const options: SocketOptions = this.ssl ? { secureTransport: 'starttls' } : {}
      const mod = await import('cloudflare:sockets')
      const connect = mod.connect
      this._cfSocket = connect(`${host}:${port}`, options)
      this._cfWriter = this._cfSocket.writable.getWriter()
      this._addClosedHandler()

      this._cfReader = this._cfSocket.readable.getReader()
      if (this.ssl) {
        this._listenOnce().catch((e) => this.emit('error', e))
      } else {
        this._listen().catch((e) => this.emit('error', e))
      }

      await this._cfWriter!.ready
      log('socket ready')
      this.writable = true
      this.emit('connect')

      return this
    } catch (e) {
      this.emit('error', e)
    }
  }

  async _listen() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      log('awaiting receive from CF socket')
      const { done, value } = await this._cfReader!.read()
      log('CF socket received:', done, value)
      if (done) {
        log('done')
        break
      }
      this.emit('data', Buffer.from(value))
    }
  }

  async _listenOnce() {
    log('awaiting first receive from CF socket')
    const { done, value } = await this._cfReader!.read()
    log('First CF socket received:', done, value)
    this.emit('data', Buffer.from(value))
  }

  write(
    data: Uint8Array | string,
    encoding: BufferEncoding = 'utf8',
    callback: (...args: unknown[]) => void = () => {}
  ) {
    if (data.length === 0) return callback()
    if (typeof data === 'string') data = Buffer.from(data, encoding)

    log('sending data direct:', data)
    this._cfWriter!.write(data).then(
      () => {
        log('data sent')
        callback()
      },
      (err) => {
        log('send error', err)
        callback(err)
      }
    )
    return true
  }

  end(data = Buffer.alloc(0), encoding: BufferEncoding = 'utf8', callback: (...args: unknown[]) => void = () => {}) {
    log('ending CF socket')
    this.write(data, encoding, (err) => {
      this._cfSocket!.close()
      if (callback) callback(err)
    })
    return this
  }

  destroy(reason: string) {
    log('destroying CF socket', reason)
    this.destroyed = true
    return this.end()
  }

  startTls(options: TlsOptions) {
    if (this._upgraded) {
      // Don't try to upgrade again.
      this.emit('error', 'Cannot call `startTls()` more than once on a socket')
      return
    }
    this._cfWriter!.releaseLock()
    this._cfReader!.releaseLock()
    this._upgrading = true
    this._cfSocket = this._cfSocket!.startTls(options)
    this._cfWriter = this._cfSocket.writable.getWriter()
    this._cfReader = this._cfSocket.readable.getReader()
    this._addClosedHandler()
    this._listen().catch((e) => this.emit('error', e))
  }

  _addClosedHandler() {
    this._cfSocket!.closed.then(() => {
      if (!this._upgrading) {
        log('CF socket closed')
        this._cfSocket = null
        this.emit('close')
      } else {
        this._upgrading = false
        this._upgraded = true
      }
    }).catch((e) => this.emit('error', e))
  }
}

const debug = false

function dump(data: unknown) {
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    const hex = Buffer.from(data).toString('hex')
    const str = new TextDecoder().decode(data)
    return `\n>>> STR: "${str.replace(/\n/g, '\\n')}"\n>>> HEX: ${hex}\n`
  } else {
    return data
  }
}

function log(...args: unknown[]) {
  debug && console.log(...args.map(dump))
}
