import type MqttClient from './client'
import getTimer, { type Timer } from './get-timer'
import type { TimerVariant } from './shared'

export default class KeepaliveManager {
	private _keepalive: number

	private timerId: number

	private timer: Timer

	private destroyed = false

	private counter: number

	private client: MqttClient

	private _keepaliveTimeoutTimestamp: number

	private _intervalEvery: number

	/** Timestamp of next keepalive timeout */
	get keepaliveTimeoutTimestamp() {
		return this._keepaliveTimeoutTimestamp
	}

	/** Milliseconds of the actual interval */
	get intervalEvery() {
		return this._intervalEvery
	}

	get keepalive() {
		return this._keepalive
	}

	constructor(client: MqttClient, variant: TimerVariant) {
		this.client = client
		this.timer = getTimer(variant)
		this.setKeepalive(client.options.keepalive)
	}

	private clear() {
		if (this.timerId) {
			this.timer.clear(this.timerId)
			this.timerId = null
		}
	}

	/** Change the keepalive */
	setKeepalive(value: number) {
		// keepalive is in seconds
		value *= 1000

		if (
			// eslint-disable-next-line no-restricted-globals
			isNaN(value) ||
			value <= 0 ||
			value > 2147483647
		) {
			throw new Error(
				`Keepalive value must be an integer between 0 and 2147483647. Provided value is ${value}`,
			)
		}

		this._keepalive = value

		this.reschedule()

		this.client['log'](`KeepaliveManager: set keepalive to ${value}ms`)
	}

	destroy() {
		this.clear()
		this.destroyed = true
	}

	reschedule() {
		if (this.destroyed) {
			return
		}

		this.clear()
		this.counter = 0

		// https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Figure_3.5_Keep
		const keepAliveTimeout = Math.ceil(this._keepalive * 1.5)

		this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout
		this._intervalEvery = Math.ceil(this._keepalive / 2)

		this.timerId = this.timer.set(() => {
			// this should never happen, but just in case
			if (this.destroyed) {
				return
			}

			this.counter += 1

			// after keepalive seconds, send a pingreq
			if (this.counter === 2) {
				this.client.sendPing()
			} else if (this.counter > 2) {
				this.client.onKeepaliveTimeout()
			}
		}, this._intervalEvery)
	}
}
