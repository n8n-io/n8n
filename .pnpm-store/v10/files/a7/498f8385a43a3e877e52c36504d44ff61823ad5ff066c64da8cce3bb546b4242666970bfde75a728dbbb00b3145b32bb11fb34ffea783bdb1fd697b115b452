const fs = require('node:fs')
const path = require('node:path')
const { version } = require('../package.json')

const metaContent = `'use strict'

module.exports = { version: '${version}' }
`

fs.writeFileSync(path.resolve('./lib/meta.js'), metaContent, { encoding: 'utf-8' })
