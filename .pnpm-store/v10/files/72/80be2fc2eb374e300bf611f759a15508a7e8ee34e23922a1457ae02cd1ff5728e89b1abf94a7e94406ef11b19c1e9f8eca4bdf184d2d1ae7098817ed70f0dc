const path = require('path')
const os = require('os')
const exec = require('child_process').exec
const localDevPort = process.env.SCARF_LOCAL_PORT
const https = localDevPort ? require('http') : require('https')
const fs = require('fs')
const fsAsync = fs.promises
const util = require('util')

const scarfHost = localDevPort ? 'localhost' : 'scarf.sh'
const scarfLibName = '@scarf/scarf'
const privatePackageRewrite = '@private/private'
const privateVersionRewrite = '0'

const rootPath = process.env.INIT_CWD

// Pulled into a function for test mocking
function tmpFileName () {
  // throttle per user
  const username = os.userInfo().username
  return path.join(os.tmpdir(), `scarf-js-history-${username}.log`)
}

// Pulled into a function for test mocking
function dirName () {
  return __dirname
}

function npmExecPath () {
  return process.env.npm_execpath
}

const userMessageThrottleTime = 1000 * 60 // 1 minute

const execTimeout = 3000

// In general, these keys should never change to remain backwards compatible
// with previous versions of Scarf. If we need to update them, we'll need to
// make sure we can read the previous values as well
const optedInLogRateLimitKey = 'optedInLastLog'
const optedOutLogRateLimitKey = 'optedOutLastLog'

const makeDefaultSettings = () => {
  return {
    defaultOptIn: true
  }
}

function logIfVerbose (toLog, stream) {
  if (process.env.SCARF_VERBOSE === 'true') {
    (stream || console.log)(toLog)
  }
}

// SCARF_NO_ANALYTICS was the original variable, we'll get rid of it eventually
const userHasOptedOut = (rootPackage) => {
  return (rootPackage && rootPackage.scarfSettings && rootPackage.scarfSettings.enabled === false) ||
    (process.env.SCARF_ANALYTICS === 'false' || process.env.SCARF_NO_ANALYTICS === 'true' || process.env.DO_NOT_TRACK === '1')
}

const userHasOptedIn = (rootPackage) => {
  return (rootPackage && rootPackage.scarfSettings && rootPackage.scarfSettings.enabled) || process.env.SCARF_ANALYTICS === 'true'
}

// Packages that depend on Scarf can configure whether to should fire when
// `npm install` is being run directly from within the package, rather than from a
// dependent package
function allowTopLevel (rootPackage) {
  return rootPackage && rootPackage.scarfSettings && rootPackage.scarfSettings.allowTopLevel
}

function skipTraversal (rootPackage) {
  return rootPackage && rootPackage.scarfSettings && rootPackage.scarfSettings.skipTraversal
}

function parentIsRoot (dependencyToReport) {
  const parent = dependencyToReport.parent
  const rootPackage = dependencyToReport.rootPackage

  return parent && rootPackage && parent.name === rootPackage.name && parent.version === rootPackage.version
}

function isTopLevel (dependencyToReport) {
  return parentIsRoot(dependencyToReport) && !process.env.npm_config_global
}

function isGlobal (dependencyToReport) {
  return parentIsRoot(dependencyToReport) && !!process.env.npm_config_global
}

function hashWithDefault (toHash, defaultReturn) {
  let crypto
  try {
    crypto = require('crypto')
  } catch (err) {
    logIfVerbose('node crypto module unavailable')
  }

  if (crypto && toHash) {
    return crypto.createHash('sha256').update(toHash, 'utf-8').digest('hex')
  } else {
    return defaultReturn
  }
}

