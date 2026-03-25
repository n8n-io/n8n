import { Buffer } from 'buffer'
import { Transform } from 'readable-stream'
import { StreamBuilder } from '../shared'
import MqttClient, { IClientOptions } from '../client'
import { BufferedDuplex } from '../BufferedDuplex'

let my: any
let proxy: Transform
let stream: BufferedDuplex
let isInitialized = false

function buildProxy() {
	const _proxy = new Transform()
	_proxy._write = (chunk, encoding, next) => {
		my.sendSocketMessage({
			data: chunk.buffer,
			success() {
				next()
			},
			fail() {
				next(new Error())
			},
		})
	}
	_proxy._flush = (done) => {
		my.closeSocket({
			success() {
				done()
			},
		})
	}

	return _proxy
}

function setDefaultOpts(opts: IClientOptions) {
	if (!opts.hostname) {
		opts.hostname = 'localhost'
	}
	if (!opts.path) {
		opts.path = '/'
	}

	if (!opts.wsOptions) {
		opts.wsOptions = {}
	}
}

function buildUrl(opts: IClientOptions, client: MqttClient) {
	const protocol = opts.protocol === 'alis' ? 'wss' : 'ws'
	let url = `${protocol}://${opts.hostname}${opts.path}`
	if (opts.port && opts.port !== 80 && opts.port !== 443) {
		url = `${protocol}://${opts.hostname}:${opts.port}${opts.path}`
	}
	if (typeof opts.transformWsUrl === 'function') {
		url = opts.transformWsUrl(url, opts, client)
	}
	return url
}

function bindEventHandler() {
	if (isInitialized) return

	isInitialized = true

	my.onSocketOpen(() => {
		stream.socketReady()
	})

	my.onSocketMessage((res) => {
		if (typeof res.data === 'string') {
			const buffer = Buffer.from(res.data, 'base64')
			proxy.push(buffer)
		} else {
			const reader = new FileReader()
			reader.addEventListener('load', () => {
				let data = reader.result

				if (data instanceof ArrayBuffer) data = Buffer.from(data)
				else data = Buffer.from(data, 'utf8')
				proxy.push(data)
			})
			reader.readAsArrayBuffer(res.data)
		}
	})

	my.onSocketClose(() => {
		stream.end()
		stream.destroy()
	})

	my.onSocketError((err) => {
		stream.destroy(err)
	})
}

const buildStream: StreamBuilder = (client, opts) => {
	opts.hostname = opts.hostname || opts.host

	if (!opts.hostname) {
		throw new Error('Could not determine host. Specify host manually.')
	}

	const websocketSubProtocol =
		opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
			? 'mqttv3.1'
			: 'mqtt'

	setDefaultOpts(opts)

	const url = buildUrl(opts, client)
	my = opts.my
	// https://miniprogram.alipay.com/docs/miniprogram/mpdev/api_network_connectsocket
	my.connectSocket({
		url,
		protocols: websocketSubProtocol,
	})

	proxy = buildProxy()
	stream = new BufferedDuplex(opts, proxy, my)

	bindEventHandler()

	return stream
}

export default buildStream
