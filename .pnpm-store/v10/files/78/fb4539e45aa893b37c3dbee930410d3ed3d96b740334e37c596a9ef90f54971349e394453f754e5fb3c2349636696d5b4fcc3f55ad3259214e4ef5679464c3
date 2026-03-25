import { Duplex, Transform } from 'readable-stream'
import { Buffer } from 'buffer'
import { IClientOptions } from './client'

/**
 * Utils writev function for browser, ensure to write Buffers to socket (convert strings).
 */
export function writev(
	chunks: { chunk: any; encoding: string }[],
	cb: (err?: Error) => void,
) {
	const buffers = new Array(chunks.length)
	for (let i = 0; i < chunks.length; i++) {
		if (typeof chunks[i].chunk === 'string') {
			buffers[i] = Buffer.from(chunks[i].chunk, 'utf8')
		} else {
			buffers[i] = chunks[i].chunk
		}
	}

	this._write(Buffer.concat(buffers), 'binary', cb)
}

/**
 * How this works:
 * - `socket` is the `WebSocket` instance, the connection to our broker.
 * - `proxy` is a `Transform`, it ensure data written to the `socket` is a `Buffer`.
 * This class buffers the data written to the `proxy` (so then to `socket`) until the `socket` is ready.
 * The stream returned from this class, will be passed to the `MqttClient`.
 */
export class BufferedDuplex extends Duplex {
	public socket: WebSocket

	private proxy: Transform

	private isSocketOpen: boolean

	private writeQueue: Array<{
		chunk: any
		encoding: string
		cb: (err?: Error) => void
	}>

	constructor(opts: IClientOptions, proxy: Transform, socket: WebSocket) {
		super({
			objectMode: true,
		})
		this.proxy = proxy
		this.socket = socket
		this.writeQueue = []

		if (!opts.objectMode) {
			this._writev = writev.bind(this)
		}

		this.isSocketOpen = false

		this.proxy.on('data', (chunk) => {
			this.push(chunk)
		})
	}

	_read(size?: number): void {
		this.proxy.read(size)
	}

	_write(chunk: any, encoding: string, cb: (err?: Error) => void) {
		if (!this.isSocketOpen) {
			// Buffer the data in a queue
			this.writeQueue.push({ chunk, encoding, cb })
		} else {
			this.writeToProxy(chunk, encoding, cb)
		}
	}

	_final(callback: (error?: Error) => void): void {
		this.writeQueue = []
		this.proxy.end(callback)
	}

	_destroy(err: Error, callback: (error: Error) => void): void {
		this.writeQueue = []
		// do not pass error here otherwise we should listen for `error` event on proxy to prevent uncaught exception
		this.proxy.destroy()
		callback(err)
	}

	/** Method to call when socket is ready to stop buffering writes */
	socketReady() {
		this.emit('connect')
		this.isSocketOpen = true
		this.processWriteQueue()
	}

	private writeToProxy(
		chunk: any,
		encoding: string,
		cb: (err?: Error) => void,
	) {
		if (this.proxy.write(chunk, encoding) === false) {
			this.proxy.once('drain', cb)
		} else {
			cb()
		}
	}

	private processWriteQueue() {
		while (this.writeQueue.length > 0) {
			const { chunk, encoding, cb } = this.writeQueue.shift()!
			this.writeToProxy(chunk, encoding, cb)
		}
	}
}
