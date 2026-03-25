'use strict'

const processOnSpawn = require('process-on-spawn')

const envToCopy = {}

processOnSpawn.addListener(({ env }) => {
  Object.assign(env, envToCopy)
})

const copyAtLoad = [
  'NYC_CONFIG',
  'NYC_CWD',
  'NYC_PROCESS_ID',
  'BABEL_DISABLE_CACHE',
  'NYC_PROCESS_ID'
]

for (const env of copyAtLoad) {
  if (env in process.env) {
    envToCopy[env] = process.env[env]
  }
}

module.exports = function updateVariable (envName) {
  envToCopy[envName] = process.env[envName]
}