// We don't send any paths, hash package names and versions
function redactSensitivePackageInfo (dependencyInfo) {
  if (dependencyInfo.grandparent && dependencyInfo.grandparent.name) {
    dependencyInfo.grandparent.nameHash = hashWithDefault(dependencyInfo.grandparent.name, privatePackageRewrite)
    dependencyInfo.grandparent.versionHash = hashWithDefault(dependencyInfo.grandparent.version, privateVersionRewrite)
  }

  if (dependencyInfo.rootPackage && dependencyInfo.rootPackage.name) {
    dependencyInfo.rootPackage.nameHash = hashWithDefault(dependencyInfo.rootPackage.name, privatePackageRewrite)
    dependencyInfo.rootPackage.versionHash = hashWithDefault(dependencyInfo.rootPackage.version, privateVersionRewrite)
  }

  delete (dependencyInfo.rootPackage.packageJsonPath)
  delete (dependencyInfo.rootPackage.path)
  delete (dependencyInfo.rootPackage.name)
  delete (dependencyInfo.rootPackage.version)
  delete (dependencyInfo.parent.path)
  delete (dependencyInfo.scarf.path)
  if (dependencyInfo.grandparent) {
    delete (dependencyInfo.grandparent.path)
    delete (dependencyInfo.grandparent.name)
    delete (dependencyInfo.grandparent.version)
  }
  return dependencyInfo
}

/*
  Scarf-js is automatically disabled when being run inside of a yarn install.
  The `npm_execpath` environment variable tells us which package manager is
  running our install
 */
function isYarn () {
  const execPath = module.exports.npmExecPath() || ''
  return ['yarn', 'yarn.js', 'yarnpkg', 'yarn.cmd', 'yarnpkg.cmd']
    .some(packageManBinName => execPath.endsWith(packageManBinName))
}

function processDependencyTreeOutput (resolve, reject) {
  return function (error, stdout, stderr) {
    if (error && !stdout) {
      return reject(new Error(`Scarf received an error from npm -ls: ${error} | ${stderr}`))
    }

    try {
      const output = JSON.parse(stdout)

      const depsToScarf = findScarfInFullDependencyTree(output).filter(depChain => depChain.length >= 2)
      if (!depsToScarf.length) {
        return reject(new Error('No Scarf parent package found'))
      }
      const rootPackageDetails = rootPackageDepInfo(output)

      const dependencyInfo = depsToScarf.map(depChain => {
        return {
          scarf: depChain[depChain.length - 1],
          parent: depChain[depChain.length - 2],
          grandparent: depChain[depChain.length - 3],
          rootPackage: rootPackageDetails,
          anyInChainDisabled: depChain.some(dep => {
            return (dep.scarfSettings || {}).enabled === false
          })
        }
      })

      dependencyInfo.forEach(d => {
        d.parent.scarfSettings = Object.assign(makeDefaultSettings(), d.parent.scarfSettings || {})
      })

      // Here, we find the dependency chain that corresponds to the scarf package we're currently in
      const dependencyToReport = dependencyInfo.find(dep => (dep.scarf.path === module.exports.dirName())) || dependencyInfo[0]
      if (!dependencyToReport) {
        return reject(new Error(`Couldn't find dependency info for path ${module.exports.dirName()}`))
      }

      // If any intermediate dependency in the chain of deps that leads to scarf
      // has disabled Scarf, we must respect that setting unless the user overrides it.
      if (dependencyToReport.anyInChainDisabled && !userHasOptedIn(dependencyToReport.rootPackage)) {
        return reject(new Error('Scarf has been disabled via a package.json in the dependency chain.'))
      }

      if (isTopLevel(dependencyToReport) && !isGlobal(dependencyToReport) && !allowTopLevel(rootPackageDetails)) {
        return reject(new Error('The package depending on Scarf is the root package being installed, but Scarf is not configured to run in this case. To enable it, set `scarfSettings.allowTopLevel = true` in your package.json'))
      }

      return resolve(dependencyToReport)
    } catch (err) {
      logIfVerbose(err, console.error)
      return reject(err)
    }
  }
}

function processGitRevParseOutput (resolve, reject) {
  return function (error, stdout, stderr) {
    if (error && !stdout) {
      return reject(new Error(`Scarf received an error from git rev-parse: ${error} | ${stderr}`))
    }

    const output = String(stdout).trim()

    if (output.length > 0) {
      return resolve(output)
    } else {
      return reject(new Error('Scarf did not receive usable output from git rev-parse'))
    }
  }
}

