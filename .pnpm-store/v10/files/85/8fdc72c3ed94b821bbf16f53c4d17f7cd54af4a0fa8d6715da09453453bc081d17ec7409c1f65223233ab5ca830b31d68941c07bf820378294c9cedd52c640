/* eslint-disable @typescript-eslint/no-var-requires */
import _debug from 'debug'
import url from 'url'
import MqttClient, {
	IClientOptions,
	MqttClientEventCallbacks,
	MqttProtocol,
} from '../client'
import IS_BROWSER from '../is-browser'
import { StreamBuilder } from '../shared'

// Handling the process.nextTick is not a function error in react-native applications.
if (typeof process?.nextTick !== 'function') {
	process.nextTick = setImmediate
}

const debug = _debug('mqttjs')

const protocols: Record<string, StreamBuilder> = {}

if (!IS_BROWSER) {
	protocols.mqtt = require('./tcp').default
	protocols.tcp = require('./tcp').default
	protocols.ssl = require('./tls').default
	protocols.tls = protocols.ssl
	protocols.mqtts = require('./tls').default
} else {
	protocols.wx = require('./wx').default
	protocols.wxs = require('./wx').default

	protocols.ali = require('./ali').default
	protocols.alis = require('./ali').default
}

protocols.ws = require('./ws').default
protocols.wss = require('./ws').default

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts: IClientOptions) {
	let matches: RegExpMatchArray | null
	if (opts.auth) {
		matches = opts.auth.match(/^(.+):(.+)$/)
		if (matches) {
			opts.username = matches[1]
			opts.password = matches[2]
		} else {
			opts.username = opts.auth
		}
	}
}

/**
 * connect - connect to an MQTT broker.
 */
function connect(brokerUrl: string): MqttClient
function connect(opts: IClientOptions): MqttClient
function connect(brokerUrl: string, opts?: IClientOptions): MqttClient
function connect(
	brokerUrl: string | IClientOptions,
	opts?: IClientOptions,
): MqttClient {
	debug('connecting to an MQTT broker...')
	if (typeof brokerUrl === 'object' && !opts) {
		opts = brokerUrl
		brokerUrl = ''
	}

	opts = opts || {}

	// try to parse the broker url
	if (brokerUrl && typeof brokerUrl === 'string') {
		// eslint-disable-next-line
		const parsedUrl = url.parse(brokerUrl, true)
		const parsedOptions: Partial<IClientOptions> = {}

		if (parsedUrl.port != null) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			parsedOptions.port = Number(parsedUrl.port)
		}

		parsedOptions.host = parsedUrl.hostname
		parsedOptions.query = parsedUrl.query as Record<string, string>
		parsedOptions.auth = parsedUrl.auth
		parsedOptions.protocol = parsedUrl.protocol as MqttProtocol
		parsedOptions.path = parsedUrl.path

		parsedOptions.protocol = parsedOptions.protocol?.replace(
			/:$/,
			'',
		) as MqttProtocol

		opts = { ...parsedOptions, ...opts }

		// when parsing an url expect the protocol to be set
		if (!opts.protocol) {
			throw new Error('Missing protocol')
		}
	}

	opts.unixSocket = opts.unixSocket || opts.protocol?.includes('+unix')

	if (opts.unixSocket) {
		opts.protocol = opts.protocol.replace('+unix', '') as MqttProtocol
	} else if (!opts.protocol?.startsWith('ws')) {
		// consider path only with ws protocol or unix socket
		// url.parse could return path (for example when url ends with a `/`)
		// that could break the connection. See https://github.com/mqttjs/MQTT.js/pull/1874
		delete opts.path
	}

	// merge in the auth options if supplied
	parseAuthOptions(opts)

	// support clientId passed in the query string of the url
	if (opts.query && typeof opts.query.clientId === 'string') {
		opts.clientId = opts.query.clientId
	}

	if (opts.cert && opts.key) {
		if (opts.protocol) {
			if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
				switch (opts.protocol) {
					case 'mqtt':
						opts.protocol = 'mqtts'
						break
					case 'ws':
						opts.protocol = 'wss'
						break
					case 'wx':
						opts.protocol = 'wxs'
						break
					case 'ali':
						opts.protocol = 'alis'
						break
					default:
						throw new Error(
							`Unknown protocol for secure connection: "${opts.protocol}"!`,
						)
				}
			}
		} else {
			// A cert and key was provided, however no protocol was specified, so we will throw an error.
			throw new Error('Missing secure protocol key')
		}
	}

	if (!protocols[opts.protocol]) {
		const isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1
		// returns the first available protocol based on available protocols (that depends on environment)
		// if no protocol is specified this will return mqtt on node and ws on browser
		// if secure it will return mqtts on node and wss on browser
		opts.protocol = [
			'mqtt',
			'mqtts',
			'ws',
			'wss',
			'wx',
			'wxs',
			'ali',
			'alis',
		].filter((key, index) => {
			if (isSecure && index % 2 === 0) {
				// Skip insecure protocols when requesting a secure one.
				return false
			}
			return typeof protocols[key] === 'function'
		})[0] as MqttProtocol
	}

	if (opts.clean === false && !opts.clientId) {
		throw new Error('Missing clientId for unclean clients')
	}

	if (opts.protocol) {
		opts.defaultProtocol = opts.protocol
	}

	function wrapper(client: MqttClient) {
		if (opts.servers) {
			if (
				!client._reconnectCount ||
				client._reconnectCount === opts.servers.length
			) {
				client._reconnectCount = 0
			}

			opts.host = opts.servers[client._reconnectCount].host
			opts.port = opts.servers[client._reconnectCount].port
			opts.protocol = !opts.servers[client._reconnectCount].protocol
				? opts.defaultProtocol
				: opts.servers[client._reconnectCount].protocol
			opts.hostname = opts.host

			client._reconnectCount++
		}

		debug('calling streambuilder for', opts.protocol)
		return protocols[opts.protocol](client, opts)
	}
	const client = new MqttClient(wrapper, opts)
	client.on('error', () => {
		/* Automatically set up client error handling */
	})

	return client
}

