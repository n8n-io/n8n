import type { Packet } from 'mqtt-packet'
import type { Duplex } from 'stream'
import type MqttClient from './client'
import type { IClientOptions } from './client'

export type DoneCallback = (error?: Error) => void

export type GenericCallback<T> = (error?: Error, result?: T) => void

export type VoidCallback = () => void

export type IStream = Duplex & {
	/** only set on browsers, it's a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)  */
	socket?: any
}

export type StreamBuilder = (
	client: MqttClient,
	opts?: IClientOptions,
) => IStream

export type Callback = () => void

export type PacketHandler = (
	client: MqttClient,
	packet: Packet,
	done?: DoneCallback,
) => void

export type TimerVariant = 'auto' | 'worker' | 'native'

export class ErrorWithReasonCode extends Error {
	public code: number

	public constructor(message: string, code: number) {
		super(message)
		this.code = code

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ErrorWithReasonCode.prototype)
		Object.getPrototypeOf(this).name = 'ErrorWithReasonCode'
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T = {}> = new (...args: any[]) => T

export function applyMixin(
	target: Constructor,
	mixin: Constructor,
	includeConstructor = false,
): void {
	// Figure out the inheritance chain of the mixin
	const inheritanceChain: Constructor[] = [mixin]
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const current = inheritanceChain[0]
		const base = Object.getPrototypeOf(current)
		if (base?.prototype) {
			inheritanceChain.unshift(base)
		} else {
			break
		}
	}
	for (const ctor of inheritanceChain) {
		for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
			// Do not override the constructor
			if (includeConstructor || prop !== 'constructor') {
				Object.defineProperty(
					target.prototype,
					prop,
					Object.getOwnPropertyDescriptor(ctor.prototype, prop) ??
						Object.create(null),
				)
			}
		}
	}
}
export const nextTick =
	typeof process?.nextTick === 'function'
		? process.nextTick
		: (callback: () => void) => {
				setTimeout(callback, 0)
		  }

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const MQTTJS_VERSION = require('../../package.json').version
