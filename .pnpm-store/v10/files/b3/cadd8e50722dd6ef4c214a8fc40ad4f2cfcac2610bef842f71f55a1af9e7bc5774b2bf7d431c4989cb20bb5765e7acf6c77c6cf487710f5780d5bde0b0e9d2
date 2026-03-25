'use strict'

const NYC = require('../index.js')

const config = JSON.parse(
  process.env.NYC_CONFIG ||
  /* istanbul ignore next */ '{}'
)

config.isChildProcess = true

config._processInfo = {
  pid: process.pid,
  ppid: process.ppid,
  parent: process.env.NYC_PROCESS_ID || null
}

if (process.env.NYC_PROCESSINFO_EXTERNAL_ID) {
  config._processInfo.externalId = process.env.NYC_PROCESSINFO_EXTERNAL_ID
  delete process.env.NYC_PROCESSINFO_EXTERNAL_ID
}

if (process.env.NYC_CONFIG_OVERRIDE) {
  Object.assign(config, JSON.parse(process.env.NYC_CONFIG_OVERRIDE))
  process.env.NYC_CONFIG = JSON.stringify(config)
}

;(new NYC(config)).wrap()
