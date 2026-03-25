#!/usr/bin/env node

import { Writable } from 'readable-stream'
import path from 'path'
import fs from 'fs'
import concat from 'concat-stream'
import help from 'help-me'

import minimist, { ParsedArgs } from 'minimist'
import split2 from 'split2'
import { connect } from '../mqtt'
import { IClientOptions, IClientPublishOptions } from 'src/lib/client'
import { pipeline } from 'stream'

const helpMe = help({
	dir: path.join(__dirname, '../../', 'help'),
})

function send(args: ParsedArgs) {
	const client = connect(args as IClientOptions)
	client.on('connect', () => {
		client.publish(
			args.topic,
			args.message,
			args as IClientPublishOptions,
			(err) => {
				if (err) {
					console.warn(err)
				}
				client.end()
			},
		)
	})
	client.on('error', (err) => {
		console.warn(err)
		client.end()
	})
}

function multisend(args: ParsedArgs) {
	const client = connect(args as IClientOptions)
	const sender = new Writable({
		objectMode: true,
	})
	sender._write = (line, enc, cb) => {
		client.publish(
			args.topic,
			line.trim(),
			args as IClientPublishOptions,
			cb,
		)
	}

	client.on('connect', () => {
		pipeline(process.stdin, split2(), sender, (err) => {
			client.end()
			if (err) {
				throw err
			}
		})
	})
}

export default function start(args: string[]) {
	const parsedArgs = minimist(args, {
		string: [
			'hostname',
			'username',
			'password',
			'key',
			'cert',
			'ca',
			'message',
			'clientId',
			'i',
			'id',
		],
		boolean: ['stdin', 'retain', 'help', 'insecure', 'multiline'],
		alias: {
			port: 'p',
			hostname: ['h', 'host'],
			topic: 't',
			message: 'm',
			qos: 'q',
			clientId: ['i', 'id'],
			retain: 'r',
			username: 'u',
			password: 'P',
			stdin: 's',
			multiline: 'M',
			protocol: ['C', 'l'],
			help: 'H',
			ca: 'cafile',
		},
		default: {
			host: 'localhost',
			qos: 0,
			retain: false,
			topic: '',
			message: '',
		},
	})

	if (parsedArgs.help) {
		return helpMe.toStdout('publish')
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

	if (parsedArgs.insecure) {
		parsedArgs.rejectUnauthorized = false
	}

	parsedArgs.topic = (parsedArgs.topic || parsedArgs._.shift())?.toString()
	parsedArgs.message = (
		parsedArgs.message || parsedArgs._.shift()
	)?.toString()

	if (!parsedArgs.topic) {
		console.error('missing topic\n')
		return helpMe.toStdout('publish')
	}

	if (parsedArgs.stdin) {
		if (parsedArgs.multiline) {
			multisend(parsedArgs)
		} else {
			process.stdin.pipe(
				concat((data) => {
					parsedArgs.message = data
					send(parsedArgs)
				}),
			)
		}
	} else {
		send(parsedArgs)
	}
}

if (require.main === module) {
	start(process.argv.slice(2))
}
