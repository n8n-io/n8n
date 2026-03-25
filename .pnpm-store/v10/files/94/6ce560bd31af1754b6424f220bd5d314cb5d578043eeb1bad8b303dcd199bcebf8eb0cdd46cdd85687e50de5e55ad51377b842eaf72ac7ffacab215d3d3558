/**
 * Module dependencies
 */
import { Readable } from 'readable-stream'
import { Packet } from 'mqtt-packet'
import { DoneCallback } from './shared'

const streamsOpts = { objectMode: true }
const defaultStoreOptions = {
	clean: true,
}

export interface IStoreOptions {
	/**
	 * true, clear _inflights at close
	 */
	clean?: boolean
}

export type PacketCallback = (error?: Error, packet?: Packet) => void

export interface IStore {
	/**
	 * Adds a packet to the store, a packet is
	 * anything that has a messageId property.
	 *
	 */
	put(packet: Packet, cb: DoneCallback): IStore

	/**
	 * Creates a stream with all the packets in the store
	 *
	 */
	createStream(): Readable

	/**
	 * deletes a packet from the store.
	 */
	del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore

	/**
	 * get a packet from the store.
	 */
	get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore

	/**
	 * Close the store
	 */
	close(cb: DoneCallback): void
}

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 * @param {Object} [options] - store options
 */
export default class Store implements IStore {
	private options: IStoreOptions

	private _inflights: Map<number, Packet>

	constructor(options?: IStoreOptions) {
		this.options = options || {}

		// Defaults
		this.options = { ...defaultStoreOptions, ...options }

		this._inflights = new Map()
	}

	/**
	 * Adds a packet to the store, a packet is
	 * anything that has a messageId property.
	 *
	 */
	put(packet: Packet, cb: DoneCallback) {
		this._inflights.set(packet.messageId, packet)

		if (cb) {
			cb()
		}

		return this
	}

	/**
	 * Creates a stream with all the packets in the store
	 *
	 */
	createStream() {
		const stream = new Readable(streamsOpts)
		const values = []
		let destroyed = false
		let i = 0

		this._inflights.forEach((value, key) => {
			values.push(value)
		})

		stream._read = () => {
			if (!destroyed && i < values.length) {
				stream.push(values[i++])
			} else {
				stream.push(null)
			}
		}

		stream.destroy = (err) => {
			if (destroyed) {
				return
			}

			destroyed = true

			setTimeout(() => {
				stream.emit('close')
			}, 0)

			return stream
		}

		return stream
	}

	/**
	 * deletes a packet from the store.
	 */
	del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback) {
		const toDelete = this._inflights.get(packet.messageId)
		if (toDelete) {
			this._inflights.delete(packet.messageId)
			cb(null, toDelete)
		} else if (cb) {
			cb(new Error('missing packet'))
		}

		return this
	}

	/**
	 * get a packet from the store.
	 */
	get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback) {
		const storedPacket = this._inflights.get(packet.messageId)
		if (storedPacket) {
			cb(null, storedPacket)
		} else if (cb) {
			cb(new Error('missing packet'))
		}

		return this
	}

	/**
	 * Close the store
	 */
	close(cb: DoneCallback) {
		if (this.options.clean) {
			this._inflights = null
		}
		if (cb) {
			cb()
		}
	}
}