function connectAsync(brokerUrl: string): Promise<MqttClient>
function connectAsync(opts: IClientOptions): Promise<MqttClient>
function connectAsync(
	brokerUrl: string,
	opts?: IClientOptions,
): Promise<MqttClient>
function connectAsync(
	brokerUrl: string | IClientOptions,
	opts?: IClientOptions,
	allowRetries = true,
): Promise<MqttClient> {
	return new Promise((resolve, reject) => {
		const client = connect(brokerUrl as string, opts)

		const promiseResolutionListeners: Partial<MqttClientEventCallbacks> = {
			connect: (connack) => {
				removePromiseResolutionListeners()
				resolve(client) // Resolve on connect
			},
			end: () => {
				removePromiseResolutionListeners()
				resolve(client) // Resolve on end
			},
			error: (err) => {
				removePromiseResolutionListeners()
				client.end()
				reject(err) // Reject on error
			},
		}

		// If retries are not allowed, reject on close
		if (allowRetries === false) {
			promiseResolutionListeners.close = () => {
				promiseResolutionListeners.error(
					new Error("Couldn't connect to server"),
				)
			}
		}

		// Remove listeners added to client by this promise
		function removePromiseResolutionListeners() {
			Object.keys(promiseResolutionListeners).forEach((eventName) => {
				client.off(
					eventName as keyof MqttClientEventCallbacks,
					promiseResolutionListeners[eventName],
				)
			})
		}

		// Add listeners to client
		Object.keys(promiseResolutionListeners).forEach((eventName) => {
			client.on(
				eventName as keyof MqttClientEventCallbacks,
				promiseResolutionListeners[eventName],
			)
		})
	})
}

export default connect
export { connectAsync }