// packageJSONOverride: a test convenience to set a packageJSON explicitly.
// Leave empty to use the actual root package.json.
async function getDependencyInfo (packageJSONOverride) {
  try {
    const rootPackageJSON = require(packageJSONOverride || path.join(rootPath, 'package.json'))
    const scarfPackageJSON = require(path.join(dirName(), 'package.json'))

    if (skipTraversal(rootPackageJSON)) {
      logIfVerbose('skipping dependency tree traversal')
      const rootInfoToReport = {
        name: rootPackageJSON.name,
        version: rootPackageJSON.version,
        scarfSettings: { ...makeDefaultSettings(), ...rootPackageJSON.scarfSettings }
      }
      const shallowDepInfo = {
        scarf: { name: '@scarf/scarf', version: scarfPackageJSON.version },
        parent: { ...rootInfoToReport },
        rootPackage: { ...rootInfoToReport },
        anyInChainDisabled: false,
        skippedTraversal: true
      }
      logIfVerbose(util.inspect(shallowDepInfo))
      return shallowDepInfo
    }
  } catch (err) {
    logIfVerbose(err, console.error)
  }

  return new Promise((resolve, reject) => {
    exec(`cd ${rootPath} && npm ls @scarf/scarf --json --long`, { timeout: execTimeout, maxBuffer: 1024 * 1024 * 1024 }, processDependencyTreeOutput(resolve, reject))
  })
}

async function getGitShaFromRootPath () {
  const promise = new Promise((resolve, reject) => {
    exec(`cd ${rootPath} && git rev-parse HEAD`, { timeout: execTimeout, maxBuffer: 1024 * 1024 * 1024 }, processGitRevParseOutput(resolve, reject))
  })
  try {
    return await promise
  } catch (e) {
    logIfVerbose(e)
    return undefined
  }
}

