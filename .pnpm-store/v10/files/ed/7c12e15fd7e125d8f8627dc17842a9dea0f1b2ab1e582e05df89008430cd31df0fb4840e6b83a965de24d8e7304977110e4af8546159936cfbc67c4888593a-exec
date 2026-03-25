#!/usr/bin/env node

/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */
import path from 'path'
import Commist from 'commist'
import help from 'help-me'
import publish from './pub'
import subscribe from './sub'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require('../../package.json').version

const helpMe = help({
	dir: path.join(__dirname, '../../', 'help'),
	ext: '.txt',
})

const commist = Commist()

commist.register('publish', publish)
commist.register('pub', publish)

commist.register('subscribe', subscribe)
commist.register('sub', subscribe)

commist.register('version', () => {
	console.log('MQTT.js version:', version)
})
commist.register('help', helpMe.toStdout)

if (commist.parse(process.argv.slice(2)) !== null) {
	console.log('No such command:', process.argv[2], '\n')
	helpMe.toStdout()
}
