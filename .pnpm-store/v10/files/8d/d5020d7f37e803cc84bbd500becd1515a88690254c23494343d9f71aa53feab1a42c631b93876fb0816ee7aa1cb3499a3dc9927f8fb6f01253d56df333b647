'use strict'

const vendors = require('./vendors.json')

const env = process.env

// Used for testing only
Object.defineProperty(exports, '_vendors', {
  value: vendors.map(function (v) {
    return v.constant
  })
})

exports.name = null
exports.isPR = null

vendors.forEach(function (vendor) {
  const envs = Array.isArray(vendor.env) ? vendor.env : [vendor.env]
  const isCI = envs.every(function (obj) {
    return checkEnv(obj)
  })

  exports[vendor.constant] = isCI

  if (!isCI) {
    return
  }

  exports.name = vendor.name

  switch (typeof vendor.pr) {
    case 'string':
      // "pr": "CIRRUS_PR"
      exports.isPR = !!env[vendor.pr]
      break
    case 'object':
      if ('env' in vendor.pr) {
        // "pr": { "env": "BUILDKITE_PULL_REQUEST", "ne": "false" }
        exports.isPR = vendor.pr.env in env && env[vendor.pr.env] !== vendor.pr.ne
      } else if ('any' in vendor.pr) {
        // "pr": { "any": ["ghprbPullId", "CHANGE_ID"] }
        exports.isPR = vendor.pr.any.some(function (key) {
          return !!env[key]
        })
      } else {
        // "pr": { "DRONE_BUILD_EVENT": "pull_request" }
        exports.isPR = checkEnv(vendor.pr)
      }
      break
    default:
      // PR detection not supported for this vendor
      exports.isPR = null
  }
})

exports.isCI = !!(
  env.CI !== 'false' && // Bypass all checks if CI env is explicitly set to 'false'
  (env.BUILD_ID || // Jenkins, Cloudbees
  env.BUILD_NUMBER || // Jenkins, TeamCity
  env.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari
  env.CI_APP_ID || // Appflow
  env.CI_BUILD_ID || // Appflow
  env.CI_BUILD_NUMBER || // Appflow
  env.CI_NAME || // Codeship and others
  env.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
  env.RUN_ID || // TaskCluster, dsari
  exports.name ||
  false)
)

function checkEnv (obj) {
  // "env": "CIRRUS"
  if (typeof obj === 'string') return !!env[obj]

  // "env": { "env": "NODE", "includes": "/app/.heroku/node/bin/node" }
  if ('env' in obj) {
    // Currently there are no other types, uncomment when there are
    // if ('includes' in obj) {
    return env[obj.env] && env[obj.env].includes(obj.includes)
    // }
  }
  if ('any' in obj) {
    return obj.any.some(function (k) {
      return !!env[k]
    })
  }
  return Object.keys(obj).every(function (k) {
    return env[k] === obj[k]
  })
}