async function reportPostInstall () {
  const scarfApiToken = process.env.SCARF_API_TOKEN

  const dependencyInfo = await module.exports.getDependencyInfo()
  logIfVerbose(dependencyInfo)
  if (!dependencyInfo.parent || !dependencyInfo.parent.name) {
    return Promise.reject(new Error('No parent found, nothing to report'))
  }

  if (parentIsRoot(dependencyInfo) && allowTopLevel(dependencyInfo.rootPackage)) {
    const gitSha = await getGitShaFromRootPath()
    logIfVerbose(`Injecting sha to parent: ${gitSha}`)
    dependencyInfo.parent.gitSha = gitSha
  }

  const rootPackage = dependencyInfo.rootPackage

  if (!userHasOptedIn(rootPackage) && isYarn()) {
    return Promise.reject(new Error('Package manager is yarn. scarf-js is unable to inform user of analytics. Aborting.'))
  }

  await new Promise((resolve, reject) => {
    if (dependencyInfo.parent.scarfSettings.defaultOptIn) {
      if (userHasOptedOut(rootPackage)) {
        return reject(new Error('User has opted out'))
      }

      if (!userHasOptedIn(rootPackage)) {
        rateLimitedUserLog(optedInLogRateLimitKey, `
    The dependency '${dependencyInfo.parent.name}' is tracking installation
    statistics using scarf-js (https://scarf.sh), which helps open-source developers
    fund and maintain their projects. Scarf securely logs basic installation
    details when this package is installed. The Scarf npm library is open source
    and permissively licensed at https://github.com/scarf-sh/scarf-js. For more
    details about your project's dependencies, try running 'npm ls'. To opt out of
    analytics, set the environment variable 'SCARF_ANALYTICS=false'.
  `)
      }
      resolve(dependencyInfo)
    } else {
      if (!userHasOptedIn(rootPackage)) {
        if (!userHasOptedOut(rootPackage)) {
          // We'll only print the 'please opt in' text if the user hasn't
          // already opted out, and our logging rate limit hasn't been reached
          if (hasHitRateLimit(optedOutLogRateLimitKey, getRateLimitedLogHistory())) {
            return reject(new Error('Analytics are opt-out by default, but rate limit already hit for prompting opt-in.'))
          }
          rateLimitedUserLog(optedOutLogRateLimitKey, `
    The dependency '${dependencyInfo.parent.name}' would like to track
    installation statistics using scarf-js (https://scarf.sh), which helps
    open-source developers fund and maintain their projects. Reporting is disabled
    by default for this package. When enabled, Scarf securely logs basic
    installation details when this package is installed. The Scarf npm library is
    open source and permissively licensed at https://github.com/scarf-sh/scarf-js.
    For more details about your project's dependencies, try running 'npm ls'.
  `
          )
          const stdin = process.stdin
          stdin.setEncoding('utf-8')

          process.stdout.write(`Would you like to support ${dependencyInfo.parent.name} by sending analytics for this install? (y/N): `)

          const timeout1 = setTimeout(() => {
            console.log('')
            console.log('No opt in received, skipping analytics')
            reject(new Error('Timeout waiting for user opt in'))
          }, 7000)

          stdin.on('data', async function (data) {
            clearTimeout(timeout1)
            const enabled = data.trim().toLowerCase() === 'y'

            const afterUserInput = (enabled, saved) => {
              if (enabled) {
                console.log('Thanks for enabling analytics!')
              }

              if (!saved) {
                console.log('To prevent this message in the future, you can also set the `SCARF_ANALYTICS=true|false` environment variable')
              }

              if (enabled) {
                return resolve(dependencyInfo)
              } else {
                return reject(new Error('Not enabled via cli'))
              }
            }

            process.stdout.write('Save this preference to your project\'s package.json file? (y/N): ')

            setTimeout(() => {
              console.log('')
              return afterUserInput(enabled, false)
            }, 15000)

            stdin.removeAllListeners('data')
            stdin.on('data', async function (data) {
              try {
                const savePreference = data.trim().toLowerCase() === 'y'
                if (savePreference) {
                  await savePreferencesToRootPackage(dependencyInfo.rootPackage.packageJsonPath, enabled)
                }
                return afterUserInput(enabled, savePreference)
              } catch (err) {
                logIfVerbose(err, console.error)
                return reject(err)
              }
            })
          })
        }
      } else {
        resolve(dependencyInfo)
      }
    }
  })

  redactSensitivePackageInfo(dependencyInfo)

  const infoPayload = {
    libraryType: 'npm',
    rawPlatform: os.platform(),
    rawArch: os.arch(),
    nodeVersion: process.versions.node,
    dependencyInfo: dependencyInfo
  }

  const data = JSON.stringify(infoPayload)
  logIfVerbose(`Scarf payload: ${data}`)

  const reqOptions = {
    host: scarfHost,
    port: localDevPort,
    method: 'POST',
    path: '/package-event/install',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: execTimeout
  }

  if (scarfApiToken) {
    const authToken = Buffer.from(`n/a:${scarfApiToken}`).toString('base64')
    reqOptions.headers.Authorization = `Basic ${authToken}`
  }

  await new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      logIfVerbose(`Response status: ${res.statusCode}`)
      resolve()
    })

    req.on('error', error => {
      logIfVerbose(error, console.error)
      reject(error)
    })

    req.on('timeout', error => {
      logIfVerbose(error, console.error)
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

// Find all paths to Scarf from the json output of npm ls @scarf/scarf --json in
// the root package being installed by the user
//
// [{
//   scarf: {name: `@scarf/scarf`, version: '0.0.1'},
//   parent: { name: 'scarfed-library', version: '1.0.0', scarfSettings: { defaultOptIn: true } },
//   grandparent: { name: 'scarfed-lib-consumer', version: '1.0.0' }
// }]
function findScarfInSubDepTree (pathToDep, deps) {
  const depNames = Object.keys(deps || {})

  if (!depNames) {
    return []
  }

  const scarfFound = depNames.find(depName => depName === scarfLibName)
  const output = []
  if (scarfFound) {
    output.push(pathToDep.concat([{ name: scarfLibName, version: deps[scarfLibName].version, path: deps[scarfLibName].path }]))
  }
  for (let i = 0; i < depNames.length; i++) {
    const depName = depNames[i]
    const newPathToDep = pathToDep.concat([
      {
        name: depName,
        version: deps[depName].version,
        scarfSettings: deps[depName].scarfSettings,
        path: deps[depName].path
      }
    ])
    const results = findScarfInSubDepTree(newPathToDep, deps[depName].dependencies)
    if (results) {
      for (let j = 0; j < results.length; j++) {
        output.push(results[j])
      }
    }
  }

  return output
}

function findScarfInFullDependencyTree (tree) {
  if (tree.name === scarfLibName) {
    return [[{ name: scarfLibName, version: tree.version }]]
  } else {
    return findScarfInSubDepTree([packageDetailsFromDepInfo(tree)], tree.dependencies)
  }
}

function packageDetailsFromDepInfo (tree) {
  return {
    name: tree.name,
    version: tree.version,
    scarfSettings: tree.scarfSettings,
    path: tree.path
  }
}

function rootPackageDepInfo (packageInfo) {
  if (process.env.npm_config_global) {
    packageInfo = Object.values(packageInfo.dependencies)[0]
  }
  const info = packageDetailsFromDepInfo(packageInfo)
  info.packageJsonPath = `${packageInfo.path}/package.json`
  return info
}

async function savePreferencesToRootPackage (path, optIn) {
  const packageJsonString = await fsAsync.readFile(path)
  const parsed = JSON.parse(packageJsonString)
  parsed.scarfSettings = {
    enabled: optIn
  }
  await fsAsync.writeFile(path, JSON.stringify(parsed, null, 2))
}

/*
  If Scarf-js appears in many different spots in a package's dependency tree, we
  want to avoid spamming the user with the same message informing them of
  Scarf's analytics. Rate limited logs will record timestamps of logging in a
  temp file. Before logging something to the user, we will verify we're not over
  the rate limit.
*/
function rateLimitedUserLog (rateLimitKey, toLog) {
  const history = getRateLimitedLogHistory()
  if (!hasHitRateLimit(rateLimitKey, history)) {
    writeCurrentTimeToLogHistory(rateLimitKey, history)
    console.log(toLog)
  } else {
    logIfVerbose(`[SUPPRESSED USER MESSAGE, RATE LIMIT HIT] ${toLog}`)
  }
}

function getRateLimitedLogHistory () {
  let history
  try {
    history = JSON.parse(fs.readFileSync(module.exports.tmpFileName()))
  } catch (e) {
    logIfVerbose(e)
  }
  return history || {}
}

//  Current rate limit: 1/minute
function hasHitRateLimit (rateLimitKey, history) {
  if (!history || !history[rateLimitKey]) {
    return false
  }

  const lastLog = history[rateLimitKey]
  return (new Date().getTime() - lastLog) < userMessageThrottleTime
}

function writeCurrentTimeToLogHistory (rateLimitKey, history) {
  history[rateLimitKey] = new Date().getTime()
  fs.writeFileSync(module.exports.tmpFileName(), JSON.stringify(history))
}

module.exports = {
  redactSensitivePackageInfo,
  hasHitRateLimit,
  getRateLimitedLogHistory,
  rateLimitedUserLog,
  tmpFileName,
  dirName,
  processDependencyTreeOutput,
  processGitRevParseOutput,
  npmExecPath,
  getDependencyInfo,
  getGitShaFromRootPath,
  reportPostInstall,
  hashWithDefault,
  findScarfInFullDependencyTree
}

if (require.main === module) {
  try {
    reportPostInstall().catch(e => {
      // This is an optional, best effort attempt. If there are any errors in
      // Scarf, we must not interfere with whatever the user is doing
      logIfVerbose(`\n\n${e}`, console.error)
    }).finally(() => {
      process.exit(0)
    })
  } catch (e) {
    logIfVerbose(`\n\nTop level error: ${e}`, console.error)
    process.exit(0)
  }
}
