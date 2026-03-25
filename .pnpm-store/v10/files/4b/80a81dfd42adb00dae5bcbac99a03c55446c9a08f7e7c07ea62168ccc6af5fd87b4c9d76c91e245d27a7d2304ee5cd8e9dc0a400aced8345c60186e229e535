'use strict'

const { readFileSync, writeFileSync } = require('node:fs')
const { transcode } = require('node:buffer')

const buffer = transcode(readFileSync('./undici-fetch.js'), 'utf8', 'latin1')

writeFileSync('./undici-fetch.js', buffer.toString('latin1'))
