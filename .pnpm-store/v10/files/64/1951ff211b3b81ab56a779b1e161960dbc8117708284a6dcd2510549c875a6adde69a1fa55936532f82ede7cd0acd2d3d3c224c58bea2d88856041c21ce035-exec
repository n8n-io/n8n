#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import minimist from 'minimist'
import help from 'help-me'
import { connect } from '../mqtt'
import { IClientOptions } from 'src/lib/client'

const helpMe = help({
	dir: path.join(__dirname, '../../', 'help'),
})

export default function start(args: string[]) {
	const parsedArgs = minimist(args, {
		string: [
			'hostname',
			'username',
			'password',
			'key',
			'cert',
			'ca',
			'clientId',
			'i',
			'id',
		],
		boolean: ['stdin', 'help', 'clean', 'insecure'],
		alias: {
			port: 'p',
			hostname: ['h', 'host'],
			topic: 't',
			qos: 'q',
			clean: 'c',
			keepalive: 'k',
			clientId: ['i', 'id'],
			username: 'u',
			password: 'P',
			protocol: ['C', 'l'],
			verbose: 'v',
			help: '-H',
			ca: 'cafile',
		},
		default: {
			host: 'localhost',
			qos: 0,
			retain: false,
			clean: true,
			keepAlive: 30, // 30 sec
		},
	})

	if (parsedArgs.help) {
		return helpMe.toStdout('subscribe')
	}

	parsedArgs.topic = parsedArgs.topic || parsedArgs._.shift()

	if (!parsedArgs.topic) {
		console.error('missing topic\n')
		return helpMe.toStdout('subscribe')
	}

	if (parsedArgs.key) {
		parsedArgs.key = fs.readFileSync(parsedArgs.key)
	}

	if (parsedArgs.cert) {
		parsedArgs.cert = fs.readFileSync(parsedArgs.cert)
	}

	if (parsedArgs.ca) {
		parsedArgs.ca = fs.readFileSync(parsedArgs.ca)
	}

	if (parsedArgs.key && parsedArgs.cert && !parsedArgs.protocol) {
		parsedArgs.protocol = 'mqtts'
	}

	if (parsedArgs.insecure) {
		parsedArgs.rejectUnauthorized = false
	}

	if (parsedArgs.port) {
		if (typeof parsedArgs.port !== 'number') {
			console.warn(
				"# Port: number expected, '%s' was given.",
				typeof parsedArgs.port,
			)
			return
		}
	}

	if (parsedArgs['will-topic']) {
		parsedArgs.will = {}
		parsedArgs.will.topic = parsedArgs['will-topic']
		parsedArgs.will.payload = parsedArgs['will-message']
		parsedArgs.will.qos = parsedArgs['will-qos']
		parsedArgs.will.retain = parsedArgs['will-retain']
	}

	parsedArgs.keepAlive = parsedArgs['keep-alive']

	const client = connect(parsedArgs as IClientOptions)

	client.on('connect', () => {
		client.subscribe(
			parsedArgs.topic,
			{ qos: parsedArgs.qos },
			(err, result) => {
				if (err) {
					console.error(err)
					process.exit(1)
				}

				result.forEach((sub) => {
					if (sub.qos > 2) {
						console.error(
							'subscription negated to',
							sub.topic,
							'with code',
							sub.qos,
						)
						process.exit(1)
					}
				})
			},
		)
	})

	client.on('message', (topic, payload) => {
		if (parsedArgs.verbose) {
			console.log(topic, payload.toString())
		} else {
			console.log(payload.toString())
		}
	})

	client.on('error', (err) => {
		console.warn(err)
		client.end()
	})
}

if (require.main === module) {
	start(process.argv.slice(2))
}
